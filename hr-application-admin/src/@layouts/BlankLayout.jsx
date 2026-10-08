'use client'

// Third-party Imports
import { useState, useEffect } from 'react'
import classnames from 'classnames'

// Util Imports
import { blankLayoutClasses } from './utils/layoutClasses'

const BlankLayout = ({ children }) => {
  const [mounted, setMounted] = useState(false)

  // Mark as mounted only on the client
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null // prevent server/client mismatch

  return (
    <div className={classnames(blankLayoutClasses.root, 'is-full bs-full')}>
      {children}
    </div>
  )
}

export default BlankLayout