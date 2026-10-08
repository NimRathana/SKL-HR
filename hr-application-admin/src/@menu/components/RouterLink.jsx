'use client'

// React Imports
import { forwardRef } from 'react'

// Next Imports
import Link from '@/components/Link'

export const RouterLink = forwardRef((props, ref) => {
  // Props
  const { href, className, ...other } = props

  return (
    <Link ref={ref} href={href} className={className} {...other}>
      {props.children}
    </Link>
  )
})
