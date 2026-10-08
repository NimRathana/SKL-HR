'use client'

import { useMemo } from 'react'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import { useSettings } from '@core/hooks/useSettings'
import ClientCacheProvider from './ClientCacheProvider'

const DirectionCacheProvider = ({ children }) => {
  const { settings } = useSettings()
  const direction = settings.direction || 'ltr'
  const cacheOptions = useMemo(
    () => ({
      prepend: true,
      key: direction === 'rtl' ? 'mui-rtl' : 'mui',
      stylisPlugins: direction === 'rtl' ? [prefixer, rtlPlugin] : []
    }),
    [direction]
  )

  return (
    <AppRouterCacheProvider key={direction} CacheProvider={ClientCacheProvider} options={cacheOptions}>
      {children}
    </AppRouterCacheProvider>
  )
}

export default DirectionCacheProvider
