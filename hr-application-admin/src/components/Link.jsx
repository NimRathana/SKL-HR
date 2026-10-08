'use client'

import { forwardRef } from 'react'
import NextLink from 'next/link'

const Link = (props, ref) => {
  const { href, onClick, ...rest } = props

  return (
    <NextLink
      ref={ref}
      {...rest}
      href={href || '/'}
      onClick={
        onClick
          ? (e) => onClick(e)
          : !href
          ? (e) => e.preventDefault()
          : undefined
      }
    />
  )
}

export default forwardRef(Link)