import apiClient from './client'

export type StatusScheduleContentType = 'TEXT' | 'IMAGE' | 'VIDEO'
export type StatusScheduleState =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED'

export interface StatusSchedule {
  id: string
  userId: string
  scheduledFor: string
  scheduledDay: string
  timezone: string
  contentType: StatusScheduleContentType
  textContent: string | null
  caption: string | null
  mediaUrl: string | null
  status: StatusScheduleState
  attempts: number
  lastError: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StatusScheduleRangeParams {
  startDate?: string
  endDate?: string
}

export interface CreateStatusSchedulePayload {
  scheduledFor: string
  timezone: string
  contentType: StatusScheduleContentType
  textContent?: string
  caption?: string
  mediaUrl?: string
}

export interface UpdateStatusSchedulePayload
  extends Partial<CreateStatusSchedulePayload> {}

export async function getStatusSchedules(
  params: StatusScheduleRangeParams = {}
): Promise<StatusSchedule[]> {
  const response = await apiClient.get<StatusSchedule[]>(
    '/users/me/status-schedules',
    {
      params,
    }
  )

  return response.data
}

export async function createStatusSchedule(
  payload: CreateStatusSchedulePayload
): Promise<StatusSchedule> {
  const response = await apiClient.post<StatusSchedule>(
    '/users/me/status-schedules',
    payload
  )

  return response.data
}

export async function updateStatusSchedule(
  scheduleId: string,
  payload: UpdateStatusSchedulePayload
): Promise<StatusSchedule> {
  const response = await apiClient.patch<StatusSchedule>(
    `/users/me/status-schedules/${scheduleId}`,
    payload
  )

  return response.data
}

export async function cancelStatusSchedule(
  scheduleId: string
): Promise<StatusSchedule> {
  const response = await apiClient.delete<StatusSchedule>(
    `/users/me/status-schedules/${scheduleId}`
  )

  return response.data
}
