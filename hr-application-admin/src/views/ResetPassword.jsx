'use client'

import { useState } from 'react'
import Link from '@/components/Link'
import { useRouter, useSearchParams } from 'next/navigation'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import DirectionalIcon from '@components/DirectionalIcon'
import Illustrations from '@components/Illustrations'
import Logo from '@components/layout/shared/Logo'
import { useImageVariant } from '@core/hooks/useImageVariant'
import { getApi, setAuthCookie } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const ResetPassword = ({ mode }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  const authBackground = useImageVariant(
    mode,
    '/images/pages/auth-v1-mask-light.png',
    '/images/pages/auth-v1-mask-dark.png'
  )

  const handleSubmit = async event => {
    event.preventDefault()
    setSuccess(null)

    if (!token) {
      notifyGlobal('This reset link is invalid or missing its token.', 'error')
      return
    }

    if (password.length < 8) {
      notifyGlobal('Password must be at least 8 characters long.', 'error')
      return
    }

    if (password !== confirmation) {
      notifyGlobal('Passwords do not match.', 'error')
      return
    }

    setLoading(true)
    try {
      const api = await getApi()
      const { data } = await api.post('/auth/reset-password', { token, password })
      if (!data?.access_token) {
        throw new Error('Password reset succeeded but no access token was returned')
      }

      setAuthCookie(data.access_token, false)
      setSuccess('Password reset successfully. Redirecting to dashboard...')
      notifyGlobal('Password reset successfully. Redirecting to dashboard...', 'success')
      setPassword('')
      setConfirmation('')
      setTimeout(() => router.push('/dashboard'), 800)
    } catch (resetError) {
      notifyGlobal(resetError.response?.data?.detail || resetError.message || 'Unable to reset password', 'error')
    } finally {
      setLoading(false)
    }
  }

  const passwordAdornment = (shown, setShown) => (
    <InputAdornment position='end'>
      <IconButton
        edge='end'
        aria-label='toggle password visibility'
        onClick={() => setShown(value => !value)}
        onMouseDown={event => event.preventDefault()}
      >
        <i className={shown ? 'ri-eye-off-line' : 'ri-eye-line'} />
      </IconButton>
    </InputAdornment>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative', p: 6 }}>
      <Card sx={{ display: 'flex', flexDirection: 'column', width: { sm: 450 } }}>
        <CardContent sx={{ p: { xs: 6, sm: 12 }, "&:last-child": {pb: { xs: 6, sm: 12 }} }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 6 }}>
            <Link href='/'>
              <Logo />
            </Link>
          </Box>

          <Typography variant='h4' sx={{ mb: 2 }}>
            Reset Password 🔒
          </Typography>
          <Typography sx={{ mb: 5 }}>
            Enter a new password for your account.
          </Typography>

          <Box component='form' noValidate autoComplete='off' onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <TextField
              autoFocus
              fullWidth
              required
              label='New password'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              InputProps={{ endAdornment: passwordAdornment(showPassword, setShowPassword) }}
            />
            <TextField
              fullWidth
              required
              label='Confirm password'
              type={showConfirmation ? 'text' : 'password'}
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              InputProps={{ endAdornment: passwordAdornment(showConfirmation, setShowConfirmation) }}
            />

            <Button fullWidth variant='contained' type='submit' disabled={loading || Boolean(success)}>
              Set New Password
            </Button>

            <Typography variant='body1' className='flex justify-center items-center' color='primary.main'>
              <Link href='/login' className='flex items-center gap-1.5'>
                <DirectionalIcon className='leading-none' ltrIconClass='ri-arrow-left-s-line' rtlIconClass='ri-arrow-right-s-line' />
                <span className='leading-none'>Back to Login</span>
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Illustrations maskImg={{ src: authBackground }} />
    </Box>
  )
}

export default ResetPassword
