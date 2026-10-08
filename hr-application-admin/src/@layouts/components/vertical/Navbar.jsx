'use client'

import { useState, useEffect } from 'react'
import classnames from 'classnames'
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import StyledHeader from '@layouts/styles/vertical/StyledHeader'
import { useSettings } from '@core/hooks/useSettings'
import themeConfig from '@configs/themeConfig'

const Navbar = props => {
  const { children, overrideStyles } = props
  const { settings } = useSettings()
  const [scrolled, setScrolled] = useState(false)
  // Navbar config
  const navbarConfig = themeConfig.navbar || {}
  const isFixed = navbarConfig.type === 'fixed'
  const isFloating = navbarConfig.floating
  const isDetached = navbarConfig.detached
  const hasBlur = navbarConfig.blur
  // Content width (compact vs wide)
  const navbarContentWidth = settings.contentWidth || navbarConfig.contentWidth
  const isContentCompact = navbarContentWidth === 'compact'
  // Scroll detection for blur/shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <StyledHeader
      overrideStyles={overrideStyles}
      isContentCompact={isContentCompact}
      isFloating={isFloating}
      skin={settings.skin || 'default'}
      isBlur={hasBlur}
      scrolled={scrolled}
      isFixed={isFixed}
      isHorizontal={settings.layout == 'horizontal'}
      className={classnames(
        verticalLayoutClasses.header,
        isContentCompact ? verticalLayoutClasses.headerContentCompact : verticalLayoutClasses.headerContentWide,
        isDetached && verticalLayoutClasses.headerDetached,
        isFixed && verticalLayoutClasses.headerStatic,
      )}
      style={{
        position: isFixed ? 'sticky' : 'relative',
        top: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 1100,
        transition: 'all 0.3s ease',
      }}
    >
      <div className={classnames(verticalLayoutClasses.navbar, 'flex flex-col bs-full')}>{children}</div>
    </StyledHeader>
  )
}

export default Navbar
