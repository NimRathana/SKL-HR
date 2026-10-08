// React Imports
import React from 'react'

const SelectIcon = () => {
  return <i className='ri-arrow-down-s-line' />
}
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'

const iconStyles = theme => ({
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fill: 'currentColor',
  flexShrink: 0,
  transition: theme.transitions.create('fill', {
    duration: theme.transitions.duration.shorter
  }),
  fontSize: '1.25rem',
  position: 'absolute',
  right: '1rem',
  // top: 'calc(50% - 0.5em)',
  top: '50%',
  transform: 'translateY(-50%)',
  lineHeight: 1,
  pointerEvents: 'none'
})

const select = {
  MuiSelect: {
    defaultProps: {
      IconComponent: SelectIcon,
      MenuProps: {
        PaperProps: {
          sx: {
            maxHeight: 'min(50vh, 320px)',
            overflowY: 'auto'
          }
        }
      }
      // IconComponent: ArrowDropDownIcon
    },
    styleOverrides: {
      select: ({ theme, ownerState }) => ({
        ...(ownerState.variant === 'outlined' && {
          minHeight: '1.5em'
        }),
        '&[aria-expanded="true"] ~ i, &[aria-expanded="true"] ~ svg': {
          transform: 'translateY(-50%) rotate(180deg)'
        },
        '& ~ i, & ~ svg': iconStyles(theme),
        '&.MuiInputBase-inputSizeSmall': {
          '& ~ i, & ~ svg': {
            height: '1.375rem',
            width: '1.375rem'
          }
        },
        '&:not(aria-label="Without label") ~ .MuiOutlinedInput-notchedOutline > legend > span': {
          paddingInline: '5px'
        }
      })
    }
  },
  MuiNativeSelect: {
    styleOverrides: {
      select: ({ theme }) => ({
        '& + i, & + svg': iconStyles(theme)
      })
    }
  }
}

export default select
