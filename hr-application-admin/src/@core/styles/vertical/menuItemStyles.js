// MUI Imports
import { lighten } from '@mui/material/styles'

// Util Imports
import { menuClasses } from '@menu/utils/menuClasses'

const menuItemStyles = (theme, primaryColor, isCollapsed) => {
  const mainColor = primaryColor || theme.palette.primary.main
  const lightColor = lighten(mainColor, 0.5)
  const collapsedTextOffset = theme.direction === 'rtl' ? 8 : -8
  return {
    root: {
      marginBlockStart: theme.spacing(1.5),
      [`&.${menuClasses.subMenuRoot}.${menuClasses.open} > .${menuClasses.button}, &.${menuClasses.subMenuRoot} > .${menuClasses.button}.${menuClasses.active}`]:
        {
          backgroundColor: 'var(--mui-palette-action-selected) !important'
        },
      [`&.${menuClasses.disabled} > .${menuClasses.button}`]: {
        color: 'var(--mui-palette-text-disabled)',
        [`& .${menuClasses.icon}`]: {
          color: 'inherit'
        }
      },
      [`&:not(.${menuClasses.subMenuRoot}) > .${menuClasses.button}.${menuClasses.active}`]: {
        color: 'var(--mui-palette-primary-contrastText)',
        background:
          theme.direction === 'ltr'
            ? `linear-gradient(270deg, ${mainColor}, ${lightColor} 100%)`
            : `linear-gradient(270deg, ${lightColor}, ${mainColor} 100%)`,
        [`& .${menuClasses.icon}`]: {
          color: 'inherit'
        }
      }
    },
    button: ({ active }) => ({
      paddingBlock: theme.spacing(2),
      paddingInlineStart: isCollapsed ? theme.spacing(2) : theme.spacing(5.5),
      paddingInlineEnd: isCollapsed ? theme.spacing(2) : theme.spacing(3.5),
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      transition: 'padding 160ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 120ms ease-in-out',
      borderStartEndRadius: 50,
      borderEndEndRadius: 50,
      ...(!active && {
        '&:hover, &:focus-visible': {
          backgroundColor: 'var(--mui-palette-action-hover)'
        },
        '&[aria-expanded="true"]': {
          backgroundColor: 'var(--mui-palette-action-selected)'
        }
      })
    }),
    icon: ({ level }) => ({
      ...(level === 0 && {
        fontSize: '1.375rem',
      }),
      ...(level > 0 && {
        fontSize: '0.75rem',
        color: 'var(--mui-palette-text-secondary)',
      }),
      marginInlineEnd: isCollapsed ? 0 : theme.spacing(level === 0 ? 2 : 3.5),
      ...(level === 1 && !isCollapsed && {
        marginInlineStart: theme.spacing(1.5)
      }),

      ...(level > 1 && !isCollapsed && {
        marginInlineStart: theme.spacing(1.5 + 2.5 * (level - 1))
      }),
      '& > i, & > svg': {
        fontSize: 'inherit'
      },
      transition: 'margin 160ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    }),
    label: {
      maxWidth: isCollapsed ? 0 : 180,
      opacity: isCollapsed ? 0 : 1,
      transform: `translateX(${isCollapsed ? collapsedTextOffset : 0}px)`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      transition: 'max-width 160ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 120ms ease-in-out, transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    },
    prefix: {
      marginInlineEnd: isCollapsed ? 0 : theme.spacing(2),
      maxWidth: isCollapsed ? 0 : 120,
      opacity: isCollapsed ? 0 : 1,
      transform: `translateX(${isCollapsed ? collapsedTextOffset : 0}px)`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      transition: 'max-width 160ms cubic-bezier(0.2, 0.8, 0.2, 1), margin 160ms ease-in-out, opacity 120ms ease-in-out, transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    },
    suffix: {
      marginInlineStart: isCollapsed ? 0 : theme.spacing(2),
      maxWidth: isCollapsed ? 0 : 120,
      opacity: isCollapsed ? 0 : 1,
      transform: `translateX(${isCollapsed ? collapsedTextOffset : 0}px)`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      transition: 'max-width 160ms cubic-bezier(0.2, 0.8, 0.2, 1), margin 160ms ease-in-out, opacity 120ms ease-in-out, transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)'
    },
    subMenuExpandIcon: {
      fontSize: '1.375rem',
      marginInlineStart: isCollapsed ? 0 : theme.spacing(2),
      maxWidth: isCollapsed ? 0 : 28,
      opacity: isCollapsed ? 0 : 1,
      overflow: 'hidden',
      transition: 'max-width 160ms cubic-bezier(0.2, 0.8, 0.2, 1), margin 160ms ease-in-out, opacity 120ms ease-in-out',
      '& i, & svg': {
        fontSize: 'inherit'
      },
    },
    subMenuContent: {
      backgroundColor: 'transparent'
    },
  }
}

export default menuItemStyles
