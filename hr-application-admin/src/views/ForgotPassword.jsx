'use client'

import { useState } from 'react'

// Next Imports
import Link from '@/components/Link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Component Imports
import Form from '@components/Form'
import DirectionalIcon from '@components/DirectionalIcon'
import Illustrations from '@components/Illustrations'
import Logo from '@components/layout/shared/Logo'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const ForgotPassword = ({ mode }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Vars
  const darkImg = '/images/pages/auth-v1-mask-dark.png'
  const lightImg = '/images/pages/auth-v1-mask-light.png'

  // Hooks
  const authBackground = useImageVariant(mode, lightImg, darkImg)

  const handleSubmit = async event => {
    event.preventDefault()
    setLoading(true)

    try {
      const api = await getApi()
      await api.post('/auth/forgot-password', { email: email.trim() })
      setEmail('')
      notifyGlobal('If an account exists for this email, reset instructions have been sent.', 'success')
    } catch (forgotPasswordError) {
      notifyGlobal(forgotPasswordError.response?.data?.detail || forgotPasswordError.message || 'Unable to send reset instructions', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        position: 'relative',
        p: 6
      }}
    >
      <Card sx={{ display: 'flex', flexDirection: 'column', width: { sm: 450 } }}>
        <CardContent sx={{ p: { xs: 6, sm: 12 }, "&:last-child": {pb: { xs: 6, sm: 12 }} }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 6 }}>
            <Link href='/'>
              <Logo />
            </Link>
          </Box>

          <Typography variant="h4" sx={{ mb: 2 }}>
            Forgot Password 🔒
          </Typography>

          <Typography sx={{ mb: 5 }}>
            Enter your email and we&apos;ll send you instructions to reset your password
          </Typography>

          <Form noValidate autoComplete="off" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <TextField
                autoFocus
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />

              <Button size="small"
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <i className="ri-mail-send-line" />}
              >
                Send
              </Button>

              <Typography className='flex justify-center items-center' color='primary.main'>
                <Link href='/login' className='flex items-center'>
                  <DirectionalIcon className='leading-none' ltrIconClass='ri-arrow-left-s-line' rtlIconClass='ri-arrow-right-s-line' />
                  <span className='leading-none'>Back to Login</span>
                </Link>
              </Typography>
            </Box>
          </Form>
        </CardContent>
      </Card>

      <Illustrations maskImg={{ src: authBackground }} />
    </Box>
  )
}

export default ForgotPassword