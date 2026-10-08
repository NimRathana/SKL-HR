const customBreakpoint = '800px'

const dialog = skin => ({
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        ...(skin !== 'bordered'
          ? {
              boxShadow: 'var(--mui-customShadows-xl)'
            }
          : {
              boxShadow: 'none'
            }),
        // [theme.breakpoints.down('sm')]: {
        //   '&:not(.MuiDialog-paperFullScreen)': {
        //     margin: theme.spacing(6)
        //   }
        // }
        [`@media (max-width: ${customBreakpoint})`]: {
          width: '100%',
          maxWidth: 'none',
          height: '100dvh',
          maxHeight: '100dvh',
          margin: 0,
          borderRadius: 0,
          
          // mobile date-picker dialog responsive
          '&:has(.MuiPickersLayout-root)': {
            maxWidth: '600px',
            height: 'auto',
            maxHeight: 'calc(100dvh - 64px)',
            margin: '32px',
            borderRadius: 'var(--mui-shape-borderRadius)',
            overflow: 'auto',
            '& .MuiPickersLayout-root': {
              maxHeight: 'calc(100dvh - 64px)'
            },
            '& .MuiDialogContent-root': {
              paddingBlock: theme.spacing(3),
              paddingInline: theme.spacing(2)
            },
          }
        }
      })
    }
  },
  MuiDialogTitle: {
    defaultProps: {
      variant: 'h6'
    },
    styleOverrides: {
      root: ({ theme }) => ({
        paddingInline: theme.spacing(5),
        paddingBlock: theme.spacing(1),
        backgroundColor: 'var(--mui-palette-primary-main)',
        color: 'var(--mui-palette-primary-contrastText)',
        '& .MuiIconButton-root': {
          color: 'inherit'
        },
        '& + .MuiDialogActions-root': {
          paddingTop: 0
        }
      })
    }
  },
  MuiDialogContent: {
    styleOverrides: {
      root: ({ theme }) => ({
        paddingInline: theme.spacing(5),
        paddingBlock: theme.spacing(5),
        '& + .MuiDialogContent-root, & + .MuiDialogActions-root': {
          // paddingTop: 0
        }
      })
    }
  },
  MuiDialogActions: {
    styleOverrides: {
      root: ({ theme }) => ({
        paddingInline: theme.spacing(5),
        paddingBlock: theme.spacing(1),
        '& .MuiButtonBase-root:not(:first-of-type)': {
          marginInlineStart: theme.spacing(4)
        },
        '&:where(.dialog-actions-dense)': {
          paddingInline: theme.spacing(2.5),
          paddingBlock: theme.spacing(2.5),
          '& .MuiButton-text': {
            paddingInline: theme.spacing(2.5)
          }
        }
      })
    }
  }
})

export default dialog
