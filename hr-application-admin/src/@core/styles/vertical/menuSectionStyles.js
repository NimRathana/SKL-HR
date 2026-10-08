// Util Imports
import { menuClasses } from '@menu/utils/menuClasses'

const menuSectionStyles = (theme, isCollapsed = true) => {
  const collapsedTextOffset = theme.direction === 'rtl' ? 8 : -8

  return {
    root: {
      marginBlockStart: isCollapsed ? theme.spacing(0) : theme.spacing(7),
      transition: 'margin-block-start 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      [`& .${menuClasses.menuSectionContent}`]: {
        color: 'var(--mui-palette-text-disabled)',
        paddingInline: '0 !important',
        paddingBlock: isCollapsed ? '0 !important' : `${theme.spacing(1.75)} !important`,
        gap: theme.spacing(2.5),
        maxHeight: isCollapsed ? 0 : 36,
        opacity: isCollapsed ? 0 : 1,
        transform: `translateX(${isCollapsed ? collapsedTextOffset : 0}px)`,
        overflow: 'hidden',
        transition: 'max-height 160ms cubic-bezier(0.2, 0.8, 0.2, 1), padding 160ms ease-in-out, opacity 120ms ease-in-out, transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        '&:before': {
          content: '""',
          blockSize: 1,
          inlineSize: '0.875rem',
          backgroundColor: 'var(--mui-palette-divider)'
        },
        '&:after': {
          content: '""',
          blockSize: 1,
          flexGrow: 1,
          backgroundColor: 'var(--mui-palette-divider)'
        },
        display: 'flex',
      },
      [`& .${menuClasses.menuSectionLabel}`]: {
        flexGrow: 0,
        fontSize: '13px',
        lineHeight: 1.38462,
      }
    },
  }
}

export default menuSectionStyles
