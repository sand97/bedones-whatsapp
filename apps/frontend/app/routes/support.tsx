import {
  CheckCircleFilled,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import { useAuth } from '@app/hooks/useAuth'
import { getPlanLabel, resolveCurrentPlanKey } from '@app/lib/current-plan'
import {
  getSentryFeedbackConfig,
  sendSupportFeedback,
} from '@app/lib/observability/sentry-feedback'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Select,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

type SupportLocationState = {
  category?: string
  subject?: string
}

type SupportFormValues = {
  category: string
  email: string
  message: string
  name: string
  subject?: string
}

const CATEGORY_OPTIONS = [
  { label: 'Question produit', value: 'question' },
  { label: 'Bug ou incident', value: 'bug' },
  { label: "Demande d'évolution", value: 'amelioration' },
  { label: 'Upgrade / abonnement', value: 'upgrade' },
]

export function meta() {
  return [
    { title: 'Support - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Formulaire support branché à Sentry User Feedback pour centraliser les retours utilisateur',
    },
  ]
}

export default function SupportPage() {
  const { user } = useAuth()
  const location = useLocation()
  const state = (location.state || {}) as SupportLocationState
  const [form] = Form.useForm<SupportFormValues>()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitEventId, setSubmitEventId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sentryConfig = getSentryFeedbackConfig()
  const currentPlanKey = useMemo(() => resolveCurrentPlanKey(user), [user])
  const currentPlanLabel = getPlanLabel(currentPlanKey)

  useEffect(() => {
    form.setFieldsValue({
      category: state.category || 'question',
      email: user?.email || '',
      name:
        user?.businessInfo?.profile_name ||
        user?.whatsappProfile?.pushname ||
        '',
      subject: state.subject || '',
    })
  }, [form, state.category, state.subject, user])

  const handleSubmit = async (values: SupportFormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const eventId = await sendSupportFeedback({
        category: values.category,
        context: {
          appArea: 'dashboard-support',
          contextScore:
            typeof user?.contextScore === 'number'
              ? String(user.contextScore)
              : undefined,
          currentPlan: currentPlanLabel,
          route: location.pathname,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          url:
            typeof window !== 'undefined'
              ? window.location.href
              : location.pathname,
          userId: user?.id,
        },
        email: values.email.trim(),
        message: values.message.trim(),
        name: values.name.trim(),
        subject: values.subject?.trim(),
      })

      setSubmitEventId(eventId)
      form.setFieldsValue({
        category: 'question',
        message: '',
        subject: '',
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Le retour n'a pas pu être envoyé."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAfterSuccess = () => {
    setSubmitEventId(null)
    setSubmitError(null)
  }

  return (
    <>
      <DashboardHeader
        title='Support'
        right={
          <Tag className='rounded-full border-none bg-[#111b21] px-3 py-1 text-white'>
            Sentry feedback
          </Tag>
        }
      />

      <div className='flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6'>
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
          <Card styles={{ body: { padding: 0 } }} className='overflow-hidden'>
            <div className='relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#111b21_0%,#153b2b_55%,#24d366_100%)] px-6 py-7 text-white sm:px-8 sm:py-8'>
              <div className='absolute -right-8 top-0 h-36 w-36 rounded-full bg-white/10 blur-2xl' />
              <div className='relative flex flex-col gap-4'>
                <Tag className='mr-auto rounded-full border-none bg-white/14 px-3 py-1 text-white'>
                  Canal support centralisé
                </Tag>
                <div className='max-w-3xl'>
                  <Title level={3} className='!mb-2 !text-white'>
                    Envoyez un retour produit sans quitter le dashboard.
                  </Title>
                  <Paragraph className='!mb-0 !text-white/80'>
                    Le formulaire crée un feedback Sentry pour faciliter le tri
                    des bugs, besoins d’évolution et questions opérationnelles.
                  </Paragraph>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Tag className='rounded-full border-none bg-white/12 px-3 py-1 text-white'>
                    Plan détecté : {currentPlanLabel}
                  </Tag>
                  <Tag className='rounded-full border-none bg-white/12 px-3 py-1 text-white'>
                    Route : {location.pathname}
                  </Tag>
                </div>
              </div>
            </div>
          </Card>

          <Card className='h-full' styles={{ body: { padding: 24 } }}>
            <div className='flex h-full flex-col gap-5'>
              <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4fbf7] text-[#178f57]'>
                <CustomerServiceOutlined className='text-lg' />
              </div>

              <div>
                <Title level={5} className='!mb-2'>
                  Ce qui est envoyé
                </Title>
                <Paragraph className='!mb-0 text-[#5b5b5b]'>
                  Votre message, votre email, le type de demande, la page
                  courante et quelques métadonnées utiles non sensibles.
                </Paragraph>
              </div>

              <div>
                <Title level={5} className='!mb-2'>
                  Ce qui reste exclu
                </Title>
                <Paragraph className='!mb-0 text-[#5b5b5b]'>
                  Aucun numéro de téléphone ni contenu personnel n’est ajouté
                  automatiquement au feedback.
                </Paragraph>
              </div>
            </div>
          </Card>
        </div>

        {!sentryConfig.enabled && (
          <Alert
            type='warning'
            showIcon
            icon={<SafetyCertificateOutlined />}
            message='Configuration Sentry frontend manquante'
            description={
              sentryConfig.reason === 'invalid_dsn'
                ? 'VITE_SENTRY_DSN est présent mais invalide. Corrigez la variable pour activer le formulaire.'
                : "Renseignez VITE_SENTRY_DSN dans la configuration frontend pour permettre l'envoi de feedback."
            }
          />
        )}

        {submitError && (
          <Alert
            type='error'
            showIcon
            message='Envoi impossible'
            description={submitError}
          />
        )}

        {submitEventId ? (
          <Card styles={{ body: { padding: 32 } }}>
            <Result
              icon={<CheckCircleFilled className='text-[#24d366]' />}
              status='success'
              title='Retour envoyé au support'
              subTitle={`Référence Sentry : ${submitEventId}`}
              extra={[
                <Button
                  key='another'
                  type='primary'
                  onClick={resetAfterSuccess}
                >
                  Envoyer un autre retour
                </Button>,
              ]}
            />
          </Card>
        ) : (
          <Card styles={{ body: { padding: 24 } }}>
            <Form<SupportFormValues>
              form={form}
              layout='vertical'
              onFinish={handleSubmit}
              initialValues={{
                category: state.category || 'question',
              }}
            >
              <div className='grid grid-cols-1 gap-x-4 md:grid-cols-2'>
                <Form.Item
                  label='Nom'
                  name='name'
                  rules={[{ required: true, message: 'Renseignez votre nom.' }]}
                >
                  <Input placeholder='Votre nom ou celui de votre structure' />
                </Form.Item>

                <Form.Item
                  label='Email'
                  name='email'
                  rules={[
                    {
                      required: true,
                      message: 'Renseignez un email de contact.',
                    },
                    { type: 'email', message: 'Adresse email invalide.' },
                  ]}
                >
                  <Input placeholder='contact@entreprise.com' />
                </Form.Item>
              </div>

              <div className='grid grid-cols-1 gap-x-4 md:grid-cols-[0.7fr_1.3fr]'>
                <Form.Item
                  label='Type de demande'
                  name='category'
                  rules={[
                    {
                      required: true,
                      message: 'Sélectionnez un type de demande.',
                    },
                  ]}
                >
                  <Select options={CATEGORY_OPTIONS} />
                </Form.Item>

                <Form.Item label='Sujet' name='subject'>
                  <Input placeholder='Résumé court de votre retour' />
                </Form.Item>
              </div>

              <Form.Item
                label='Message'
                name='message'
                rules={[
                  { required: true, message: 'Précisez votre retour.' },
                  {
                    min: 20,
                    message:
                      'Ajoutez un peu plus de contexte (20 caractères minimum).',
                  },
                ]}
              >
                <TextArea
                  rows={8}
                  placeholder='Expliquez le problème, le contexte ou le besoin produit...'
                  showCount
                  maxLength={2000}
                />
              </Form.Item>

              <div className='flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between'>
                <Text className='text-sm text-[#6a6a6a]'>
                  Envoi vers Sentry User Feedback avec métadonnées utiles et non
                  sensibles.
                </Text>

                <Button
                  type='primary'
                  htmlType='submit'
                  icon={<SendOutlined />}
                  loading={isSubmitting}
                  disabled={!sentryConfig.enabled}
                >
                  Envoyer au support
                </Button>
              </div>
            </Form>
          </Card>
        )}
      </div>
    </>
  )
}
