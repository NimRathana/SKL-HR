'use client'

// Third-party Imports
import classnames from 'classnames'

// MUI Imports
import { Box } from '@mui/material'

// Component Imports
import Logo from '@components/layout/shared/Logo'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'
import TranslateDropdown from '@components/layout/shared/TranslateDropdown'
import NavToggle from '../horizontal/NavToggle'
import NotificationDropdown from '@components/layout/shared/NotificationDropdown'
import useHorizontalNav from "@menu/hooks/useHorizontalNav";

// Util Imports
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'
import themeConfig from '@configs/themeConfig'

const NavbarContent = () => {
  const { isBreakpointReached } = useHorizontalNav();
  return (
    <Box
      className={classnames(
        horizontalLayoutClasses.navbarContent,
        'flex items-center justify-between gap-4 is-full'
      )}
      sx={{
        paddingInline: `${themeConfig.layoutPadding}px`,
        transition: 'padding 0.3s ease',
        backgroundColor: 'transparent',
      }}
    >
      {/* LEFT: Logo & Search */}
      <div className='flex items-center gap-4 sm:gap-6'>
        <NavToggle />
        {!isBreakpointReached && <Logo />}
      </div>

      {/* RIGHT: System Utilities */}
      <div className='flex items-center'>
        <TranslateDropdown />
        <ModeDropdown />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </Box>
  )
}

export default NavbarContent