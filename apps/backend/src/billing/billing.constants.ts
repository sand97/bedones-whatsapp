import {
  BillingPaymentMethod,
  BillingProvider,
  SubscriptionTier,
} from '@app/generated/client';

export type BillingPlanKey = 'pro' | 'business';
export type BillingDuration = 1 | 6 | 12;

type BillingPlanDefinition = {
  label: string;
  monthlyCredits: number;
  monthlyPriceUsd: number;
  monthlyPriceXaf: number;
  tier: SubscriptionTier;
};

export const BILLING_DURATION_DISCOUNT: Record<BillingDuration, number> = {
  1: 0,
  6: 0.2,
  12: 0.25,
};

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlanDefinition> = {
  pro: {
    label: 'Pro',
    monthlyCredits: 1000,
    monthlyPriceUsd: 10,
    monthlyPriceXaf: 6200,
    tier: SubscriptionTier.PRO,
  },
  business: {
    label: 'Business',
    monthlyCredits: 3000,
    monthlyPriceUsd: 25,
    monthlyPriceXaf: 15500,
    tier: SubscriptionTier.ENTERPRISE,
  },
};

export function isBillingPlanKey(value: string): value is BillingPlanKey {
  return value === 'pro' || value === 'business';
}

export function isBillingDuration(value: number): value is BillingDuration {
  return value === 1 || value === 6 || value === 12;
}

export function getBillingPlanDefinition(planKey: BillingPlanKey) {
  return BILLING_PLANS[planKey];
}

export function getMonthlyCreditsForTier(tier: SubscriptionTier) {
  return Object.values(BILLING_PLANS).find((plan) => plan.tier === tier)
    ?.monthlyCredits;
}

export function computeCheckoutPricing(
  planKey: BillingPlanKey,
  durationMonths: BillingDuration,
  paymentMethod: BillingPaymentMethod,
) {
  const plan = getBillingPlanDefinition(planKey);
  const discountMultiplier = 1 - BILLING_DURATION_DISCOUNT[durationMonths];
  const totalUsd = Number(
    (plan.monthlyPriceUsd * durationMonths * discountMultiplier).toFixed(2),
  );
  const totalXaf = Math.round(
    plan.monthlyPriceXaf * durationMonths * discountMultiplier,
  );

  return {
    amount: paymentMethod === BillingPaymentMethod.CARD ? totalUsd : totalXaf,
    amountInSmallestUnit:
      paymentMethod === BillingPaymentMethod.CARD
        ? Math.round(totalUsd * 100)
        : totalXaf,
    creditsAmount: plan.monthlyCredits * durationMonths,
    currency: paymentMethod === BillingPaymentMethod.CARD ? 'USD' : 'XAF',
    description: `${plan.label} - ${durationMonths} mois`,
    label: plan.label,
    provider:
      paymentMethod === BillingPaymentMethod.CARD
        ? BillingProvider.STRIPE
        : BillingProvider.NOTCH_PAY,
    tier: plan.tier,
  };
}
