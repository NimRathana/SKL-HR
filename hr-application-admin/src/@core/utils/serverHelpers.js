import 'server-only'

// Next Imports
import { cookies } from 'next/headers'

// Config Imports
import themeConfig from '@configs/themeConfig'

// ✅ Safe JSON parser (prevents crash if cookie is corrupted)
/**
 * @param {string} value
 * @returns {object}
 */
const safeParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

// ✅ Get settings from cookies (ASYNC)
export const getSettingsFromCookie = async () => {
  const cookieStore = await cookies()
  const cookieName = themeConfig.settingsCookieName

  const cookieValue = cookieStore.get(cookieName)?.value || '{}'

  return safeParse(cookieValue)
}

// ✅ Get mode
export const getMode = async () => {
  const settingsCookie = await getSettingsFromCookie()

  return settingsCookie.mode || themeConfig.mode
}

// ✅ System mode (same for now, but ready for extension)
export const getSystemMode = async () => {
  return await getMode()
}

// ✅ Server mode (same logic, clean reuse)
export const getServerMode = async () => {
  return await getMode()
}