import { DashboardHeader } from '@app/components/layout'
import { useAuth } from '@app/hooks/useAuth'
import { resolveCurrentPlanKey } from '@app/lib/current-plan'
import { Segmented } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  BILLING_OPTIONS,
  CREDIT_FACTS,
  DURATION_DISCOUNT,
  PLAN_CONTENT,
  PLAN_ORDER,
  type BillingDuration,
} from '../components/pricing/constants'
import { CreditFactCard } from '../components/pricing/CreditFactCard'
import { PaymentMethodsSection } from '../components/pricing/PaymentMethodsSection'
import { PlanCard } from '../components/pricing/PlanCard'

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
  const [duration, setDuration] = useState<BillingDuration>(6)
  const currentPlan = useMemo(() => resolveCurrentPlanKey(user), [user])

  function getDiscountContent(selectedDuration: BillingDuration) {
    if (selectedDuration === 1) {
      return (
        <p className='m-0 flex h-[34px] items-center justify-center text-sm text-[var(--color-text-soft)]'>
          Sans réduction
        </p>
      )
    }

    const pct = Math.round(DURATION_DISCOUNT[selectedDuration] * 100)

    return (
      <div className='flex items-center justify-center gap-2'>
        <span className='text-sm text-[var(--color-text-secondary)]'>
          Profiter de
        </span>
        <span className='inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-full bg-[#24D366] px-2 text-sm font-bold text-black'>
          {pct}%
        </span>
        <span className='text-sm text-[var(--color-text-secondary)]'>
          de réduction pour {selectedDuration} mois
        </span>
      </div>
    )
  }

  const handleUpgrade = (planLabel: string) => {
    navigate('/support', {
      state: {
        category: 'upgrade',
        subject: `Je souhaite passer au plan ${planLabel}`,
      },
    })
  }

  return (
    <>
      <DashboardHeader title='Tarifs' />

      <div className='w-full space-y-8 px-4 py-5 sm:px-6 sm:py-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <Segmented<BillingDuration>
            className='pricing-billing-toggle stats-granularity-toggle'
            value={duration}
            options={BILLING_OPTIONS}
            onChange={value => setDuration(value)}
          />
          {getDiscountContent(duration)}
        </div>

        <div className='grid min-w-0 gap-4 md:flex md:items-stretch md:gap-0 md:-space-x-px'>
          {PLAN_ORDER.map((plan, index) => (
            <PlanCard
              key={plan}
              planKey={plan}
              config={PLAN_CONTENT[plan]}
              isCurrent={currentPlan === plan}
              duration={duration}
              onUpgrade={handleUpgrade}
              isFirst={index === 0}
              isLast={index === PLAN_ORDER.length - 1}
            />
          ))}
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          {CREDIT_FACTS.map(fact => (
            <CreditFactCard key={fact.title} fact={fact} />
          ))}
        </div>

        <PaymentMethodsSection />
      </div>
    </>
  )
}
