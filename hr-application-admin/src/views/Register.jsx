'use client'

// React Imports
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Next Imports
import Link from '@/components/Link'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline'

// Component Imports
import Illustrations from '@components/Illustrations'
import Logo from '@components/layout/shared/Logo'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { getApi, setAuthCookie } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail
      .map(item => (typeof item === 'string' ? item : item?.msg || 'Validation error'))
      .join(', ')
  }

  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') return detail.msg || JSON.stringify(detail)
  return error?.message || fallback
}

const Register = ({ mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationPending, setVerificationPending] = useState(false)
  const [verificationExpired, setVerificationExpired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  // Vars
  const darkImg = '/images/pages/auth-v1-mask-dark.png'
  const lightImg = '/images/pages/auth-v1-mask-light.png'

  // Hooks
  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const handleClickShowPassword = () => setIsPasswordShown(show => !show)
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const selectedPlanId = searchParams.get('plan_id')
  const selectedInterval = searchParams.get('interval') || 'monthly'
  const handleEditEmail = () => {
    setVerificationPending(false)
    setVerificationExpired(false)
    setVerificationCode('')
    setSuccess(null)
  }
  const handleSubmit = async event => {
    event.preventDefault()
    setSuccess(null)

    if (verificationPending && !verificationExpired && !/^\d{6}$/.test(verificationCode.trim())) {
      notifyGlobal('Please enter the 6-digit verification code.', 'error')
      return
    }

    const normalizedEmail = email.trim()

    if (normalizedEmail.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      notifyGlobal('Please enter a valid email address.', 'error')
      return
    }

    setLoading(true)
    try {
      const api = await getApi()
      if (!verificationPending || verificationExpired) {
        await api.post('/auth/register', {
          name: name.trim(),
          email: normalizedEmail,
          password,
        })
        setVerificationPending(true)
        setVerificationExpired(false)
        setVerificationCode('')
        setSuccess('Verification code sent. Check your email to finish registration.')
        notifyGlobal('Verification code sent. Check your email to finish registration.', 'success')
      } else {
        const { data } = await api.post('/auth/register/verify', {
          email: normalizedEmail,
          verification_code: verificationCode.trim(),
        })

        const accessToken = data?.access_token || data?.token || data?.data?.access_token
        setSuccess(null)

        if (accessToken) {
          setAuthCookie(accessToken, false)
        }

        setSuccess('Account verified.')
        notifyGlobal('Account verified.', 'success')
        setTimeout(() => {
          if (selectedPlanId) {
            const params = new URLSearchParams({
              plan: selectedPlan || 'free',
              plan_id: selectedPlanId,
              interval: selectedInterval,
            })
            router.push(`/checkout?${params.toString()}`)
            return
          }

          if (selectedPlan && selectedPlan !== 'free') {
            router.push(`/checkout?plan=${encodeURIComponent(selectedPlan)}`)
            return
          }

          router.push('/dashboard')
        }, 800)
      }
    } catch (registrationError) {
      const message = getErrorMessage(registrationError, 'Registration failed')

      if (verificationPending && /expired/i.test(message)) {
        setVerificationExpired(true)
      }

      notifyGlobal(message, 'error')
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
        minHeight: '100dvh',
        position: 'relative',
        p: 6,
      }}
    >
      <Card sx={{ display: 'flex', flexDirection: 'column', width: { sm: 450 } }}>
        <CardContent sx={{ p: { xs: 6, sm: 12 }, "&:last-child": {pb: { xs: 6, sm: 12 }} }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
            <Link href='/'>
              <Logo />
            </Link>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {!verificationPending ? (
              <Box>
                <Typography variant="h4" gutterBottom>
                  Adventure starts here 🚀
                </Typography>
                <Typography color="text.secondary">
                  Make your app management easy and fun!
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                  Check your inbox
                </Typography>
                <Typography color="text.secondary">
                  We sent a 6-digit verification code to
                </Typography>
                <Typography fontWeight={600} sx={{ mt: 1, wordBreak: 'break-word' }}>
                  {email.trim()}
                </Typography>
                <Button
                  type="button"
                  size="small"
                  onClick={handleEditEmail}
                  startIcon={<i className="ri-edit-line" />}
                >
                  Edit email
                </Button>
              </Box>
            )}

            <Box
              component="form"
              noValidate
              autoComplete="off"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              {!verificationPending ? (
                <>
                  <TextField autoFocus fullWidth label="Full name" value={name} onChange={e => setName(e.target.value)} required />
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type={isPasswordShown ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    sx={{
                      '& input::-ms-reveal': { display: 'none' },
                      '& input::-ms-clear': { display: 'none' },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={handleClickShowPassword}
                            onMouseDown={e => e.preventDefault()}
                          >
                            <i className='ri-eye-line' />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              ) : (
                <TextField
                  autoFocus
                  fullWidth
                  label="Verification code"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  helperText="The code expires in 15 minutes."
                  inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                  required
                />
              )}

              {success && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 2,
                    borderRadius: 'var(--mui-shape-borderRadius)',
                    border: '1px solid',
                    borderColor: 'success.main',
                    backgroundColor: 'success.lighterOpacity',
                    color: 'success.dark',
                  }}
                >
                  <CheckCircleOutline sx={{ mt: 0.25, color: 'success.main' }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {verificationPending ? 'Verification code sent' : 'Account verified'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>
                      Check your email to finish registration.
                    </Typography>
                    {verificationPending && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.75, opacity: 0.8 }}>
                        We sent the code to {email.trim()}.
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              <Button fullWidth variant="contained" type="submit" disabled={loading}>
                {verificationPending ? (verificationExpired ? 'Resend code' : 'Verify email') : 'Sign Up'}
              </Button>

              {!verificationPending && <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Typography>Already have an account?</Typography>
                <Typography
                  component={Link}
                  href="/login"
                  sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Sign in instead
                </Typography>
              </Box>}

              {!verificationPending && <Divider>or</Divider>}

              {!verificationPending && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <IconButton size="small" sx={{ color: '#4267B2' }}>
                  <i className="ri-facebook-fill" />
                </IconButton>
                <IconButton size="small" sx={{ color: '#1DA1F2' }}>
                  <i className="ri-twitter-fill" />
                </IconButton>
                <IconButton size="small">
                  <i className="ri-github-fill" />
                </IconButton>
                <IconButton size="small" sx={{ color: '#DB4437' }}>
                  <i className="ri-google-fill" />
                </IconButton>
              </Box>}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Illustrations maskImg={{ src: authBackground }} />
    </Box>
  )
}

export default Register