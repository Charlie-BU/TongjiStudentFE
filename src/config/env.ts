const DEFAULT_API_BASE_URL = '/api'
const DEFAULT_OAUTH_CALLBACK_PATH = '/wallbreakerAuth/callback.html'

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, '')
  return normalized || DEFAULT_API_BASE_URL
}

function normalizePath(value: string): string {
  const normalized = value.trim()
  if (!normalized) {
    return DEFAULT_OAUTH_CALLBACK_PATH
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export const appConfig = Object.freeze({
  apiBaseUrl: normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  ),
  oauthCallbackPath: normalizePath(
    import.meta.env.VITE_OAUTH_CALLBACK_PATH ?? DEFAULT_OAUTH_CALLBACK_PATH,
  ),
})

export function isOAuthCallbackPath(pathname = window.location.pathname): boolean {
  return pathname === appConfig.oauthCallbackPath
}
