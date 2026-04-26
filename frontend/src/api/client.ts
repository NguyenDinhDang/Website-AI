/**
 * Centralized API client
 * - Auto-attach Bearer token
 * - Auto-refresh on 401
 * - Throws Error with Vietnamese message
 */

const BASE_URL = '/api/v1'

function getAccessToken() {
  return localStorage.getItem('access_token') || ''
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token') || ''
}

function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!response.ok) return false
    const tokenData = await response.json()
    saveTokens(tokenData.access_token, tokenData.refresh_token)
    return true
  } catch {
    return false
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const errorBody = await response.json()
    return errorBody.detail || `Lỗi ${response.status}`
  } catch {
    return `Lỗi ${response.status}`
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<T> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (requireAuth) {
    requestHeaders['Authorization'] = `Bearer ${getAccessToken()}`
  }

  let response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  })

  // Token expired — try refresh once
  if (response.status === 401 && requireAuth) {
    const refreshSucceeded = await tryRefreshAccessToken()
    if (refreshSucceeded) {
      requestHeaders['Authorization'] = `Bearer ${getAccessToken()}`
      response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: requestHeaders,
      })
    } else {
      clearTokens()
      window.location.reload()
      throw new Error('Phiên đăng nhập hết hạn')
    }
  }

  if (response.status === 204) return null as T

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response)
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}

export const apiGet  = <T>(path: string) => apiFetch<T>(path, { method: 'GET' })
export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' })

export { saveTokens, clearTokens }