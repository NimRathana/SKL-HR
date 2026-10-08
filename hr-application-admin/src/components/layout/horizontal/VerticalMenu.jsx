// MUI Imports
import { useEffect, useState } from 'react'
import { useTheme, styled } from '@mui/material/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical'
import useHorizontalNav from '@menu/hooks/useHorizontalNav'
import StyledVerticalNavExpandIcon from '@menu/vertical/styles/StyledVerticalNavExpandIcon'
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'
import { useSettings } from '@core/hooks/useSettings'
import { MenuData } from '@data/navigation/MenuData'
import { Box, Divider } from '@mui/material'
import Link from '@/components/Link'
import Logo from '@components/layout/shared/Logo'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'

const RenderExpandIcon = ({ open, transitionDuration }) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }) => {
  const theme = useTheme()
  const { settings } = useSettings()
  const { isBreakpointReached, transitionDuration, toggleVerticalNav } = useHorizontalNav()

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
    <Box sx={{ height: '100%', position: 'relative' }}>
      <ScrollWrapper
        style={{ height: '100%' }}
        {...(isBreakpointReached
          ? {
              className: 'bs-full overflow-y-auto overflow-x-hidden',
              onScroll: (e) => scrollMenu?.(e, false)
            }
          : {
              options: { wheelPropagation: false, suppressScrollX: true },
              onScrollY: (e) => scrollMenu?.(e, true)
            })}
      >
        {/* Sticky Header */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'background.paper' }}>
          <Box sx={{ px: 4, pt: 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0rem' }}>
              <Link href="/">
                <Logo />
              </Link>

              {isBreakpointReached && (
                <i 
                  className="ri-close-line text-xl" 
                  onClick={() => toggleVerticalNav(false)}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Menu Content */}
        <Menu
          menuItemStyles={menuItemStyles(theme, settings.primaryColor, false)}
          renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
          renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
          menuSectionStyles={menuSectionStyles(theme, false)}
        >
          {renderMenuItems(MenuData)}
        </Menu>
      </ScrollWrapper>
    </Box>
  )
}

export default VerticalMenu