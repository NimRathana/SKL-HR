// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'
import TranslateDropdown from '@components/layout/shared/TranslateDropdown'
import NotificationDropdown from '@components/layout/shared/NotificationDropdown'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import themeConfig from '@configs/themeConfig'

const NavbarContent = ({ scrolled, isHorizontal }) => {
  return (
    <div 
      style={{
        paddingInline: isHorizontal ? `${themeConfig.layoutPadding}px` : scrolled ? `${themeConfig.layoutPadding}px` : '0',
        transition: 'padding 0.3s ease',
      }}
      className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full px-4 sm:px-6')}
    >
      <div className='flex items-center gap-2 sm:gap-4'>
        <NavToggle />
      </div>
      <div className='flex items-center'>
        <TranslateDropdown />
        <ModeDropdown />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
