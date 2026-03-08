import {
  CalendarOutlined,
  CloseOutlined,
  DatabaseOutlined,
  MenuOutlined,
  MessageOutlined,
  SearchOutlined,
  ShareAltOutlined,
  ShoppingOutlined,
  SoundOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useLayout } from '@app/contexts/LayoutContext'
import { useAuth } from '@app/hooks/useAuth'
import { resolveCurrentPlanKey, type PlanKey } from '@app/lib/current-plan'
import { Segmented } from 'antd'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type BillingDuration = 1 | 6 | 12

interface PlanFeature {
  icon: ReactNode
  label: string
}

interface PlanConfig {
  accentLabel?: string
  ctaTone?: 'dark' | 'primary'
  description: string
  features: PlanFeature[]
  featureIntro: string
  includedLabel: string
  monthlyPrice?: number
  overageLabel?: string
  periodLabel: string
}

const PLAN_ORDER: PlanKey[] = ['free', 'pro', 'business']
const BILLING_OPTIONS: Array<{ label: string; value: BillingDuration }> = [
  { label: '1 mois', value: 1 },
  { label: '6 mois -15%', value: 6 },
  { label: '12 mois -20%', value: 12 },
]

const DURATION_DISCOUNT: Record<BillingDuration, number> = {
  1: 0,
  6: 0.15,
  12: 0.2,
}

const PAYMENT_METHODS = [
  { alt: 'Visa', src: '/payments/visa.jpeg' },
  { alt: 'Mastercard', src: '/payments/mastercard.jpg' },
  { alt: 'Orange Money', src: '/payments/orange-money.jpeg' },
  { alt: 'MTN Mobile Money', src: '/payments/mtn-momo.jpeg' },
]

const PLAN_CONTENT: Record<PlanKey, PlanConfig> = {
  free: {
    description: 'Testez votre agent une semaine sur de vraies conversations.',
    featureIntro: 'Pour démarrer :',
    features: [
      {
        icon: <MessageOutlined />,
        label: 'Réponses texte avec contexte',
      },
      {
        icon: <SearchOutlined />,
        label: 'Recherche produit au catalogue',
      },
      {
        icon: <ShoppingOutlined />,
        label: 'Partage du catalogue WhatsApp',
      },
    ],
    includedLabel: 'Essai gratuit pendant 7 jours',
    periodLabel: '/ 7 jours',
  },
  pro: {
    accentLabel: 'Populaire',
    ctaTone: 'primary',
    description: 'Automatisez ventes et support avec un volume confortable.',
    featureIntro: 'Toutes les fonctions Free, plus :',
    features: [
      {
        icon: <MessageOutlined />,
        label: 'Historique de conversation enrichi',
      },
      {
        icon: <SoundOutlined />,
        label: 'Prise en charge des notes vocales',
      },
      {
        icon: <ThunderboltOutlined />,
        label: "Détection d'intention",
      },
      {
        icon: <TagsOutlined />,
        label: 'Labels et suivi des leads',
      },
      {
        icon: <CalendarOutlined />,
        label: 'Relances planifiées',
      },
      {
        icon: <ShoppingOutlined />,
        label: 'Envoi de produits et collections',
      },
    ],
    includedLabel: '500 messages inclus / mois',
    monthlyPrice: 10,
    overageLabel: 'Puis 0,02 $ / message en plus',
    periodLabel: '/ mois',
  },
  business: {
    ctaTone: 'dark',
    description: 'Absorbez plus de volume et coordonnez les cas sensibles.',
    featureIntro: 'Toutes les fonctions Pro, plus :',
    features: [
      {
        icon: <DatabaseOutlined />,
        label: 'Mémoire client persistante',
      },
      {
        icon: <TeamOutlined />,
        label: "Escalade vers l'équipe avec contexte",
      },
      {
        icon: <ShareAltOutlined />,
        label: 'Invitations de groupes et communautés',
      },
      {
        icon: <TagsOutlined />,
        label: 'Organisation avancée des contacts',
      },
      {
        icon: <ThunderboltOutlined />,
        label: 'Capacité renforcée pour le trafic',
      },
    ],
    includedLabel: '1 000 messages inclus / mois',
    monthlyPrice: 20,
    overageLabel: 'Puis 0,015 $ / message en plus',
    periodLabel: '/ mois',
  },
}

function formatEuro(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    currency: 'EUR',
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    style: 'currency',
  }).format(value)
}

function formatCompactEuro(value: number) {
  return `${value}€`
}

function getDurationLabel(duration: BillingDuration) {
  return duration === 1 ? '1 mois' : `${duration} mois`
}

function getDurationTotal(monthlyPrice: number, duration: BillingDuration) {
  return monthlyPrice * duration * (1 - DURATION_DISCOUNT[duration])
}

export function meta() {
  return [
    { title: 'Pricing - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Page de pricing WhatsApp Agent',
    },
  ]
}

export default function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDesktop, mobileMenuOpen, toggleNavigation } = useLayout()
  const [duration, setDuration] = useState<BillingDuration>(1)
  const currentPlan = useMemo(() => resolveCurrentPlanKey(user), [user])

  return (
    <div className='pricing-page relative min-h-screen bg-[#fafafa] text-[#111b21]'>
      {!isDesktop && (
        <button
          type='button'
          aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileMenuOpen}
          onClick={toggleNavigation}
          className='absolute left-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e8e8e8] bg-white text-[#111b21]'
        >
          {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      )}

      <div className='min-h-screen px-0 pb-8 pt-0'>
        <section className='pricing-top-grid h-[150px] px-4 pt-0 sm:px-6 lg:px-8'>
          <div className='flex h-full items-center justify-center'>
            <Segmented<BillingDuration>
              className='stats-granularity-toggle pricing-billing-toggle'
              shape='round'
              value={duration}
              options={BILLING_OPTIONS}
              onChange={value => setDuration(value)}
            />
          </div>
        </section>

        <section className='pricing-plan-grid'>
          {PLAN_ORDER.map(plan => {
            const content = PLAN_CONTENT[plan]
            const isCurrent = currentPlan === plan
            const isPaidPlan = plan !== 'free'
            const totalPrice = isPaidPlan
              ? getDurationTotal(content.monthlyPrice as number, duration)
              : null

            return (
              <article
                key={plan}
                className={`pricing-plan-card min-w-0 ${
                  plan === 'pro'
                    ? 'pricing-plan-card--pro'
                    : 'pricing-plan-card--default'
                }`}
              >
                {content.accentLabel && (
                  <div className='pointer-events-none absolute left-0 top-0 -translate-y-full'>
                    <span className='inline-flex h-10 items-center rounded-tr-[16px] bg-black px-4 text-[13px] font-medium text-white'>
                      {content.accentLabel}
                    </span>
                  </div>
                )}

                <div className='flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-7 sm:py-9'>
                  <div className='space-y-7'>
                    <div className='flex min-h-[60px] items-start justify-between gap-4'>
                      <h2 className='text-[34px] font-semibold tracking-tight text-[#111b21]'>
                        {plan === 'free'
                          ? 'Free'
                          : plan === 'pro'
                            ? 'Pro'
                            : 'Business'}
                      </h2>

                      {isCurrent ? (
                        <span className='inline-flex items-center whitespace-nowrap rounded-full bg-[#24d366] px-4 py-2 text-[12px] font-semibold text-[#111b21]'>
                          Plan actuel
                        </span>
                      ) : isPaidPlan ? (
                        <span className='inline-flex items-center whitespace-nowrap rounded-full bg-[#f0df9a] px-4 py-2 text-[12px] font-semibold text-[#3b3526]'>
                          -50% en ce moment
                        </span>
                      ) : null}
                    </div>

                    <p className='max-w-[30ch] text-[17px] leading-[1.5] text-[#6b7280]'>
                      {content.description}
                    </p>

                    <div className='space-y-3'>
                      <div className='flex items-baseline gap-3 text-[#111b21]'>
                        {plan === 'free' ? (
                          <>
                            <span className='text-[52px] font-semibold leading-none tracking-[-0.04em]'>
                              0€
                            </span>
                            <span className='text-[24px] leading-none text-[#6b7280]'>
                              {content.periodLabel}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className='text-[52px] font-semibold leading-none tracking-[-0.04em]'>
                              {formatCompactEuro(content.monthlyPrice as number)}
                            </span>
                            <span className='text-[24px] leading-none text-[#6b7280]'>
                              {content.periodLabel}
                            </span>
                          </>
                        )}
                      </div>

                      <div className='space-y-1'>
                        <p className='text-[14px] font-semibold text-[#111b21]'>
                          {content.includedLabel}
                        </p>
                        {content.overageLabel ? (
                          <p className='text-[14px] font-medium text-[#6b7280]'>
                            {content.overageLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className='space-y-4'>
                      <p className='text-[14px] font-medium text-[#5b6169]'>
                        {content.featureIntro}
                      </p>

                      <ul className='space-y-3 text-[14px] leading-[1.45] text-[#5b6169]'>
                        {content.features.map(feature => (
                          <li key={feature.label} className='flex gap-3'>
                            <span className='flex h-5 w-5 shrink-0 items-center justify-center text-[#111b21]'>
                              {feature.icon}
                            </span>
                            <span>{feature.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {isPaidPlan ? (
                    <div className='pt-2'>
                      <button
                        type='button'
                        className={`flex h-14 w-full items-center justify-center rounded-full px-6 text-[15px] font-medium transition-colors ${
                          content.ctaTone === 'dark'
                            ? 'bg-black text-white hover:bg-[#111]'
                            : 'bg-[#24d366] text-[#111b21] hover:bg-[#1fbe5a]'
                        }`}
                        onClick={() =>
                          navigate('/support', {
                            state: {
                              category: isCurrent ? 'question' : 'upgrade',
                              subject: isCurrent
                                ? `Questions sur mon plan ${plan === 'business' ? 'Business' : 'Pro'}`
                                : `Je souhaite passer au plan ${plan === 'business' ? 'Business' : 'Pro'}`,
                            },
                          })
                        }
                      >
                        {`Payer ${formatEuro(totalPrice as number)} pour ${getDurationLabel(duration)}`}
                      </button>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </article>
            )
          })}
        </section>

        <section className='pricing-payments-section px-5 py-8 sm:px-8'>
          <div className='flex flex-col items-center justify-center gap-5 text-center'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8390]'>
              Paiements acceptés
            </p>

            <div className='flex flex-wrap items-center justify-center gap-4'>
              {PAYMENT_METHODS.map(method => (
                <div
                  key={method.alt}
                  className='flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#d6d6d6] bg-white'
                >
                  <img
                    src={method.src}
                    alt={method.alt}
                    className='h-full w-full object-cover'
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
