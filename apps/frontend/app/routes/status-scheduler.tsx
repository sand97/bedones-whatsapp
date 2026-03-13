import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileImageOutlined,
  NotificationOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import {
  cancelStatusSchedule,
  createStatusSchedule,
  getStatusSchedules,
  updateStatusSchedule,
  type CreateStatusSchedulePayload,
  type StatusSchedule,
  type StatusScheduleContentType,
} from '@app/lib/api/status-scheduler'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Calendar,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import type { CalendarProps } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

const { Text, Title } = Typography

type ScheduleFormValues = {
  scheduledTime: string
  contentType: StatusScheduleContentType
  textContent?: string
  caption?: string
  mediaUrl?: string
}

const CONTENT_TYPE_META: Record<
  StatusScheduleContentType,
  {
    label: string
    accent: string
    background: string
    icon: ReactNode
  }
> = {
  TEXT: {
    label: 'Texte',
    accent: '#111b21',
    background: '#f4f7f6',
    icon: <NotificationOutlined />,
  },
  IMAGE: {
    label: 'Image',
    accent: '#178f57',
    background: '#ebfff3',
    icon: <FileImageOutlined />,
  },
  VIDEO: {
    label: 'Vidéo',
    accent: '#c26c12',
    background: '#fff5e8',
    icon: <PlayCircleOutlined />,
  },
}

const STATUS_META: Record<
  StatusSchedule['status'],
  {
    label: string
    color: string
  }
> = {
  PENDING: { label: 'Planifié', color: 'default' },
  PROCESSING: { label: 'Envoi', color: 'processing' },
  SENT: { label: 'Envoyé', color: 'success' },
  FAILED: { label: 'Échec', color: 'error' },
  CANCELLED: { label: 'Annulé', color: 'default' },
}

function formatTime(schedule: StatusSchedule) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: schedule.timezone,
  }).format(new Date(schedule.scheduledFor))
}

function formatDayLabel(day: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${day}T00:00:00`))
}

function getMonthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)
  const lastDay = new Date(year, monthIndex, 0)

  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay.getDate()).padStart(2, '0')}`,
  }
}

function buildScheduledFor(day: string, time: string) {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)

  return new Date(
    year,
    month - 1,
    dayOfMonth,
    hours || 0,
    minutes || 0,
    0,
    0
  ).toISOString()
}

function getDefaultTimeForDay(day: string) {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  if (day === today) {
    const nextHour = new Date(now)
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    return `${String(nextHour.getHours()).padStart(2, '0')}:${String(
      nextHour.getMinutes()
    ).padStart(2, '0')}`
  }

  return '09:00'
}

function getSchedulePreview(schedule: StatusSchedule) {
  if (schedule.contentType === 'TEXT') {
    return schedule.textContent || 'Statut texte'
  }

  return schedule.caption || schedule.mediaUrl || 'Media prêt à publier'
}

function normalizePayload(
  day: string,
  timezone: string,
  values: ScheduleFormValues
): CreateStatusSchedulePayload {
  const payload: CreateStatusSchedulePayload = {
    scheduledFor: buildScheduledFor(day, values.scheduledTime),
    timezone,
    contentType: values.contentType,
  }

  if (values.contentType === 'TEXT') {
    payload.textContent = values.textContent?.trim()
  } else {
    payload.mediaUrl = values.mediaUrl?.trim()
    payload.caption = values.caption?.trim()
  }

  return payload
}

export function meta() {
  return [
    { title: 'Status scheduler - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Calendrier de planification des statuts WhatsApp avec édition par journée',
    },
  ]
}

export default function StatusSchedulerPage() {
  const { notification } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ScheduleFormValues>()
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  )
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7))
  const [selectedDay, setSelectedDay] = useState(today)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<StatusSchedule | null>(
    null
  )
  const contentType = Form.useWatch('contentType', form) || 'TEXT'

  const monthRange = useMemo(
    () => getMonthRange(calendarMonth),
    [calendarMonth]
  )

  const schedulesQuery = useQuery({
    queryKey: ['status-schedules', monthRange.startDate, monthRange.endDate],
    queryFn: () => getStatusSchedules(monthRange),
  })

  const schedulesByDay = useMemo(() => {
    const nextMap = new Map<string, StatusSchedule[]>()

    for (const schedule of schedulesQuery.data || []) {
      const entry = nextMap.get(schedule.scheduledDay) || []
      entry.push(schedule)
      nextMap.set(schedule.scheduledDay, entry)
    }

    for (const entry of nextMap.values()) {
      entry.sort(
        (left, right) =>
          new Date(left.scheduledFor).getTime() -
          new Date(right.scheduledFor).getTime()
      )
    }

    return nextMap
  }, [schedulesQuery.data])

  const selectedDaySchedules = useMemo(
    () => schedulesByDay.get(selectedDay) || [],
    [schedulesByDay, selectedDay]
  )

  const summary = useMemo(() => {
    const schedules = schedulesQuery.data || []
    const plannedDays = new Set(
      schedules.map(schedule => schedule.scheduledDay)
    )

    return {
      total: schedules.length,
      plannedDays: plannedDays.size,
      pending: schedules.filter(schedule => schedule.status === 'PENDING')
        .length,
      failed: schedules.filter(schedule => schedule.status === 'FAILED').length,
    }
  }, [schedulesQuery.data])

  const resetComposer = (day = selectedDay) => {
    setEditingSchedule(null)
    form.setFieldsValue({
      scheduledTime: getDefaultTimeForDay(day),
      contentType: 'TEXT',
      textContent: '',
      caption: '',
      mediaUrl: '',
    })
  }

  useEffect(() => {
    if (!modalOpen || editingSchedule) {
      return
    }

    form.setFieldsValue({
      scheduledTime: getDefaultTimeForDay(selectedDay),
      contentType: 'TEXT',
      textContent: '',
      caption: '',
      mediaUrl: '',
    })
  }, [editingSchedule, form, modalOpen, selectedDay])

  const invalidateSchedules = async () => {
    await queryClient.invalidateQueries({ queryKey: ['status-schedules'] })
  }

  const createMutation = useMutation({
    mutationFn: createStatusSchedule,
    onSuccess: async () => {
      await invalidateSchedules()
      resetComposer(selectedDay)
      notification.success({
        message: 'Statut planifié',
        description: 'Le statut a été ajouté à cette journée.',
      })
    },
    onError: (error: any) => {
      notification.error({
        message: 'Création impossible',
        description:
          error?.response?.data?.message ||
          'Le statut n’a pas pu être planifié.',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      scheduleId,
      payload,
    }: {
      scheduleId: string
      payload: CreateStatusSchedulePayload
    }) => updateStatusSchedule(scheduleId, payload),
    onSuccess: async () => {
      await invalidateSchedules()
      resetComposer(selectedDay)
      notification.success({
        message: 'Statut mis à jour',
        description: 'La planification a été enregistrée.',
      })
    },
    onError: (error: any) => {
      notification.error({
        message: 'Mise à jour impossible',
        description:
          error?.response?.data?.message ||
          'Le statut n’a pas pu être modifié.',
      })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelStatusSchedule,
    onSuccess: async () => {
      await invalidateSchedules()
      notification.success({
        message: 'Statut supprimé',
        description: 'La planification a bien été retirée du calendrier.',
      })
    },
    onError: (error: any) => {
      notification.error({
        message: 'Suppression impossible',
        description:
          error?.response?.data?.message ||
          'Le statut n’a pas pu être supprimé.',
      })
    },
  })

  const handleOpenDay = (day: string) => {
    setSelectedDay(day)
    setCalendarMonth(day.slice(0, 7))
    setModalOpen(true)
    setEditingSchedule(null)
  }

  const handleSubmit = async (values: ScheduleFormValues) => {
    const payload = normalizePayload(selectedDay, timezone, values)

    if (editingSchedule) {
      await updateMutation.mutateAsync({
        scheduleId: editingSchedule.id,
        payload,
      })
      return
    }

    await createMutation.mutateAsync(payload)
  }

  const handleEdit = (schedule: StatusSchedule) => {
    setEditingSchedule(schedule)
    form.setFieldsValue({
      scheduledTime: formatTime(schedule),
      contentType: schedule.contentType,
      textContent: schedule.textContent || '',
      caption: schedule.caption || '',
      mediaUrl: schedule.mediaUrl || '',
    })
  }

  const canCreateOnSelectedDay = selectedDay >= today
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    cancelMutation.isPending

  const fullCellRender: CalendarProps<any>['fullCellRender'] = (
    value,
    info
  ) => {
    if (info.type !== 'date') {
      return info.originNode
    }

    const dayKey = value.format('YYYY-MM-DD')
    const daySchedules = schedulesByDay.get(dayKey) || []
    const isToday = dayKey === today
    const isActive = dayKey === selectedDay

    return (
      <div
        className={`status-calendar-cell ${daySchedules.length > 0 ? 'has-items' : ''} ${
          isActive ? 'is-active' : ''
        }`}
      >
        <button
          type='button'
          className='status-calendar-button'
          onClick={() => handleOpenDay(dayKey)}
        >
          <div className='flex items-center justify-between gap-2'>
            <span className='text-sm font-semibold text-[#111b21]'>
              {value.date()}
            </span>
            {isToday && (
              <span className='rounded-full bg-[#111b21] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white'>
                Aujourd&apos;hui
              </span>
            )}
          </div>

          {daySchedules.length > 0 ? (
            <div className='mt-3 flex flex-col gap-2'>
              {daySchedules.slice(0, 3).map(schedule => {
                const meta = CONTENT_TYPE_META[schedule.contentType]

                return (
                  <div
                    key={schedule.id}
                    className='rounded-2xl border border-black/6 bg-white/90 px-3 py-2 text-left shadow-[0px_12px_28px_rgba(17,27,33,0.08)]'
                  >
                    <div className='mb-1 flex items-center justify-between gap-2'>
                      <span
                        className='inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em]'
                        style={{ color: meta.accent }}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                      <span className='text-xs font-medium text-[#5f6a6f]'>
                        {formatTime(schedule)}
                      </span>
                    </div>
                    <div className='line-clamp-2 text-xs text-[#4c5458]'>
                      {getSchedulePreview(schedule)}
                    </div>
                  </div>
                )
              })}

              {daySchedules.length > 3 && (
                <span className='text-xs font-medium text-[#5f6a6f]'>
                  +{daySchedules.length - 3} statut(s)
                </span>
              )}
            </div>
          ) : (
            <div className='mt-4 rounded-2xl border border-dashed border-black/8 px-3 py-4 text-left text-xs text-[#7b8589]'>
              Journée libre
            </div>
          )}
        </button>
      </div>
    )
  }

  return (
    <>
      <DashboardHeader
        title='Status scheduler'
        right={
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => handleOpenDay(today)}
          >
            Ajouter aujourd&apos;hui
          </Button>
        }
      />

      <div className='relative flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6'>
        <div className='pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(36,211,102,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(17,27,33,0.08),transparent_34%)]' />

        <section className='relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,#f6faf7_0%,#fdfdfd_100%)] p-5 shadow-[0px_30px_120px_rgba(17,27,33,0.08)] sm:p-6'>
          <div className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div className='max-w-2xl'>
                <Text className='!mb-2 !inline-flex !rounded-full !bg-white !px-3 !py-1 !text-[11px] !font-semibold !uppercase !tracking-[0.22em] !text-[#5f6a6f] !shadow-[0px_8px_24px_rgba(17,27,33,0.06)]'>
                  Calendrier marketing
                </Text>
                <Title level={2} className='!mb-2 !text-[32px] !leading-tight'>
                  Planifier plusieurs statuts WhatsApp sur une même journée
                </Title>
                <Text type='secondary' className='!text-base'>
                  Cliquez sur un jour, ajoutez autant de publications que
                  nécessaire, puis laissez le backend déclencher l’envoi à
                  l’heure prévue via WPPConnect.
                </Text>
              </div>

              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <div className='rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0px_18px_50px_rgba(17,27,33,0.08)]'>
                  <Statistic title='Ce mois' value={summary.total} />
                </div>
                <div className='rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0px_18px_50px_rgba(17,27,33,0.08)]'>
                  <Statistic title='Jours actifs' value={summary.plannedDays} />
                </div>
                <div className='rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0px_18px_50px_rgba(17,27,33,0.08)]'>
                  <Statistic title='En attente' value={summary.pending} />
                </div>
                <div className='rounded-[24px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0px_18px_50px_rgba(17,27,33,0.08)]'>
                  <Statistic title='À corriger' value={summary.failed} />
                </div>
              </div>
            </div>

            {schedulesQuery.isLoading ? (
              <div className='rounded-[28px] border border-white/70 bg-white p-6 shadow-[0px_24px_80px_rgba(17,27,33,0.08)]'>
                <Skeleton active paragraph={{ rows: 12 }} />
              </div>
            ) : schedulesQuery.isError ? (
              <Alert
                type='error'
                showIcon
                message='Impossible de charger le calendrier'
                description='Les statuts planifiés n’ont pas pu être récupérés depuis le backend.'
              />
            ) : (
              <div className='overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-3 shadow-[0px_24px_80px_rgba(17,27,33,0.08)] sm:p-5'>
                <Calendar
                  className='status-scheduler-calendar'
                  onSelect={value => handleOpenDay(value.format('YYYY-MM-DD'))}
                  onPanelChange={value =>
                    setCalendarMonth(value.format('YYYY-MM'))
                  }
                  fullCellRender={fullCellRender}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setEditingSchedule(null)
        }}
        footer={null}
        width={840}
        destroyOnClose={false}
        title={
          <div className='flex flex-col gap-1'>
            <span className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f6a6f]'>
              <CalendarOutlined />
              {selectedDay}
            </span>
            <span className='text-xl font-semibold text-[#111b21]'>
              {formatDayLabel(selectedDay)}
            </span>
          </div>
        }
      >
        <div className='flex flex-col gap-6'>
          <section className='rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,#f7faf8_0%,#ffffff_100%)] p-4 sm:p-5'>
            <div className='mb-4 flex items-center justify-between gap-3'>
              <div>
                <Title level={5} className='!mb-1'>
                  Statuts de la journée
                </Title>
                <Text type='secondary'>
                  {selectedDaySchedules.length > 0
                    ? `${selectedDaySchedules.length} publication(s) déjà prévues`
                    : 'Aucun statut encore planifié sur cette date'}
                </Text>
              </div>

              {!editingSchedule && canCreateOnSelectedDay && (
                <Button
                  type='default'
                  icon={<PlusOutlined />}
                  onClick={() => resetComposer(selectedDay)}
                >
                  Nouveau statut
                </Button>
              )}
            </div>

            {selectedDaySchedules.length === 0 ? (
              <div className='rounded-[22px] border border-dashed border-black/10 bg-white px-4 py-10'>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description='Pas encore de statut planifié pour cette date.'
                />
              </div>
            ) : (
              <div className='grid gap-3'>
                {selectedDaySchedules.map(schedule => {
                  const typeMeta = CONTENT_TYPE_META[schedule.contentType]
                  const statusMeta = STATUS_META[schedule.status]

                  return (
                    <article
                      key={schedule.id}
                      className='rounded-[24px] border border-black/6 bg-white px-4 py-4 shadow-[0px_16px_36px_rgba(17,27,33,0.06)]'
                    >
                      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='min-w-0 flex-1'>
                          <div className='mb-2 flex flex-wrap items-center gap-2'>
                            <span
                              className='inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]'
                              style={{
                                color: typeMeta.accent,
                                background: typeMeta.background,
                              }}
                            >
                              {typeMeta.icon}
                              {typeMeta.label}
                            </span>
                            <Tag color={statusMeta.color}>
                              {statusMeta.label}
                            </Tag>
                            <span className='inline-flex items-center gap-2 text-sm font-medium text-[#111b21]'>
                              <ClockCircleOutlined />
                              {formatTime(schedule)}
                            </span>
                          </div>

                          <p className='mb-0 text-sm leading-6 text-[#4c5458]'>
                            {getSchedulePreview(schedule)}
                          </p>

                          {schedule.lastError && (
                            <div className='mt-3 rounded-2xl border border-[#ffd8bf] bg-[#fff7e6] px-3 py-2 text-xs text-[#ad6800]'>
                              {schedule.lastError}
                            </div>
                          )}
                        </div>

                        <div className='flex shrink-0 gap-2'>
                          {schedule.status !== 'SENT' &&
                            schedule.status !== 'PROCESSING' && (
                              <Button
                                type='default'
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(schedule)}
                              >
                                Modifier
                              </Button>
                            )}

                          {schedule.status !== 'SENT' &&
                            schedule.status !== 'PROCESSING' && (
                              <Popconfirm
                                title='Supprimer ce statut ?'
                                description='La planification sera retirée du calendrier.'
                                okText='Supprimer'
                                cancelText='Annuler'
                                okButtonProps={{ danger: true }}
                                onConfirm={() =>
                                  cancelMutation.mutate(schedule.id)
                                }
                              >
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  loading={
                                    cancelMutation.isPending &&
                                    cancelMutation.variables === schedule.id
                                  }
                                >
                                  Supprimer
                                </Button>
                              </Popconfirm>
                            )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className='rounded-[28px] border border-black/6 bg-white p-4 shadow-[0px_18px_36px_rgba(17,27,33,0.05)] sm:p-5'>
            <div className='mb-4'>
              <Title level={5} className='!mb-1'>
                {editingSchedule ? 'Modifier le statut' : 'Ajouter un statut'}
              </Title>
              <Text type='secondary'>
                Choisissez au minimum l’heure et le type de contenu. Texte,
                image et vidéo sont pris en charge.
              </Text>
            </div>

            {!canCreateOnSelectedDay && !editingSchedule ? (
              <Alert
                type='info'
                showIcon
                message='Ajout désactivé sur une journée passée'
                description='Vous pouvez consulter l’historique de cette date, mais la création de nouveaux statuts est réservée aux créneaux futurs.'
              />
            ) : (
              <Form
                form={form}
                layout='vertical'
                onFinish={handleSubmit}
                initialValues={{
                  scheduledTime: getDefaultTimeForDay(selectedDay),
                  contentType: 'TEXT',
                }}
              >
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Form.Item
                    name='scheduledTime'
                    label='Heure'
                    rules={[
                      {
                        required: true,
                        message: 'Choisissez une heure de publication',
                      },
                    ]}
                  >
                    <Input type='time' className='w-full' />
                  </Form.Item>

                  <Form.Item
                    name='contentType'
                    label='Type de contenu'
                    rules={[
                      {
                        required: true,
                        message: 'Choisissez un type de contenu',
                      },
                    ]}
                  >
                    <Select
                      options={Object.entries(CONTENT_TYPE_META).map(
                        ([value, meta]) => ({
                          value,
                          label: meta.label,
                        })
                      )}
                    />
                  </Form.Item>
                </div>

                {contentType === 'TEXT' ? (
                  <Form.Item
                    name='textContent'
                    label='Contenu'
                    rules={[
                      {
                        required: true,
                        message: 'Saisissez le texte du statut',
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={5}
                      maxLength={700}
                      placeholder='Ex: Arrivage du jour, promo flash jusqu’à 18h, nouveautés en boutique...'
                    />
                  </Form.Item>
                ) : (
                  <>
                    <Form.Item
                      name='mediaUrl'
                      label='URL du média'
                      rules={[
                        {
                          required: true,
                          message: 'Ajoutez une URL image ou vidéo',
                        },
                      ]}
                    >
                      <Input placeholder='https://cdn.example.com/statuses/visuel.jpg' />
                    </Form.Item>

                    <Form.Item name='caption' label='Légende'>
                      <Input.TextArea
                        rows={4}
                        maxLength={700}
                        placeholder='Texte optionnel affiché avec le média'
                      />
                    </Form.Item>
                  </>
                )}

                <div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
                  {editingSchedule && (
                    <Button onClick={() => resetComposer(selectedDay)}>
                      Annuler l’édition
                    </Button>
                  )}
                  <Button
                    type='primary'
                    htmlType='submit'
                    icon={editingSchedule ? <EditOutlined /> : <PlusOutlined />}
                    loading={isMutating}
                  >
                    {editingSchedule ? 'Enregistrer' : 'Ajouter au calendrier'}
                  </Button>
                </div>
              </Form>
            )}
          </section>
        </div>
      </Modal>
    </>
  )
}
