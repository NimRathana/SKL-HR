'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import SnackbarContent from '@mui/material/SnackbarContent'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import {
  CheckCircleOutline as SuccessIcon,
  Close as CloseIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  WarningAmber as WarningIcon
} from '@mui/icons-material'
import { ERROR_NOTIFICATION_EVENT, GLOBAL_NOTIFICATION_EVENT } from '@core/notifications'

const SEVERITY_ICONS = {
  error: ErrorIcon,
  success: SuccessIcon,
  info: InfoIcon,
  warning: WarningIcon
}

const GlobalNotification = () => {
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'info' })

  useEffect(() => {
    const handleNotification = event => {
      if (event.detail?.message) {
        const severity = Object.hasOwn(SEVERITY_ICONS, event.detail.severity)
          ? event.detail.severity
          : 'error'

        setNotice({ open: true, message: event.detail.message, severity })
      }
    }

    window.addEventListener(GLOBAL_NOTIFICATION_EVENT, handleNotification)
    window.addEventListener(ERROR_NOTIFICATION_EVENT, handleNotification)
    return () => {
      window.removeEventListener(GLOBAL_NOTIFICATION_EVENT, handleNotification)
      window.removeEventListener(ERROR_NOTIFICATION_EVENT, handleNotification)
    }
  }, [])

  const closeNotice = () => setNotice(previous => ({ ...previous, open: false }))
  const SeverityIcon = SEVERITY_ICONS[notice.severity]

  return (
    <Snackbar
      open={notice.open}
      autoHideDuration={6000}
      onClose={closeNotice}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <SnackbarContent
        message={(
          <Stack direction='row' spacing={1.25} alignItems='center' sx={{ width: '100%', minWidth: 0, pr: 5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 'var(--mui-shape-borderRadius)',
                color: theme => theme.palette[notice.severity].main,
                backgroundColor: theme => alpha(theme.palette[notice.severity].main, 0.12)
              }}
            >
              <SeverityIcon fontSize='small' aria-hidden='true' />
            </Box>
            <span style={{ minWidth: 0 }}>{notice.message}</span>
          </Stack>
        )}
        action={(
          <IconButton
            size='small'
            color='inherit'
            aria-label='Close notification'
            onClick={closeNotice}
            sx={{
              mr: 1,
              position: 'absolute',
              top: '50%',
              right: 1,
              width: 34,
              height: 34,
              transform: 'translateY(-50%)'
            }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        )}
        sx={{
          width: 'min(420px, calc(100vw - 32px))',
          minWidth: 0,
          position: 'relative',
          alignItems: 'center',
          padding: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: '4px solid',
          borderLeftColor: theme => theme.palette[notice.severity].main,
          borderRadius: 'var(--mui-shape-borderRadius)',
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: theme => theme.shadows[6],
          '& .MuiSnackbarContent-message': {
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            padding: 0
          },
        }}
      />
    </Snackbar>
  )
}

export default GlobalNotification
