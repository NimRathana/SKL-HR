// Util Imports
import { menuClasses, verticalNavClasses } from '@menu/utils/menuClasses'

const navigationCustomStyles = (theme, skin = 'default', isCollapsed = false, isHoverExpanded = false) => {
  return {
    color: 'var(--mui-palette-text-primary)',
    zIndex: 'var(--drawer-z-index) !important',
    [`& .${verticalNavClasses.bgColorContainer}`]: {
      backgroundColor: 'var(--mui-palette-background-default)'
    },
    [`& .${verticalNavClasses.header}`]: {
      paddingBlock: theme.spacing(5),
      paddingInline: isCollapsed ? null : theme.spacing(5.5, 4)
    },
    [`& .${verticalNavClasses.container}`]: {
      transition: isHoverExpanded ? 'width 160ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'width 200ms ease',
      border: skin === 'bordered' ? '1px solid var(--mui-palette-divider)' : 'transparent',
      [`& .${verticalNavClasses.toggled}`]: {
        boxShadow: 'var(--mui-customShadows-lg)'
      }
    },
    [`& .${menuClasses.root}`]: {
      paddingBlockEnd: theme.spacing(2),
      paddingInlineEnd: isCollapsed ? theme.spacing(1) : theme.spacing(4),
    },
    [`& .${verticalNavClasses.backdrop}`]: {
      backgroundColor: 'var(--backdrop-color)'
    }
  }
}

export default navigationCustomStyles
