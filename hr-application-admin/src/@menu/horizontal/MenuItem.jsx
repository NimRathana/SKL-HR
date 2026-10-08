'use client'

// React Imports
import { forwardRef, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import classnames from 'classnames'

// Component Imports
import MenuButton from './MenuButton'

// Hooks
import useHorizontalMenu from '../hooks/useHorizontalMenu'

// Utils
import { renderMenuIcon } from '../utils/menuUtils'
import { menuClasses } from '../utils/menuClasses'

// Styled Components
import StyledHorizontalMenuItem from './styles/StyledHorizontalMenuItem'
import StyledMenuLabel from '../styles/StyledMenuLabel'
import StyledMenuPrefix from '../styles/StyledMenuPrefix'
import StyledMenuSuffix from '../styles/StyledMenuSuffix'

const MenuItem = (props, ref) => {
  const {
    children,
    icon,
    className,
    prefix,
    suffix,
    level = 0,
    disabled = false,
    exactMatch = true,
    activeUrl,
    rootStyles,
    ...rest
  } = props

  const [active, setActive] = useState(false)
  const pathname = usePathname()

  // 2. Destructure renderExpandedMenuItemIcon or renderHorizontalMenuItemIcon
  const { 
    menuItemStyles, 
    renderExpandedMenuItemIcon, 
    renderHorizontalMenuItemIcon, 
    textTruncate 
  } = useHorizontalMenu()

  const getMenuItemStyles = (element) => {
    if (menuItemStyles?.[element]) {
      const params = { level, disabled, active, isSubmenu: false }
      const fn = menuItemStyles[element]
      return typeof fn === 'function' ? fn(params) : fn
    }
  }

  const buttonStyles = getMenuItemStyles('button')

  useEffect(() => {
    const href = rest.href
    if (href) {
      const isActive = exactMatch 
        ? pathname === href 
        : activeUrl && pathname.includes(activeUrl)
      setActive(isActive)
    }
  }, [pathname, rest.href, activeUrl, exactMatch])

  return (
    <StyledHorizontalMenuItem
      ref={ref}
      className={classnames(
        menuClasses.menuItemRoot, 
        { [menuClasses.active]: active, [menuClasses.disabled]: disabled }, 
        className
      )}
      menuItemStyles={getMenuItemStyles('root')}
      rootStyles={rootStyles}
      level={level}
    >
      <MenuButton
        className={classnames(menuClasses.button, { [menuClasses.active]: active })}
        tabIndex={disabled ? -1 : 0}
        level={level}
        disabled={disabled}
        buttonStyles={buttonStyles}
        {...rest}
      >
        {/* 4. Pass required properties to renderMenuIcon */}
        {renderMenuIcon({ 
          icon, 
          level,
          active, 
          disabled, 
          renderExpandedMenuItemIcon: renderExpandedMenuItemIcon || renderHorizontalMenuItemIcon,
          styles: getMenuItemStyles('icon') 
        })}

        {prefix && (
          <StyledMenuPrefix className={menuClasses.prefix} rootStyles={getMenuItemStyles('prefix')}>
            {prefix}
          </StyledMenuPrefix>
        )}

        <StyledMenuLabel 
          className={menuClasses.label} 
          rootStyles={getMenuItemStyles('label')} 
          textTruncate={textTruncate}
        >
          {children}
        </StyledMenuLabel>

        {suffix && (
          <StyledMenuSuffix className={menuClasses.suffix} rootStyles={getMenuItemStyles('suffix')}>
            {suffix}
          </StyledMenuSuffix>
        )}
      </MenuButton>
    </StyledHorizontalMenuItem>
  )
}

export default forwardRef(MenuItem)