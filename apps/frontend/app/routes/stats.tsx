import {
  PlusOutlined,
  BarChartOutlined,
  WhatsAppOutlined,
  FacebookOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Typography,
  Progress,
  Select,
  Segmented,
  Statistic,
  Tag,
} from 'antd'

const { Title, Text } = Typography

export function meta() {
  return [
    { title: 'Statistiques - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Statistiques et analyses de vos conversations',
    },
  ]
}

export default function StatsPage() {
  return (
    <div className='flex flex-col gap-6 w-full p-6'>
      {/* Section: Réponses automatiques */}
      <section>
        <Title level={5} className='mb-4'>
          Réponses automatiques
        </Title>
        <div className='grid grid-cols-2 gap-4'>
          {/* WhatsApp Stats */}
          <Card
            className='h-full'
            styles={{
              body: { padding: 24 },
            }}
          >
            <div className='flex flex-col gap-4 w-full'>
              <div className='flex items-center justify-between'>
                <Progress
                  type='circle'
                  percent={92}
                  size={50}
                  strokeColor='#24d366'
                  format={percent => (
                    <span className='text-sm font-medium'>{percent}%</span>
                  )}
                />
                <div className='flex gap-2'>
                  <Button
                    type='default'
                    size='small'
                    shape='round'
                    icon={<PlusOutlined />}
                    iconPosition='end'
                  >
                    Ajouter
                  </Button>
                  <Button
                    type='default'
                    size='small'
                    shape='round'
                    icon={<BarChartOutlined />}
                    iconPosition='end'
                  >
                    Stats
                  </Button>
                </div>
              </div>
              <div>
                <div className='flex items-center gap-2 mb-1'>
                  <WhatsAppOutlined style={{ color: '#24d366' }} />
                  <Text strong>Whatsapp</Text>
                </div>
                <Text type='secondary' className='block'>
                  37 000 Token restant
                </Text>
              </div>
            </div>
          </Card>

          {/* Facebook Stats */}
          <Card
            className='h-full'
            styles={{
              body: { padding: 24 },
            }}
          >
            <div className='flex flex-col gap-4 w-full'>
              <div className='flex items-center justify-between'>
                <Progress
                  type='circle'
                  percent={92}
                  size={50}
                  strokeColor='#24d366'
                  format={percent => (
                    <span className='text-sm font-medium'>{percent}%</span>
                  )}
                />
                <div className='flex gap-2'>
                  <Button
                    type='default'
                    size='small'
                    shape='round'
                    icon={<PlusOutlined />}
                    iconPosition='end'
                  >
                    Ajouter
                  </Button>
                  <Button
                    type='default'
                    size='small'
                    shape='round'
                    icon={<BarChartOutlined />}
                    iconPosition='end'
                  >
                    Stats
                  </Button>
                </div>
              </div>
              <div>
                <div className='flex items-center gap-2 mb-1'>
                  <FacebookOutlined style={{ color: '#1877F2' }} />
                  <Text strong>Commentaires Facebook</Text>
                </div>
                <Text type='secondary' className='block'>
                  37 000 Token restant
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section: Statistiques des commandes */}
      <section>
        <Title level={5} className='mb-4'>
          Statistiques des commandes
        </Title>
        <Card
          styles={{
            body: { padding: 24 },
          }}
        >
          {/* Filters */}
          <div className='flex items-center justify-between mb-6'>
            <Segmented
              options={['Année', 'Mois', 'Jour']}
              defaultValue='Année'
            />
            <Select
              defaultValue='2024-2025'
              style={{ width: 120 }}
              options={[
                { value: '2024-2025', label: '2024 - 2025' },
                { value: '2023-2024', label: '2023 - 2024' },
              ]}
            />
          </div>

          {/* Stats Summary */}
          <div className='mb-6'>
            <div className='flex items-baseline gap-2'>
              <Statistic
                value={4.5}
                precision={1}
                valueStyle={{ fontSize: 32, fontWeight: 600 }}
              />
              <Tag color='success'>+1.66%</Tag>
            </div>
            <Text type='secondary' className='block mt-1'>
              Par rapport à la journée d&apos;hier
            </Text>
          </div>

          {/* Chart Placeholder */}
          <div className='h-[300px] bg-gradient-to-t from-green-50 to-transparent rounded-lg flex items-end justify-center p-4'>
            <div className='w-full h-full relative'>
              {/* Simple chart visualization */}
              <svg
                viewBox='0 0 800 200'
                className='w-full h-full'
                preserveAspectRatio='none'
              >
                <defs>
                  <linearGradient
                    id='chartGradient'
                    x1='0%'
                    y1='0%'
                    x2='0%'
                    y2='100%'
                  >
                    <stop
                      offset='0%'
                      style={{ stopColor: '#24d366', stopOpacity: 0.3 }}
                    />
                    <stop
                      offset='100%'
                      style={{ stopColor: '#24d366', stopOpacity: 0.05 }}
                    />
                  </linearGradient>
                </defs>
                <path
                  d='M0,150 Q100,140 200,130 T400,100 T600,80 T800,60'
                  stroke='#24d366'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M0,150 Q100,140 200,130 T400,100 T600,80 T800,60 L800,200 L0,200 Z'
                  fill='url(#chartGradient)'
                />
              </svg>

              {/* X-axis labels */}
              <div className='absolute bottom-0 left-0 right-0 flex justify-between'>
                {[
                  'Jan',
                  'Fev',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ].map(month => (
                  <Text key={month} type='secondary' className='text-xs'>
                    {month}
                  </Text>
                ))}
              </div>

              {/* Tooltip */}
              <Card
                size='small'
                className='absolute top-1/3 right-1/4'
                styles={{
                  body: {
                    padding: '8px 12px',
                    backgroundColor: '#111b21',
                    color: 'white',
                  },
                }}
              >
                <Text className='text-xs opacity-70 text-white block'>
                  Oct 25 2025
                </Text>
                <Text strong className='text-white'>
                  4,487.90
                </Text>
              </Card>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
