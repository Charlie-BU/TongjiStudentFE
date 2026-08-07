import { apiUrl, requestJson } from './client'
import type { OAuthTokenRequest, OAuthTokenResponse } from './contracts'

export function getAuthorizeUrl(): string {
  return apiUrl('/v1/tongji/oauth/authorize')
}

export function redirectToTongjiAuthorize(): void {
  window.location.assign(getAuthorizeUrl())
}

export function exchangeOAuthToken(
  request: OAuthTokenRequest,
): Promise<OAuthTokenResponse> {
  return requestJson<OAuthTokenResponse>('/v1/tongji/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
}
