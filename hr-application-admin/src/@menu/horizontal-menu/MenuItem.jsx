'use client'

import React from 'react'
import classnames from 'classnames'
import Link from '@/components/Link'

const MenuItem = ({ href = '#', children, className, onClick, target, rel, ...rest }) => {
  const content = (
    <a
      href={href}
      className={classnames('materio-horizontal-menuitem', className)}
      onClick={onClick}
      target={target}
      rel={rel}
      {...rest}
    >
      {children}
    </a>
  )

  // If the project uses a Link component, try to use it for client-side navigation
  try {
    return href && href.startsWith('/') ? <Link href={href}>{content}</Link> : content
  } catch (e) {
    return content
  }
}

export default MenuItem
