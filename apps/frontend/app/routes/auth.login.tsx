import {
  ArrowRightOutlined,
  CustomerServiceOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { featuresConfig } from '@app/data/features'
import { useAuth } from '@app/hooks/useAuth'
import apiClient from '@app/lib/api/client'
import { App, Button, Modal, Spin } from 'antd'
import Form from 'antd/es/form'
import FormItem from 'antd/es/form/FormItem'
import PhoneInput, { type PhoneNumber } from 'antd-phone-input'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const LAST_PHONE_KEY = 'whatsapp-agent-last-phone'

interface FormValues {
  phone: PhoneNumber
}

export function meta() {
  return [
    { title: 'Connexion - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Connectez-vous avec votre numéro WhatsApp Business',
    },
  ]
}

// Fonction pour détecter si l'utilisateur est sur mobile (basée sur la largeur du navigateur)
function isMobileDevice() {
  return window.innerWidth < 768 // Mobile si largeur < 768px (breakpoint standard)
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { notification } = App.useApp()
  const { login } = useAuth()
  const [form] = Form.useForm<FormValues>()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string | null>(
    null
  )
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingToken, setPairingToken] = useState<string | null>(null)
  const [qrSessionToken, setQrSessionToken] = useState<string | null>(null)
  const [isQrMode, setIsQrMode] = useState(false)
  const [isMobile] = useState(isMobileDevice())
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(
    null
  )
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Récupérer la feature sélectionnée depuis la config
  const selectedFeature = selectedFeatureKey
    ? Object.values(featuresConfig)
        .flatMap(category => category.features)
        .find(f => `${f.title}` === selectedFeatureKey)
    : null

  // Polling for QR code status and authentication check
  useEffect(() => {
    if (!pairingToken || !qrSessionToken || !isQrMode) return

    const checkQRStatus = async () => {
      setIsPolling(true)
      try {
        const response = await apiClient.post('/auth/refresh-qr', {
          pairingToken,
          qrSessionToken,
        })

        if (response.status === 201 || response.status === 200) {
          // Scenario 1: User is already connected
          if (response.data.scenario === 'connected') {
            console.log('✅ User is already connected')
            notification.success({
              message: 'Connexion réussie',
              description: 'Vous allez être redirigé...',
            })

            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            // Login and redirect
            if (response.data.accessToken) {
              login(response.data.accessToken, response.data.user)

              setTimeout(() => {
                navigate(response.data.redirectTo || '/context')
              }, 1000)
            }
            return
          }

          // Scenario 2: New QR code received
          if (response.data.qrCode) {
            console.log('🔄 Received new QR code')
            setQrCode(response.data.qrCode)

            // Update qrSessionToken if provided
            if (response.data.qrSessionToken) {
              setQrSessionToken(response.data.qrSessionToken)
            }
          }

          // Scenario 3: Waiting for connection
          if (!response.data.qrCode && !response.data.scenario) {
            console.log('⏳ Waiting for connection confirmation...')
          }
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } }
        console.error('Error checking QR status:', err)

        // Only show error if it's not a token expiration
        if (!err.response?.data?.message?.includes('expired')) {
          console.error('QR status check error:', err.response?.data?.message)
        }
      } finally {
        setIsPolling(false)
      }
    }

    // Initial check
    checkQRStatus()

    // Start polling every 5 seconds
    pollingIntervalRef.current = setInterval(checkQRStatus, 5000)

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [pairingToken, qrSessionToken, isQrMode, navigate, notification, login])

  const handleContinue = async (values: FormValues) => {
    const { phone } = values
    const fullPhoneNumber = `+${phone.countryCode}${phone.areaCode}${phone.phoneNumber}`
    setCurrentPhoneNumber(fullPhoneNumber)

    if (!phone.phoneNumber) {
      notification.error({
        message: 'Erreur',
        description: 'Veuillez entrer un numéro de téléphone valide',
      })
      return
    }

    setIsLoading(true)

    try {
      // Détecter le type d'appareil
      const deviceType = isMobile ? 'mobile' : 'desktop'

      // Appel unifié pour tous les scénarios
      const response = await apiClient.post('/auth/request-pairing', {
        phoneNumber: fullPhoneNumber,
        deviceType,
      })

      if (response.status === 201 || response.status === 200) {
        // Save phone for later
        localStorage.setItem(LAST_PHONE_KEY, JSON.stringify(phone))

        const { scenario, pairingToken, code } = response.data

        // Scénario 1: OTP (utilisateur déjà connecté)
        if (scenario === 'otp') {
          notification.success({
            message: 'Code envoyé',
            description:
              'Un code de vérification a été envoyé sur votre WhatsApp',
          })
          navigate('/auth/verify-otp', {
            state: {
              phoneNumber: fullPhoneNumber,
              pairingToken,
              scenario: 'otp',
            },
          })
          return
        }

        // Scénario 2: Pairing (mobile, nouvel utilisateur)
        if (scenario === 'pairing') {
          notification.success({
            message: 'Code de pairing généré',
            description: 'Veuillez entrer le code dans WhatsApp',
          })
          navigate('/auth/verify-otp', {
            state: {
              phoneNumber: fullPhoneNumber,
              code,
              pairingToken,
              scenario: 'pairing',
            },
          })
          return
        }

        // Scénario 3: QR Code (desktop, nouvel utilisateur)
        if (scenario === 'qr') {
          // Demander le QR code au backend
          const qrResponse = await apiClient.post('/auth/request-qr', {
            phoneNumber: fullPhoneNumber,
          })

          if (qrResponse.status === 201 || qrResponse.status === 200) {
            // User is already connected
            if (qrResponse.data.scenario === 'connected') {
              notification.success({
                message: 'Connexion réussie',
                description: 'Vous êtes déjà connecté',
              })

              if (qrResponse.data.accessToken) {
                login(qrResponse.data.accessToken, qrResponse.data.user)

                setTimeout(() => {
                  navigate(qrResponse.data.redirectTo || '/context')
                }, 1000)
              }
              return
            }

            // Set up QR code display
            setPairingToken(qrResponse.data.pairingToken)
            setQrSessionToken(qrResponse.data.qrSessionToken)
            setIsQrMode(true)

            // If QR code is provided, display it
            if (qrResponse.data.qrCode) {
              setQrCode(qrResponse.data.qrCode)

              notification.success({
                message: 'Code QR généré',
                description: 'Scannez le code QR avec votre WhatsApp',
              })
            } else {
              // No QR code yet, polling will fetch it
              notification.info({
                message: 'Vérification en cours',
                description: qrResponse.data.message || 'Veuillez patienter...',
              })
            }
          }
          return
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }

      // Message spécifique pour mobile si requestPairingCode échoue
      if (
        isMobile &&
        err.response?.data?.message?.includes('code de jumelage a échoué')
      ) {
        notification.error({
          message: 'Impossible de se connecter',
          description: err.response.data.message,
          duration: 10,
        })
      } else {
        notification.error({
          message: 'Erreur',
          description:
            err.response?.data?.message ||
            'Une erreur est survenue lors de la connexion',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const savedPhone = localStorage.getItem(LAST_PHONE_KEY)
    if (savedPhone) {
      try {
        const phoneValue = JSON.parse(savedPhone) as PhoneNumber
        form.setFieldsValue({ phone: phoneValue })
      } catch {
        // Ignore parsing errors for saved phone
      }
    }
  }, [form])

  // Affichage du QR code (desktop)
  if (!isMobile && isQrMode && qrCode) {
    return (
      <div className='min-h-screen flex flex-col items-center bg-bg-subtle px-2 py-8'>
        <div className='w-card max-w-full my-[15vh] flex flex-col items-center'>
          <div className='bg-white rounded-card-outer shadow-card-subtle p-1'>
            <div className='bg-white rounded-card-inner shadow-card p-12 flex flex-col items-center'>
              {/* Header */}
              <div className='text-center mb-8'>
                <h1 className='text-xl font-medium text-text-dark leading-9 mb-2'>
                  Votre business <span className='text-black'>piloté</span> par{' '}
                  <span className='text-primary-green'>L&apos;IA</span>
                </h1>
                <p className='text-base text-text-muted'>
                  Veuillez scanner le code QR ci-dessous avec votre numéro{' '}
                  <span className='text-text-dark'>WhatsApp Business</span>
                </p>
              </div>

              {/* QR Code */}
              <div className='p-8 bg-white border-2 border-gray-200 rounded-lg mb-6 shadow-sm'>
                <QRCodeSVG value={qrCode} size={256} level='M' />
              </div>

              {/* Loading indicator during polling */}
              <div className='flex items-center gap-3 text-text-muted'>
                {isPolling && <Spin />}
                <span>
                  {isPolling
                    ? 'Vérification en cours...'
                    : 'En attente de la connexion...'}
                </span>
              </div>

              {/* Bouton retour */}
              <Button
                type='text'
                onClick={() => {
                  // Stop polling
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current)
                    pollingIntervalRef.current = null
                  }

                  setIsQrMode(false)
                  setQrCode(null)
                  setPairingToken(null)
                  setQrSessionToken(null)
                  setIsPolling(false)
                }}
                className='mt-6'
              >
                Retour
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Affichage du formulaire (desktop sans QR mode OU mobile)
  return (
    <div className='min-h-screen flex flex-col items-center bg-bg-subtle px-2 py-8'>
      <div className='w-card max-w-full my-[15vh] flex flex-col items-center'>
        <div className='bg-white rounded-card-outer shadow-card-subtle p-1'>
          <div className='bg-white rounded-card-inner shadow-card p-12'>
            {/* Header */}
            <div className='text-center mb-8'>
              <h1 className='text-xl font-medium text-text-dark leading-9 mb-2'>
                Votre business <span className='text-black'>piloté</span> par{' '}
                <span className='text-primary-green'>L&apos;IA</span>
              </h1>
              <p className='text-base text-text-muted'>
                Saisissez votre numéro{' '}
                <span className='text-text-dark'>Whatsapp Business</span> pour
                commencer
              </p>
            </div>

            <Form
              form={form}
              onFinish={handleContinue}
              className='flex flex-col items-center gap-3'
            >
              <FormItem
                name='phone'
                rules={[
                  { required: true, message: 'Veuillez entrer votre numéro' },
                ]}
              >
                <PhoneInput enableSearch enableArrow disableParentheses />
              </FormItem>

              <FormItem className='mb-0 mt-4'>
                <Button
                  type='primary'
                  htmlType='submit'
                  size='large'
                  loading={isLoading}
                  className='h-button px-8 bg-primary-green border-black border hover:bg-primary-hover flex items-center gap-2'
                >
                  Continuer
                  <ArrowRightOutlined />
                </Button>
              </FormItem>
            </Form>
          </div>
        </div>

        <div className='flex justify-center gap-4 lg:mt-4 mt-2'>
          <Button
            variant={'outlined'}
            size='large'
            onClick={() => {
              const featuresSection = document.getElementById('features')
              if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            icon={<QuestionCircleOutlined />}
            iconPosition={'end'}
          >
            Fonctionnalités
          </Button>
          <Button
            variant={'outlined'}
            size='large'
            icon={<CustomerServiceOutlined />}
            iconPosition={'end'}
          >
            Aide
          </Button>
        </div>
      </div>

      <div
        className='flex flex-wrap items-start justify-center gap-8'
        id='features'
      >
        {Object.entries(featuresConfig).map(([key, category]) => (
          <div key={key} className='text-center'>
            <h3 className='text-base text-text-muted mb-4'>{category.title}</h3>
            <div className='flex flex-col gap-2 items-center'>
              {category.features.map((feature, index) => (
                <Button
                  key={index}
                  variant='outlined'
                  size='small'
                  icon={feature.icon}
                  iconPosition='start'
                  onClick={() => setSelectedFeatureKey(feature.title)}
                >
                  {feature.title}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={selectedFeature !== null}
        onCancel={() => setSelectedFeatureKey(null)}
        closeIcon={null}
        footer={[
          <Button
            key='close'
            type='primary'
            onClick={() => setSelectedFeatureKey(null)}
          >
            Fermer
          </Button>,
        ]}
        title={
          selectedFeature && (
            <div className='flex items-center gap-2 mb-2'>
              <span className={'text-2xl'}>{selectedFeature.icon}</span>
              <span>{selectedFeature.title}</span>
            </div>
          )
        }
      >
        {selectedFeature && (
          <p className='text-base text-text-muted mb-6'>
            {selectedFeature.description}
          </p>
        )}
      </Modal>
    </div>
  )
}
