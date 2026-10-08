import axios from 'axios'
import { notifyApiError } from './notifications'

let apiInstance = null
export const DEFAULT_MAX_AGE = 60 * 60 * 24 // 1 day
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
export const REFRESH_BEFORE_SECONDS = 15 * 60 // proactively refresh when <= 15 minutes left
let refreshPromise = null
const PUBLIC_API_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/register/verify',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/users/invite/verify',
  '/subscriptions/checkout',
  '/subscriptions/checkout/complete'
]

export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const messages = detail
      .map(item => {
        if (typeof item === 'string') return item

        const message = item?.msg
        const location = Array.isArray(item?.loc) ? item.loc : []
        const isPasswordError = location.includes('password')

        return message && isPasswordError ? `Password: ${message}` : message
      })
      .filter(Boolean)

    if (messages.length) return messages.join('. ')
  }

  if (detail && typeof detail === 'object' && detail.msg) return detail.msg

  return error?.message || fallback
}

async function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL
}

function normalizeApiUrl(value) {
  const url = String(value || '').trim()
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured')
  }

  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `http://${url}`
  const allowInsecureHttp = process.env.NEXT_PUBLIC_ALLOW_INSECURE_HTTP === 'true'

  if (process.env.NODE_ENV === 'production' && !normalizedUrl.startsWith('https://') && !allowInsecureHttp) {
    throw new Error('A secure HTTPS API URL is required in production')
  }

  return normalizedUrl
}

function getCookie(name) {
  if (typeof document === 'undefined') return null

  const cookie = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))

  if (!cookie) return null

  try {
    return decodeURIComponent(cookie.slice(name.length + 1))
  } catch {
    return null
  }
}

export function clearAuthCookies() {
  if (typeof document === 'undefined') return

  document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax'
  document.cookie = 'authPersistent=; Path=/; Max-Age=0; SameSite=Lax'
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('authStatus')
    sessionStorage.removeItem('authRole')
  }
}

export function setAuthCookie(token, remember = false) {
  const payload = decodeJwtPayload(token)
  const tokenExpiresAt = payload && typeof payload.exp === 'number' ? payload.exp * 1000 : null
  const maxAge = tokenExpiresAt ? Math.max(1, Math.ceil((tokenExpiresAt - Date.now()) / 1000)) : remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString()
  const secureAttribute = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `authToken=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; Expires=${expires}; SameSite=Lax${secureAttribute}`
  document.cookie = `authPersistent=${remember ? '1' : '0'}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureAttribute}`
}

export function getAuthToken() {
  return getCookie('authToken')
}

function redirectToLogin() {
  if (typeof window === 'undefined') return

  const pathname = window.location.pathname || ''
  if (pathname === '/login') return

  window.location.href = '/login'
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return false

  return payload.exp * 1000 <= Date.now()
}

function isPublicApiRequest(config) {
  const url = (config?.url || '').trim()
  if (!url) return false

  const method = (config?.method || 'get').toLowerCase()
  if (url.endsWith('/plans') || url.endsWith('/plan-types')) {
    return method === 'get' && !config?.params?.include_inactive
  }

  return PUBLIC_API_ENDPOINTS.some(endpoint => {
    if (url === endpoint) return true
    return url.endsWith(endpoint)
  })
}

export function isReadOnlyInactiveAccount() {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem('authStatus') === 'inactive'
}

function isLoginRequest(config) {
  const url = (config?.url || '').trim()
  return url === '/auth/login' || url.endsWith('/auth/login') || url === '/user/login' || url.endsWith('/user/login')
}

function tokenExpiresWithin(token, seconds) {
  const payload = decodeJwtPayload(token)

  return Boolean(payload && typeof payload.exp === 'number' && payload.exp * 1000 - Date.now() <= seconds * 1000)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const currentToken = getCookie('authToken')
      if (!currentToken) {
        throw new Error('Authentication token is missing')
      }

      const baseUrl = normalizeApiUrl(await getApiUrl())
      const { data } = await axios.post(
        `${baseUrl}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${currentToken}` }
        }
      )

      if (!data?.access_token) {
        throw new Error('Refresh response did not contain an access token')
      }

      setAuthCookie(data.access_token, getCookie('authPersistent') === '1')
      return data.access_token
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

function addAuthInterceptor(instance) {
  instance.interceptors.request.use(async config => {
    if (isLoginRequest(config)) {
      return config
    }

    if (isReadOnlyInactiveAccount() && !['get', 'head', 'options'].includes((config?.method || 'get').toLowerCase())) {
      return Promise.reject(new Error('This account is inactive and can only view data.'))
    }

    if (isPublicApiRequest(config)) {
      return config
    }

    const token = getCookie('authToken')

    if (!token) {
      redirectToLogin()
      clearAuthCookies()
      return Promise.reject(new Error('Authentication token is missing'))
    }

    if (isTokenExpired(token)) {
      redirectToLogin()
      clearAuthCookies()
      return Promise.reject(new Error('Authentication token has expired'))
    }

    if (tokenExpiresWithin(token, REFRESH_BEFORE_SECONDS)) {
      try {
        await refreshAccessToken()
      } catch (error) {
        clearAuthCookies()
        redirectToLogin()
        return Promise.reject(error)
      }
    }

    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  instance.interceptors.response.use(response => response, error => {
    const status = error?.response?.status
    const isPublicRequest = isPublicApiRequest(error?.config)

    if (status === 401 && !isPublicRequest) {
      clearAuthCookies()
      redirectToLogin()
    }
    if (status !== 401 && !isPublicRequest && !error?.config?.suppressGlobalErrorNotification) {
      notifyApiError(error)
    }

    return Promise.reject(error)
  })

  return instance
}

export async function getApi() {
  if (apiInstance) return apiInstance

  apiInstance = addAuthInterceptor(
    axios.create({
      baseURL: normalizeApiUrl(await getApiUrl()),
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    })
  )

  return apiInstance
}

export const apiClient = addAuthInterceptor(
  axios.create({
    baseURL: normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL),
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
  })
)

export default apiClient
