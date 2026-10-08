'use client'

import { useMemo, useState, useEffect } from 'react'
import { ThemeProvider, extendTheme, lighten, darken } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import ModeChanger from './ModeChanger'
import { useSettings } from '@core/hooks/useSettings'
import defaultCoreTheme from '@core/theme'
import primaryColorConfig from '@configs/primaryColorConfig'
import { I18nextProvider } from 'react-i18next';
import i18n from '@configs/i18n';

const CustomThemeProvider = ({ children }) => {
  const { settings } = useSettings()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('dir', settings.direction || 'ltr')
  }, [settings.direction])

  const theme = useMemo(() => {
    const coreTheme = defaultCoreTheme(settings.mode || 'light', settings.direction || 'ltr', settings.skin || 'default')
    const mainColor = settings.primaryColor || primaryColorConfig[0].main

    const primaryPalette = {
      main: mainColor,
      light: lighten(mainColor, 0.2),
      dark: darken(mainColor, 0.1),
    };

    return extendTheme({
      ...coreTheme,
      colorSchemes: {
        ...coreTheme.colorSchemes,
        light: {
          palette: {
            ...coreTheme.colorSchemes?.light?.palette,
            primary: primaryPalette,
          }
        },
        dark: {
          palette: {
            ...coreTheme.colorSchemes?.dark?.palette,
            primary: primaryPalette,
          }
        }
      },
      colorSchemeSelector: 'class'
    })
  }, [settings.primaryColor, settings.skin, settings.mode, settings.direction])

  useEffect(() => {
    setLoading(false)
  }, [theme])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ModeChanger />
      <I18nextProvider i18n={i18n}>
        {!loading && children}
      </I18nextProvider>
    </ThemeProvider>
  )
}

export default CustomThemeProvider