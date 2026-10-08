// MUI Imports
import { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical'
import useVerticalNav from '@menu/hooks/useVerticalNav'
import StyledVerticalNavExpandIcon from '@menu/vertical/styles/StyledVerticalNavExpandIcon'
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'
import { useSettings } from '@core/hooks/useSettings'
import { MenuData } from '@data/navigation/MenuData'

const RenderExpandIcon = ({ open, transitionDuration }) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu, isCollapsed }) => {
  // Hooks
  const theme = useTheme()
  const { settings } = useSettings()
  const { isBreakpointReached, transitionDuration } = useVerticalNav()
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar
  const [role, setRole] = useState(null)

  useEffect(() => setRole(sessionStorage.getItem('authRole')), [])

  const renderMenuItems = (items, parentKey = '') =>
    items.filter(item => !item.roles || (role && item.roles.includes(role))).map((item, index) => {
      const key = `${parentKey}-${item.label}-${index}`

      if (item.type === 'section') {
        return (
          <MenuSection key={key} label={item.label}>
            {renderMenuItems(item.children, key)}
          </MenuSection>
        )
      }

      if (item.type === 'submenu') {
        return (
          <SubMenu key={key} label={item.label} icon={item.icon} suffix={item.suffix}>
            {renderMenuItems(item.children, key)}
          </SubMenu>
        )
      }

      return (
        <MenuItem
          key={key}
          href={item.href}
          target={item.target}
          icon={item.icon}
          suffix={item.suffix}
          disabled={item.disabled}
        >
          {item.label}
        </MenuItem>
      )
    })

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Vertical Menu */}
      <Menu
        menuItemStyles={menuItemStyles(theme, settings.primaryColor, isCollapsed)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(theme, isCollapsed)}
        isCollapsed={isCollapsed}
      >
        {renderMenuItems(MenuData)}
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
