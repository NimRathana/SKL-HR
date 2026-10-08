'use client'

// React Imports
import { useRef, useEffect, useState } from 'react'
import Link from '@/components/Link'
import { styled, useTheme } from '@mui/material/styles'
import VerticalNav, { NavHeader } from '@menu/vertical'
import VerticalMenu from './VerticalMenu'
import Logo from '@components/layout/shared/Logo'
import useVerticalNav from '@menu/hooks/useVerticalNav'
import navigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'
import { useSettings } from '@core/hooks/useSettings'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

const StyledBoxForShadow = styled('div')(({ theme }) => ({
  top: 60,
  left: -8,
  zIndex: 2,
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  width: 'calc(100% + 15px)',
  height: theme.mixins.toolbar.minHeight,
  transition: 'opacity .15s ease-in-out',
  background: `linear-gradient(var(--mui-palette-background-default) 5%, rgb(var(--mui-palette-background-defaultChannel) / 0.85) 30%, rgb(var(--mui-palette-background-defaultChannel) / 0.5) 65%, rgb(var(--mui-palette-background-defaultChannel) / 0.3) 75%, transparent)`,
  '&.scrolled': {
    opacity: 1
  }
}))

const Navigation = () => {
  // Hooks
  const theme = useTheme()
  const { isBreakpointReached, toggleVerticalNav, toggleCollapse, isCollapsed } = useVerticalNav()
  const { settings, updateSettings } = useSettings()

  // Refs
  const shadowRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const collapsedOverlay = isCollapsed && !isBreakpointReached
  const hoverExpanded = collapsedOverlay && hovered
  const effectiveCollapsed = isCollapsed && !hoverExpanded

  const scrollMenu = (container, isPerfectScrollbar) => {
    container = isBreakpointReached || !isPerfectScrollbar ? container.target : container

    if (shadowRef && container.scrollTop > 0) {
      // @ts-ignore
      if (!shadowRef.current.classList.contains('scrolled')) {
        // @ts-ignore
        shadowRef.current.classList.add('scrolled')
      }
    } else {
      // @ts-ignore
      shadowRef.current.classList.remove('scrolled')
    }
  }

  useEffect(() => {
    if (settings.layout === 'collapsed') {
      toggleCollapse(true)
    } else if (settings.layout === 'vertical') {
      toggleCollapse(false)
    }
  }, [settings.layout, toggleCollapse])

  // If horizontal, don't render vertical menu
  if (settings.layout === 'horizontal') return null

  return (
    <>
      {collapsedOverlay && <div aria-hidden="true" style={{ width: 64, minWidth: 64, flex: '0 0 64px' }} />}
      <VerticalNav
        customBreakpoint='800px'
        width={effectiveCollapsed ? 64 : 260}
        collapsedOverlay={collapsedOverlay}
        hoverExpanded={hoverExpanded}
        customStyles={navigationCustomStyles(theme, settings.skin, effectiveCollapsed, hoverExpanded)}
        onMouseEnter={() => setHovered(isCollapsed && !isBreakpointReached)}
        onMouseLeave={() => setHovered(false)}
      >
      {/* Nav Header including Logo & nav toggle icons  */}
      <NavHeader isCollapsed={effectiveCollapsed}>
        <Link href='/'>
          <Logo isCollapsed={effectiveCollapsed} />
        </Link>
        {!isBreakpointReached && !effectiveCollapsed && (
          <span
            role="button"
            tabIndex={0}
            style={{ display: 'flex', cursor: 'pointer', alignItems: 'center' }}
            onClick={() => {
              const newLayout = settings.layout === 'vertical' ? 'collapsed' : 'vertical'
              updateSettings({ layout: newLayout })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const newLayout = settings.layout === 'vertical' ? 'collapsed' : 'vertical'
                updateSettings({ layout: newLayout })
              }
            }}
          >
            {settings.layout === 'vertical' ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
          </span>
        )}
        {isBreakpointReached && <i className='ri-close-line text-xl' onClick={() => toggleVerticalNav(false)} />}
      </NavHeader>
      <StyledBoxForShadow ref={shadowRef} />
      <VerticalMenu scrollMenu={scrollMenu} isCollapsed={effectiveCollapsed} />
      </VerticalNav>
    </>
  )
}

export default Navigation
