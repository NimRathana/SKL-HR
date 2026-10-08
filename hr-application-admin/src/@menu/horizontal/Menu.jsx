'use client'

import { createContext, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import classnames from 'classnames'

import { menuClasses } from '../utils/menuClasses'
import StyledHorizontalMenu from './styles/StyledHorizontalMenu'
import styles from '../styles/styles.module.css'

export const HorizontalMenuContext = createContext({})

const Menu = (props, ref) => {
  const {
    children,
    className,
    rootStyles,
    menuItemStyles,
    renderExpandIcon,
    menuSectionStyles,
    subMenuOpenBehavior = 'hover', // hover | click
    transitionDuration = 200,
    textTruncate = true,
    ...rest
  } = props

  const [openSubmenu, setOpenSubmenu] = useState([])
  const openSubmenusRef = useRef([])
  const pathname = usePathname()

  const toggleOpenSubmenu = useCallback((...submenus) => {
    if (!submenus.length) return
    const copy = [...openSubmenu]

    submenus.forEach(({ id, active = false }) => {
      const index = copy.findIndex(item => item.id === id)
      if (index >= 0) {
        copy.splice(index, 1)
      } else {
        copy.push({ id, active })
      }
    })

    setOpenSubmenu(copy)
  }, [openSubmenu])

  useEffect(() => {
    setOpenSubmenu([...openSubmenusRef.current])
    openSubmenusRef.current = []
  }, [pathname])

  const providerValue = useMemo(() => ({
    transitionDuration,
    menuItemStyles,
    menuSectionStyles,
    renderExpandIcon,
    openSubmenu,
    openSubmenusRef,
    toggleOpenSubmenu,
    subMenuOpenBehavior,
    textTruncate,
  }), [
    transitionDuration,
    menuItemStyles,
    menuSectionStyles,
    renderExpandIcon,
    openSubmenu,
    toggleOpenSubmenu,
    subMenuOpenBehavior,
    textTruncate,
  ])

  return (
    <HorizontalMenuContext.Provider value={providerValue}>
      <StyledHorizontalMenu
        ref={ref}
        className={classnames(menuClasses.root, className)}
        rootStyles={rootStyles}
        {...rest}
      >
        <ul className={styles.ul}>{children}</ul>
      </StyledHorizontalMenu>
    </HorizontalMenuContext.Provider>
  )
}

export default forwardRef(Menu)