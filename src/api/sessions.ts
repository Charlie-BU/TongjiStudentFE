import { requestJson } from './client'
import type {
  CreateSessionResponse,
  PingResponse,
  SessionMessagesResponse,
  SessionTaskPlanResponse,
} from './contracts'

export function ping(): Promise<PingResponse> {
  return requestJson<PingResponse>('/v1/ping')
}

export function createSession(
  accessToken?: string,
): Promise<CreateSessionResponse> {
  return requestJson<CreateSessionResponse>('/v1/sessions', {
    method: 'POST',
    accessToken,
  })
}

export function listSessionMessages(
  sessionId: string,
  options: { accessToken?: string; limit?: number } = {},
): Promise<SessionMessagesResponse> {
  const limit = options.limit ?? 20
  return requestJson<SessionMessagesResponse>(
    `/v1/sessions/${encodeURIComponent(sessionId)}/messages?limit=${limit}`,
    { accessToken: options.accessToken },
  )
}

export function getSessionTaskPlan(
  sessionId: string,
  accessToken?: string,
): Promise<SessionTaskPlanResponse> {
  return requestJson<SessionTaskPlanResponse>(
    `/v1/sessions/${encodeURIComponent(sessionId)}/task-plan`,
    { accessToken },
  )
}
