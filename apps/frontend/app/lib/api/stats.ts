import apiClient from './client'

export interface DailyStatsPoint {
  day: string
  messages: number
  messagesHandled: number
  imageMessages: number
  imageMessagesHandled: number
  textMessages: number
  textMessagesHandled: number
  conversations: number
  tokens: number
}

export interface StatsAnalyticsRange {
  startDate: string
  endDate: string
  includesToday: boolean
  timezone: string
}

export interface StatsAnalyticsResponse {
  range: StatsAnalyticsRange
  generatedAt: string
  series: DailyStatsPoint[]
}

export interface StatsAnalyticsParams {
  startDate?: string
  endDate?: string
}

export async function getStatsAnalytics(
  params: StatsAnalyticsParams = {}
): Promise<StatsAnalyticsResponse> {
  const response = await apiClient.get<StatsAnalyticsResponse>(
    '/users/me/stats/analytics',
    {
      params,
    }
  )

  return response.data
}
