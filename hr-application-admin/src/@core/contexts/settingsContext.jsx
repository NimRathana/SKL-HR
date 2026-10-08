'use client'
import { createContext, useMemo, useRef, useState } from 'react'

// Config Imports
import themeConfig from '@configs/themeConfig'
import { getApi } from '@core/api'

// Hook Imports
import { useObjectCookie } from '@core/hooks/useObjectCookie'

// Initial Settings Context
export const SettingsContext = createContext(null)

// Settings Provider
export const SettingsProvider = props => {
  // Initial Settings
  const initialSettings = {
    mode: themeConfig.mode,
    primaryColor: themeConfig.primaryColor,
    skin: themeConfig.skin,
    layout: themeConfig.layout,
    contentWidth: themeConfig.contentWidth,
    direction: themeConfig.direction
  };

  const updatedInitialSettings = {
    ...initialSettings,
    mode: props.mode || themeConfig.mode
  }

  // Cookies
  const [settingsCookie, updateSettingsCookie] = useObjectCookie(
    themeConfig.settingsCookieName,
    JSON.stringify(props.settingsCookie) !== '{}' ? props.settingsCookie : updatedInitialSettings
  )

  // State
  const [_settingsState, _updateSettingsState] = useState(
    JSON.stringify(settingsCookie) !== '{}' ? settingsCookie : updatedInitialSettings
  )
  const preferencesSaveQueue = useRef(Promise.resolve())

  const updateSettings = (settings, options) => {
    const { updateCookie = true, persist = updateCookie } = options || {}

    _updateSettingsState(prev => {
      const newSettings = { ...prev, ...settings }

      // Update cookie if needed
      if (updateCookie) updateSettingsCookie(newSettings)

      return newSettings
    })

    if (updateCookie && persist) {
      preferencesSaveQueue.current = preferencesSaveQueue.current
        .catch(() => {})
        .then(async () => {
          const api = await getApi()
          await api.patch('/users/profile/preferences', {
            user_preferences: { theme: settings }
          })
        })
        .catch(() => {})
    }
  }

  const hydrateSettings = savedSettings => {
    const savedValues = savedSettings && typeof savedSettings === 'object' && !Array.isArray(savedSettings)
      ? savedSettings
      : {}
    const hydratedSettings = { ...initialSettings }
    Object.entries(savedValues).forEach(([key, value]) => {
      if (value !== null && value !== undefined) hydratedSettings[key] = value
    })
    _updateSettingsState(hydratedSettings)
    updateSettingsCookie(hydratedSettings)
  }

  /**
   * Updates the settings for page with the provided settings object.
   * Updated settings won't be saved to cookie hence will be reverted once navigating away from the page.
   *
   * @param settings - The partial settings object containing the properties to update.
   * @returns A function to reset the page settings.
   *
   * @example
   * useEffect(() => {
   *     return updatePageSettings({ theme: 'dark' });
   * }, []);
   */
  const updatePageSettings = settings => {
    updateSettings(settings, { updateCookie: false })

    // Returns a function to reset the page settings
    return () => updateSettings(settingsCookie, { updateCookie: false })
  }

  const resetSettings = () => {
    updateSettings(initialSettings)
  }

  const isSettingsChanged = useMemo(
    () => JSON.stringify(initialSettings) !== JSON.stringify(_settingsState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_settingsState]
  )

  return (
    <SettingsContext.Provider
      value={{
        settings: _settingsState,
        updateSettings,
        hydrateSettings,
        isSettingsChanged,
        resetSettings,
        updatePageSettings
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  )
}
