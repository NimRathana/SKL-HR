export const GLOBAL_NOTIFICATION_EVENT = 'app:global-notification'
export const ERROR_NOTIFICATION_EVENT = 'app:error-notification'

const NOTIFICATION_SEVERITIES = ['error', 'success', 'info', 'warning']

export const notifyGlobal = (message, severity = 'info') => {
  if (typeof window === 'undefined' || !message) return

  window.dispatchEvent(new CustomEvent(GLOBAL_NOTIFICATION_EVENT, {
    detail: {
      message: String(message),
      severity: NOTIFICATION_SEVERITIES.includes(severity) ? severity : 'info'
    }
  }))
}

export const getApiErrorMessage = error => {
  const detail = error?.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail
      .map(item => typeof item === 'string' ? item : item?.msg)
      .filter(Boolean)
      .join(', ')
  }

  if (typeof detail === 'string') return detail
  if (detail && typeof detail.message === 'string') return detail.message
  if (typeof error?.message === 'string') return error.message

  return 'Something went wrong. Please try again.'
}

export const notifyApiError = error => {
  notifyGlobal(getApiErrorMessage(error), 'error')
}
