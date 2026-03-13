import { ReloadOutlined } from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import {
  getStatsAnalytics,
  type DailyStatsPoint,
  type StatsAnalyticsResponse,
} from '@app/lib/api/stats'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Segmented,
  Skeleton,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

dayjs.extend(isoWeek)

const { Title } = Typography

const DAY_IN_MS = 24 * 60 * 60 * 1000
const YEAR_OPTIONS_DEPTH = 3
const CHART_STROKE = '#43c7b1'
const CHART_FILL = '#8fe4d7'
const SHORT_MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mars',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aout',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
]

type StatsGranularity = 'week' | 'month' | 'year'
type MetricKey = 'messages' | 'conversations'

interface Range {
  startDate: string
  endDate: string
}

interface ChartPoint {
  bucket: string
  value: number
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function parseUtcDay(day: string) {
  return new Date(`${day}T00:00:00.000Z`)
}

function formatUtcDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(day: string, amount: number) {
  return formatUtcDay(new Date(parseUtcDay(day).getTime() + amount * DAY_IN_MS))
}

function clampDay(day: string, maxDay: string) {
  return day > maxDay ? maxDay : day
}

function diffUtcDays(startDate: string, endDate: string) {
  return Math.round(
    (parseUtcDay(endDate).getTime() - parseUtcDay(startDate).getTime()) /
      DAY_IN_MS
  )
}

function formatAxisNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 10000 ? 'compact' : 'standard',
  }).format(value)
}

function formatHumanDate(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    ...options,
  }).format(parseUtcDay(day))
}

function getShortMonthLabel(date: Dayjs) {
  return SHORT_MONTH_LABELS[date.month()]
}

function formatPickerDayLabel(date: Dayjs) {
  return `${date.date()} ${getShortMonthLabel(date)} ${date.year()}`
}

function buildSelectedRange(
  granularity: StatsGranularity,
  selectedDate: Dayjs,
  maxDay: string
): Range {
  if (granularity === 'week') {
    const startDate = selectedDate.startOf('isoWeek').format('YYYY-MM-DD')
    const endDate = clampDay(
      selectedDate.endOf('isoWeek').format('YYYY-MM-DD'),
      maxDay
    )

    return { startDate, endDate }
  }

  if (granularity === 'month') {
    const startDate = selectedDate.startOf('month').format('YYYY-MM-DD')
    const endDate = clampDay(
      selectedDate.endOf('month').format('YYYY-MM-DD'),
      maxDay
    )

    return { startDate, endDate }
  }

  const startDate = selectedDate.startOf('year').format('YYYY-MM-DD')
  const endDate = clampDay(
    selectedDate.endOf('year').format('YYYY-MM-DD'),
    maxDay
  )

  return { startDate, endDate }
}

function filterPoints(points: DailyStatsPoint[], range: Range) {
  return points.filter(
    point => point.day >= range.startDate && point.day <= range.endDate
  )
}

function sumMetric(points: DailyStatsPoint[], metric: MetricKey) {
  return points.reduce((total, point) => total + point[metric], 0)
}

function buildPreviousRange(range: Range): Range {
  const periodLength = diffUtcDays(range.startDate, range.endDate) + 1

  return {
    startDate: addUtcDays(range.startDate, -periodLength),
    endDate: addUtcDays(range.startDate, -1),
  }
}

function formatDelta(currentValue: number, previousValue: number) {
  if (previousValue <= 0) {
    return null
  }

  const delta = ((currentValue - previousValue) / previousValue) * 100
  const rounded = Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1)

  return {
    label: `${delta > 0 ? '+' : ''}${rounded}%`,
    positive: delta >= 0,
  }
}

function buildChartData(
  points: DailyStatsPoint[],
  range: Range,
  metric: MetricKey,
  granularity: StatsGranularity
): ChartPoint[] {
  const filteredPoints = filterPoints(points, range)

  if (granularity === 'year') {
    const grouped = new Map<string, number>()

    for (const point of filteredPoints) {
      const monthBucket = `${point.day.slice(0, 7)}-01`
      grouped.set(monthBucket, (grouped.get(monthBucket) ?? 0) + point[metric])
    }

    return Array.from(grouped.entries()).map(([bucket, value]) => ({
      bucket,
      value,
    }))
  }

  return filteredPoints.map(point => ({
    bucket: point.day,
    value: point[metric],
  }))
}

function formatTick(bucket: string, granularity: StatsGranularity) {
  if (granularity === 'week') {
    return formatHumanDate(bucket, { weekday: 'short' })
  }

  if (granularity === 'month') {
    return formatHumanDate(bucket, { day: 'numeric' })
  }

  return formatHumanDate(bucket, { month: 'short' })
}

function formatTooltipLabel(bucket: string, granularity: StatsGranularity) {
  if (granularity === 'year') {
    return formatHumanDate(bucket, {
      month: 'long',
      year: 'numeric',
    })
  }

  return formatHumanDate(bucket, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buildDisabledDate(
  granularity: StatsGranularity,
  minDay: string,
  maxDay: string
) {
  const minDate = dayjs(minDay)
  const maxDate = dayjs(maxDay)

  return (current: Dayjs) => {
    if (granularity === 'week') {
      const periodStart = current.startOf('isoWeek')
      const periodEnd = current.endOf('isoWeek')

      return (
        periodStart.isAfter(maxDate, 'day') ||
        periodEnd.isBefore(minDate, 'day')
      )
    }

    if (granularity === 'month') {
      const periodStart = current.startOf('month')
      const periodEnd = current.endOf('month')

      return (
        periodStart.isAfter(maxDate, 'day') ||
        periodEnd.isBefore(minDate, 'day')
      )
    }

    const periodStart = current.startOf('year')
    const periodEnd = current.endOf('year')

    return (
      periodStart.isAfter(maxDate, 'day') || periodEnd.isBefore(minDate, 'day')
    )
  }
}

function findFirstMetricDay(
  points: DailyStatsPoint[],
  metric: MetricKey,
  fallbackDay: string
) {
  return points.find(point => point[metric] > 0)?.day ?? fallbackDay
}

function formatPickerValue(
  value: Dayjs,
  granularity: StatsGranularity,
  maxDay: string
) {
  if (granularity === 'year') {
    return `Année ${value.year()}`
  }

  if (granularity === 'month') {
    return `${getShortMonthLabel(value)} ${value.year()}`
  }

  const startDate = value.startOf('isoWeek')
  const endDate = dayjs(
    clampDay(value.endOf('isoWeek').format('YYYY-MM-DD'), maxDay)
  )

  return `${formatPickerDayLabel(startDate)} - ${formatPickerDayLabel(endDate)}`
}

function StatsChartSection({
  title,
  metric,
  series,
  minDay,
  maxDay,
}: {
  title: string
  metric: MetricKey
  series: DailyStatsPoint[]
  minDay: string
  maxDay: string
}) {
  const [granularity, setGranularity] = useState<StatsGranularity>('year')
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs(maxDay))
  const effectiveMinDay = useMemo(
    () => findFirstMetricDay(series, metric, minDay),
    [metric, minDay, series]
  )

  const selectedRange = useMemo(
    () => buildSelectedRange(granularity, selectedDate, maxDay),
    [granularity, maxDay, selectedDate]
  )
  const previousRange = useMemo(
    () => buildPreviousRange(selectedRange),
    [selectedRange]
  )
  const selectedPoints = useMemo(
    () => filterPoints(series, selectedRange),
    [selectedRange, series]
  )
  const previousPoints = useMemo(
    () =>
      previousRange.startDate >= effectiveMinDay
        ? filterPoints(series, previousRange)
        : [],
    [effectiveMinDay, previousRange, series]
  )
  const periodTotal = useMemo(
    () => sumMetric(selectedPoints, metric),
    [metric, selectedPoints]
  )
  const previousTotal = useMemo(
    () => sumMetric(previousPoints, metric),
    [metric, previousPoints]
  )
  const delta = useMemo(
    () => formatDelta(periodTotal, previousTotal),
    [periodTotal, previousTotal]
  )

  const chartData = useMemo(
    () => buildChartData(selectedPoints, selectedRange, metric, granularity),
    [granularity, metric, selectedPoints, selectedRange]
  )

  const disabledDate = useMemo(
    () => buildDisabledDate(granularity, effectiveMinDay, maxDay),
    [effectiveMinDay, granularity, maxDay]
  )
  const pickerFormat = useMemo(
    () => (value: Dayjs) => formatPickerValue(value, granularity, maxDay),
    [granularity, maxDay]
  )

  const isEmpty =
    chartData.length === 0 || chartData.every(point => point.value === 0)

  return (
    <section className='flex flex-col gap-5'>
      <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <Title level={5} className='!mb-0'>
          {title}
        </Title>

        {!isEmpty ? (
          <div className='flex items-center gap-3 md:justify-end'>
            <div className='text-[44px] font-semibold leading-none text-[#111b21]'>
              {formatNumber(periodTotal)}
            </div>
            {delta ? (
              <div
                className={`rounded-2xl bg-[#111b21] px-3 py-2 text-[12px] font-semibold leading-none ${
                  delta.positive ? 'text-primary-green' : 'text-[#ff7875]'
                }`}
              >
                {delta.label}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <Segmented<StatsGranularity>
          value={granularity}
          shape='round'
          options={[
            { label: 'Semaine', value: 'week' },
            { label: 'Mois', value: 'month' },
            { label: 'Année', value: 'year' },
          ]}
          className='stats-granularity-toggle'
          onChange={value => setGranularity(value)}
        />

        <DatePicker
          allowClear={false}
          inputReadOnly
          picker={granularity}
          value={selectedDate}
          format={pickerFormat}
          disabledDate={disabledDate}
          className='!h-[42px] w-full !rounded-full md:w-[240px] [&_.ant-picker-input>input]:!text-sm'
          onChange={value => {
            if (value) {
              setSelectedDate(value)
            }
          }}
        />
      </div>

      {isEmpty ? (
        <Empty
          description='Aucune activite exploitable sur la periode selectionnee.'
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <div className='h-[280px] w-full sm:h-[340px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={chartData}
                margin={{ top: 14, right: 6, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`${metric}-surface`}
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='0%'
                      stopColor={CHART_FILL}
                      stopOpacity={0.34}
                    />
                    <stop
                      offset='100%'
                      stopColor={CHART_FILL}
                      stopOpacity={0.04}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke='rgba(17,27,33,0.08)'
                  strokeDasharray='4 8'
                  vertical={false}
                />

                <XAxis
                  dataKey='bucket'
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  minTickGap={granularity === 'week' ? 0 : 24}
                  tick={{ fill: '#8a8a8a', fontSize: 12 }}
                  tickFormatter={value => formatTick(value, granularity)}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickMargin={10}
                  tick={{ fill: '#696969', fontSize: 12 }}
                  tickFormatter={value => formatAxisNumber(Number(value))}
                />

                <Tooltip
                  cursor={{
                    stroke: 'rgba(17,27,33,0.12)',
                    strokeDasharray: '4 6',
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) {
                      return null
                    }

                    return (
                      <div className='rounded-[22px] bg-[#111b21] px-4 py-3 text-white'>
                        <div className='mb-1 text-xs font-medium text-white/70'>
                          {formatTooltipLabel(String(label || ''), granularity)}
                        </div>
                        <div className='text-[28px] font-semibold leading-none'>
                          {new Intl.NumberFormat('fr-FR').format(
                            Number(payload[0]?.value || 0)
                          )}
                        </div>
                      </div>
                    )
                  }}
                />

                <Area
                  type='monotone'
                  dataKey='value'
                  stroke={CHART_STROKE}
                  strokeWidth={2.5}
                  fill={`url(#${metric}-surface)`}
                  activeDot={{
                    r: 6,
                    stroke: '#ffffff',
                    strokeWidth: 3,
                    fill: CHART_STROKE,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  )
}

export function meta() {
  return [
    { title: 'Statistiques - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Volumes de conversations et de messages sur WhatsApp Agent',
    },
  ]
}

export default function StatsPage() {
  const today = useMemo(() => formatUtcDay(new Date()), [])
  const oldestFetchedYear =
    parseUtcDay(today).getUTCFullYear() - YEAR_OPTIONS_DEPTH
  const defaultStartDate = `${oldestFetchedYear}-01-01`

  const statsQuery = useQuery<StatsAnalyticsResponse>({
    queryKey: ['stats-analytics-dashboard', defaultStartDate, today],
    queryFn: () =>
      getStatsAnalytics({
        startDate: defaultStartDate,
        endDate: today,
      }),
  })

  const minDay = statsQuery.data?.series[0]?.day ?? defaultStartDate
  const maxDay = statsQuery.data?.range.endDate ?? today

  return (
    <>
      <DashboardHeader title='Statistiques' />

      <div className='flex w-full flex-col gap-10 px-4 py-5 sm:px-6 sm:py-6'>
        {statsQuery.isLoading ? (
          <>
            <Skeleton active paragraph={{ rows: 8 }} />
            <Skeleton active paragraph={{ rows: 8 }} />
          </>
        ) : statsQuery.isError ? (
          <Alert
            type='error'
            showIcon
            message='Impossible de charger les statistiques'
            action={
              <Button
                type='text'
                icon={<ReloadOutlined />}
                className='!shadow-none'
                onClick={() => statsQuery.refetch()}
              >
                Réessayer
              </Button>
            }
          />
        ) : statsQuery.data ? (
          <>
            <StatsChartSection
              title='Messages'
              metric='messages'
              series={statsQuery.data.series}
              minDay={minDay}
              maxDay={maxDay}
            />
            <StatsChartSection
              title='Conversations'
              metric='conversations'
              series={statsQuery.data.series}
              minDay={minDay}
              maxDay={maxDay}
            />
          </>
        ) : (
          <Empty
            description='Aucune statistique disponible pour le moment.'
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </>
  )
}
