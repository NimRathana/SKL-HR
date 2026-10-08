// MUI Imports
import { alpha, lighten } from '@mui/material/styles'

// Util Imports
import { menuClasses } from '@menu/utils/menuClasses'

const menuItemStyles = (theme, primaryColor, skin = 'default') => {
  const mainColor = primaryColor || theme.palette.primary.main
  const lightColor = lighten(mainColor, 0.5)
  const contentBorder = skin === 'bordered' ? 'var(--mui-palette-divider)' : 'transparent'

  return {
    root: ({ level }) => ({
      [`&.${menuClasses.subMenuRoot}.${menuClasses.open} > .${menuClasses.button}`]: {
        backgroundColor: 'var(--mui-palette-action-selected)',
      },

      [`&.${menuClasses.disabled} > .${menuClasses.button}`]: {
        color: 'var(--mui-palette-text-disabled)',
        cursor: 'default',
        '& .icon': {
          color: 'inherit'
        }
      },

      [`&.${menuClasses.menuItemRoot} > .${menuClasses.button}.${menuClasses.active}`]: {
        color: level > 0 ? mainColor : 'var(--mui-palette-primary-contrastText)',
        background: level > 0 ? alpha(mainColor, 0.3) : `linear-gradient(90deg, ${mainColor}, ${lightColor})`,
        '& .icon': {
          color: 'inherit'
        }
      }
    }),

    button: ({ level, isSubmenu }) => ({
      padding: isSubmenu ? (level > 0 ? '10px 18px' : '10px 16px') : '12px 20px',
      borderRadius: '50px',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',

      '&:hover': {
        backgroundColor: 'var(--mui-palette-action-hover)',
      },

      '&[aria-expanded="true"]': {
        backgroundColor: 'var(--mui-palette-action-selected)',
      }
    }),

    icon: ({ level }) => ({
      fontSize: level === 0 ? '1.375rem' : '0.75rem',
      ...(level > 0 && {
        // color: 'var(--mui-palette-text-secondary)',
      }),
      marginInlineEnd: theme.spacing(level === 0 ? 2 : 1),
      ...(level > 1 && {
        marginInlineStart: theme.spacing(2 * (level - 1)),
      }),
      transition: 'margin 160ms cubic-bezier(0.2, 0.8, 1, 1)',
      '& > i, & > svg': {
        fontSize: 'inherit'
      }
    }),

    label: {
      flex: 1,
    },

    prefix: {
      marginRight: '10px',
    },

    suffix: {
      marginLeft: 'auto',
    },

    subMenuExpandIcon: {
      fontSize: '1.375rem',
      marginInlineStart: theme.spacing(2),
      '& i, & svg': {
        fontSize: 'inherit'
      },
    },

    subMenuContent: {
      border: `1px solid ${contentBorder}`,
      borderRadius: 'var(--mui-shape-borderRadius)',
      backgroundColor: 'var(--mui-palette-background-paper)',
      overflow: 'hidden',
      boxShadow: skin === 'bordered' ? 'none' : 'var(--mui-customShadows-sm)',
    },
  }
}

export default menuItemStyles