'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthCookies, getApi } from '@core/api'
import { useSettings } from '@core/hooks/useSettings'

let verifiedToken = null
let verificationPromise = null
let verificationToken = null

const getAuthToken = () => document.cookie.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith('authToken='))

const AuthGuard = ({ children }) => {
  const router = useRouter()
  const { hydrateSettings } = useSettings()
  const hydrateSettingsRef = useRef(hydrateSettings)
  hydrateSettingsRef.current = hydrateSettings
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    const verifyToken = async () => {
      try {
        const token = getAuthToken()

        if (!token) {
          verifiedToken = null
          verificationPromise = null
          verificationToken = null
          clearAuthCookies()
          router.replace('/login')
          return
        }

        if (verifiedToken !== token) {
          if (!verificationPromise || verificationToken !== token) {
            verificationToken = token
            verificationPromise = (async () => {
              const api = await getApi()
              const { data } = await api.get('/auth/me')
              if (data?.role) sessionStorage.setItem('authRole', data.role)
              if (data?.status) sessionStorage.setItem('authStatus', data.status)
              verifiedToken = token
            })().catch(error => {
              verificationPromise = null
              verificationToken = null
              throw error
            })
          }

          await verificationPromise
        }

        let savedThemeSettings = {}
        let shouldHydrateSettings = false
        try {
          const api = await getApi()
          const { data: profile } = await api.get('/users/profile')
          const hasPreferences = Object.prototype.hasOwnProperty.call(profile || {}, 'user_preferences')
          const storageAvailable = profile?.user_preferences_available === true
            || (profile?.user_preferences_available === undefined && hasPreferences)
          if (storageAvailable) {
            shouldHydrateSettings = true
            const themeSettings = profile?.user_preferences?.theme
            if (themeSettings && typeof themeSettings === 'object' && !Array.isArray(themeSettings)) {
              savedThemeSettings = themeSettings
            }
          }
        } catch {
          shouldHydrateSettings = false
        }

        if (active) {
          if (shouldHydrateSettings) hydrateSettingsRef.current(savedThemeSettings)
          setChecking(false)
        }
      } catch {
        verifiedToken = null
        verificationPromise = null
        verificationToken = null
        clearAuthCookies()
        router.replace('/login')
      }
    }

    verifyToken()
    return () => {
      active = false
    }
  }, [router])

  if (checking) return null

  return children
}

export default AuthGuard
