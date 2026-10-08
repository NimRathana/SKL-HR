'use client'
// React Imports
import { forwardRef } from 'react'

// Third-party Imports
import { css } from '@emotion/react'

// Component Imports
import { RouterLink } from '../components/RouterLink'  

// Util Imports
import { menuClasses } from '../utils/menuClasses'

// Horizontal MenuButton styles
export const menuButtonStyles = props => {
  const { level, disabled } = props

  return css({
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease-in-out',

    '&:hover, &[aria-expanded="true"]': {
      backgroundColor: 'var(--mui-palette-action-hover)'
    },
    '&:focus-visible': {
      outline: 'none',
      backgroundColor: 'var(--mui-palette-action-hover)'
    },
    ...(disabled && {
      pointerEvents: 'none',
      cursor: 'default',
      opacity: 0.5
    }),
  })
}

const MenuButton = ({ className, children, buttonStyles, ...rest }, ref) => {
  const { active, level, disabled, href, ...other } = rest
  const buttonClassName = `${className || ''} ${active ? menuClasses.active : ''}`.trim()

  return href ? (
    <RouterLink
      ref={ref}
      className={buttonClassName}
      href={href}
      css={[menuButtonStyles({ level, disabled }), buttonStyles]}
      {...other}
    >
      {children}
    </RouterLink>
  ) : (
    <a
      ref={ref}
      className={buttonClassName}
      css={[menuButtonStyles({ level, disabled }), buttonStyles]}
      {...other}
    >
      {children}
    </a>
  )
}

export default forwardRef(MenuButton)