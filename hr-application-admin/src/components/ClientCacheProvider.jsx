'use client'

import { CacheProvider } from '@emotion/react'

const ClientCacheProvider = ({ value, children }) => {
  return <CacheProvider value={value}>{children}</CacheProvider>
}

export default ClientCacheProvider
