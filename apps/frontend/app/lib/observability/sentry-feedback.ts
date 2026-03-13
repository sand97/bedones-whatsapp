const SENTRY_API_VERSION = '7'
const FEEDBACK_SDK_NAME = 'whatsapp-agent-frontend.feedback'
const FEEDBACK_SDK_VERSION = '1.0.0'

type SentryDsn = {
  host: string
  path: string
  projectId: string
  protocol: string
  publicKey: string
}

export interface SupportFeedbackContext {
  appArea?: string
  currentPlan?: string
  route?: string
  timezone?: string
  url?: string
  userId?: string
  contextScore?: string
}

export interface SendSupportFeedbackParams {
  category: string
  email: string
  message: string
  name: string
  subject?: string
  context?: SupportFeedbackContext
}

function parseDsn(rawDsn: string): SentryDsn | null {
  try {
    const url = new URL(rawDsn)
    const pathname = url.pathname.replace(/^\/+/, '')
    const pathSegments = pathname.split('/').filter(Boolean)
    const projectId = pathSegments.pop()

    if (!projectId || !url.username) {
      return null
    }

    return {
      host: url.host,
      path: pathSegments.join('/'),
      projectId,
      protocol: url.protocol,
      publicKey: url.username,
    }
  } catch {
    return null
  }
}

function buildEnvelopeEndpoint(dsn: SentryDsn) {
  const pathPrefix = dsn.path ? `/${dsn.path}` : ''
  const query = new URLSearchParams({
    sentry_client: `${FEEDBACK_SDK_NAME}/${FEEDBACK_SDK_VERSION}`,
    sentry_key: dsn.publicKey,
    sentry_version: SENTRY_API_VERSION,
  })

  return `${dsn.protocol}//${dsn.host}${pathPrefix}/api/${dsn.projectId}/envelope/?${query.toString()}`
}

function generateEventId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID().replace(/-/g, '')
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(
    0,
    32
  )
}

function buildEnvelope(eventId: string, payload: Record<string, unknown>) {
  const header = {
    event_id: eventId,
    sdk: {
      name: FEEDBACK_SDK_NAME,
      version: FEEDBACK_SDK_VERSION,
    },
    sent_at: new Date().toISOString(),
  }

  return `${JSON.stringify(header)}\n${JSON.stringify({ type: 'feedback' })}\n${JSON.stringify(payload)}`
}

export function getSentryFeedbackConfig() {
  const rawDsn = import.meta.env.VITE_SENTRY_DSN?.trim()

  if (!rawDsn) {
    return {
      enabled: false as const,
      reason: 'missing_dsn' as const,
    }
  }

  const parsed = parseDsn(rawDsn)

  if (!parsed) {
    return {
      enabled: false as const,
      reason: 'invalid_dsn' as const,
    }
  }

  return {
    enabled: true as const,
    dsn: parsed,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim(),
    release: import.meta.env.VITE_SENTRY_RELEASE?.trim(),
  }
}

export async function sendSupportFeedback({
  category,
  email,
  message,
  name,
  subject,
  context,
}: SendSupportFeedbackParams) {
  const config = getSentryFeedbackConfig()

  if (!config.enabled) {
    throw new Error(
      "La configuration Sentry frontend est absente. Renseignez VITE_SENTRY_DSN pour activer l'envoi."
    )
  }

  const eventId = generateEventId()
  const trimmedMessage = message.trim()
  const trimmedSubject = subject?.trim()
  const feedbackMessage = trimmedSubject
    ? `${trimmedSubject}\n\n${trimmedMessage}`
    : trimmedMessage
  const url =
    context?.url ||
    (typeof window !== 'undefined' ? window.location.href : undefined)

  const payload: Record<string, unknown> = {
    contexts: {
      app: {
        app_area: context?.appArea,
        context_score: context?.contextScore,
        current_plan: context?.currentPlan,
        route: context?.route,
        timezone: context?.timezone,
      },
      feedback: {
        contact_email: email,
        message: feedbackMessage,
        name,
        source: 'support-page',
        url,
      },
    },
    environment: config.environment,
    event_id: eventId,
    level: 'info',
    platform: 'javascript',
    release: config.release,
    request: url
      ? {
          url,
        }
      : undefined,
    tags: {
      app_area: context?.appArea || 'dashboard',
      category,
      current_plan: context?.currentPlan,
      feature: 'support-feedback',
    },
    timestamp: Math.floor(Date.now() / 1000),
    type: 'feedback',
    user: {
      email,
      id: context?.userId,
      username: name,
    },
  }

  const response = await fetch(buildEnvelopeEndpoint(config.dsn), {
    body: buildEnvelope(eventId, payload),
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Sentry a refuse le feedback (${response.status}).`)
  }

  return eventId
}
