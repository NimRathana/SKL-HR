'use client'

import { useMediaQuery, useTheme } from '@mui/material'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker'

const ResponsiveDatePicker = props => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true })
  const Picker = isMobile ? MobileDatePicker : DesktopDatePicker

  return <Picker {...props} />
}

export default ResponsiveDatePicker
