import { appConfig } from '../config/env'
import type { ApiErrorPayload } from './contracts'

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  accessToken?: string
  headers?: HeadersInit
}

export class ApiError extends Error {
  readonly status: number
  readonly requestId: string | null

  constructor(message: string, status: number, requestId: string | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appConfig.apiBaseUrl}${normalizedPath}`
}

export function createHeaders(options: RequestOptions = {}): Headers {
  const headers = new Headers(options.headers)
  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`)
  }
  return headers
}

export async function apiFetch(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const requestInit: RequestOptions = { ...options }
  delete requestInit.accessToken
  return fetch(apiUrl(path), {
    ...requestInit,
    headers: createHeaders(options),
  })
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await apiFetch(path, options)
  if (!response.ok) {
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`
  try {
    const payload = (await response.json()) as Partial<ApiErrorPayload>
    if (typeof payload.error === 'string' && payload.error.trim()) {
      message = payload.error
    }
  } catch {
    // 非 JSON 错误响应使用稳定的 HTTP 状态兜底文案。
  }
  return new ApiError(
    message,
    response.status,
    response.headers.get('X-Request-ID'),
  )
}
