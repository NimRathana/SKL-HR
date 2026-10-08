'use client'

// Third-party Imports
import classnames from 'classnames'
import styled from '@emotion/styled'

// MUI Imports
import { Box } from '@mui/material'

// Core & Config Imports
import { useSettings } from '@core/hooks/useSettings'
import themeConfig from '@configs/themeConfig'

// Util Imports
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

const StyledNavbarContent = styled.div`
  width: 100%;
  ${({ isContentCompact }) =>
    isContentCompact &&
    `
    margin-inline: auto;
    max-inline-size: ${themeConfig.compactContentWidth}px;
  `}
`

const Navbar = props => {
  const { children } = props
  const { settings } = useSettings()

  // Navbar configuration fallback
  const navbarConfig = themeConfig.navbar || {}

  // Content width alignment (compact vs wide)
  const navbarContentWidth = settings.contentWidth || navbarConfig.contentWidth
  const isContentCompact = navbarContentWidth === 'compact'

  return (
    <Box
      component="div"
      className={classnames(horizontalLayoutClasses.navbar)}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: 1100,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Replaced the standard HTML div with our Styled Component.
        By forwarding isContentCompact directly as a prop, Emotion 
        can calculate the exact compact width constraint dynamically!
      */}
      <StyledNavbarContent
        isContentCompact={isContentCompact}
        className={classnames(
          horizontalLayoutClasses.navbarContent,
          'w-full flex items-center justify-between px-6'
        )}
        style={{ minHeight: 'var(--header-height)' }}
      >
        {children}
      </StyledNavbarContent>
    </Box>
  )
}

export default Navbar