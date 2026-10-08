'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { getApi, getApiErrorMessage, setAuthCookie } from '@core/api'
import { notifyGlobal } from '@core/notifications'

export default function InviteSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const passwordError = error.toLowerCase().startsWith('password')

  useEffect(() => {
    const paramsEmail = searchParams.get('email') || ''
    const paramsToken = searchParams.get('token') || ''

    setEmail(paramsEmail)
    setToken(paramsToken)
  }, [searchParams])

  const handleSubmit = async event => {
    event.preventDefault()

    const inviteToken = token || searchParams.get('token') || ''

    if (!email || !inviteToken) {
      const message = 'Invalid invite link. Please request a new invitation.'
      setError(message)
      notifyGlobal(message, 'error')
      return
    }

    if (!code || code.length !== 6) {
      const message = 'Please enter a valid 6-digit verification code.'
      setError(message)
      notifyGlobal(message, 'error')
      return
    }

    if (!username.trim()) {
      const message = 'Please enter your username.'
      setError(message)
      notifyGlobal(message, 'error')
      return
    }

    try {
      setLoading(true)
      setError('')

      const api = await getApi()
      const { data } = await api.post('/users/invite/verify', {
        email,
        verification_code: code,
        username: username.trim(),
        password,
        invite_token: inviteToken,
      })

      const accessToken = data?.access_token
      if (accessToken) {
        setAuthCookie(accessToken, true)
      }

      notifyGlobal('User account created successfully. Redirecting to dashboard...', 'success')
      setTimeout(() => router.push('/dashboard'), 1000)
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to complete user setup.')
      setError(message)
      notifyGlobal(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component='form' onSubmit={handleSubmit}>
            <Box>
              <Typography variant='h5' fontWeight={700} gutterBottom>
                Complete your account setup
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Enter the code from your email and create your password.
              </Typography>
            </Box>

            <TextField
              fullWidth
              label='Email'
              value={email}
              InputProps={{ readOnly: true }}
            />

            <TextField
              fullWidth
              label='Verification code'
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder='123456'
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            />

            <TextField
              fullWidth
              label='Full name'
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder='Enter full name'
            />

            <Box>
              <TextField
                fullWidth
                label='Password'
                type={showPassword ? 'text' : 'password'}
                value={password}
                error={passwordError}
                sx={{
                  '& input::-ms-reveal': { display: 'none' },
                  '& input::-ms-clear': { display: 'none' },
                }}
                onChange={event => {
                  setPassword(event.target.value)
                  if (passwordError) setError('')
                }}
                placeholder='Create password'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        edge='end'
                        aria-label='toggle password visibility'
                        onClick={() => setShowPassword(value => !value)}
                        onMouseDown={event => event.preventDefault()}
                      >
                        <i className='ri-eye-line' />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Button
              type='submit'
              variant='contained'
              size="small"
              disabled={loading}
              startIcon={loading ? <i className="ri-loader-4-line ri-spin" /> : <i className="ri-user-add-line" />}
            >
              Create account
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
