import {
  ArrowRightOutlined,
  MessageOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import {
  AgentProductionCard,
  AgentTestCard,
} from '@app/components/agent-config'
import {
  GoogleBrandIcon,
  FacebookBrandIcon,
} from '@app/components/icons/BrandIcons'
import { DashboardHeader } from '@app/components/layout'
import { Button, Card, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Title, Text, Link } = Typography

export function meta() {
  return [
    { title: 'Accueil - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Tableau de bord WhatsApp Agent',
    },
  ]
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const openModerator = () => {
    if (typeof window === 'undefined') return

    window.open(
      'https://moderator.bedones.com',
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <>
      <DashboardHeader title='Accueil' />

      <div className='flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 card-button-bottom'>
        <section>
          <Title level={5} className='mb-4'>
            Tester ou passer en production
          </Title>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <AgentTestCard />
            <AgentProductionCard />
          </div>
        </section>

        <section>
          <Title level={5} className='mb-4'>
            Usages et plan
          </Title>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100'>
                    <MessageOutlined className='text-lg' />
                  </div>
                  <Button
                    type='default'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                    onClick={() => navigate('/stats')}
                  >
                    Voir les détails
                  </Button>
                </div>
                <div>
                  <Text strong className='mb-1 block'>
                    50 messages traités aujourd&apos;hui
                  </Text>
                  <Text type='secondary'>
                    Consulter plus de détails depuis la page de statistique
                  </Text>
                </div>
              </div>
            </Card>

            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100'>
                    <RiseOutlined className='text-lg' />
                  </div>
                  <Button
                    type='primary'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                    onClick={() => navigate('/pricing')}
                  >
                    Voir les forfaits
                  </Button>
                </div>
                <div>
                  <div className='mb-1 flex items-center gap-2'>
                    <Text strong>Forfait</Text>
                    <span className='rounded-full bg-[#24d366] px-2.5 py-1 text-xs font-semibold text-black'>
                      Free
                    </span>
                  </div>
                  <Text type='secondary' className='block'>
                    L&apos;IA répondra à tous les contacts sauf aux contacts
                    exclus. <Link>Exclure des contacts</Link>
                  </Text>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <Title level={5} className='mb-4'>
            Outils
          </Title>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-12 w-12 items-center justify-center'>
                    <GoogleBrandIcon className='h-10 w-10' />
                  </div>
                  <Button
                    type='default'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                  >
                    Connecter
                  </Button>
                </div>
                <div>
                  <Text strong className='mb-1 block'>
                    Google Contacts
                  </Text>
                  <Text type='secondary'>
                    Sauvegarder automatiquement des nouveaux contacts pour les
                    statuts
                  </Text>
                </div>
              </div>
            </Card>

            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-12 w-12 items-center justify-center'>
                    <FacebookBrandIcon className='h-10 w-10' />
                  </div>
                  <Button
                    type='default'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                    onClick={openModerator}
                  >
                    Connecter
                  </Button>
                </div>
                <div>
                  <Text strong className='mb-1 block'>
                    Facebook
                  </Text>
                  <Text type='secondary'>
                    Réponses automatiquement aux commentaires sur vos pages
                  </Text>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  )
}
