'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from '@/components/Link'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import { Box } from '@mui/material'

// Component Imports
import Logo from '@components/layout/shared/Logo'
import Illustrations from '@components/Illustrations'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { getApi, setAuthCookie } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const Login = ({ mode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)

  // Vars
  const darkImg = '/images/pages/auth-v1-mask-dark.png'
  const lightImg = '/images/pages/auth-v1-mask-light.png'

  // Hooks
  const router = useRouter()
  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const handleClickShowPassword = () => setIsPasswordShown(show => !show)
  const getSafeRedirect = value => {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'

    try {
      const url = new URL(value, window.location.origin)
      return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/dashboard'
    } catch {
      return '/dashboard'
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    try {
      const api = await getApi()
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
        remember,
      })
      const token = data?.access_token

      if (!token) {
        throw new Error('No access token returned from server')
      }

      setAuthCookie(token, remember)
      if (data?.status) sessionStorage.setItem('authStatus', data.status)
      notifyGlobal('Signed in successfully.', 'success')

      // Redirect back to original path if present
      const params = new URLSearchParams(window.location.search)
      router.push(getSafeRedirect(params.get('from')))
    } catch (err) {
      console.error('Login error', err)
      notifyGlobal(err.response?.data?.detail || err.message || 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col justify-center items-center' style={{ minHeight: '100vh', position: 'relative', padding: 24 }}>
      <Card className='flex flex-col sm:w-[450px]'>
        <CardContent sx={{ p: { xs: 6, sm: 12 }, "&:last-child": {pb: { xs: 6, sm: 12 }} }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
            <Link href='/'>
              <Logo />
            </Link>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Box>
              <Typography variant="h4">{`Welcome to ${themeConfig.templateName}!👋🏻`}</Typography>
              <Typography sx={{ mb: 1 }}>
                Please sign-in to your account and start the adventure
              </Typography>
            </Box>

            <Box
              component="form"
              autoComplete="off"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              <TextField
                autoFocus
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
                id="outlined-adornment-password"
                type={isPasswordShown ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={handleClickShowPassword}
                        onMouseDown={e => e.preventDefault()}
                      >
                        <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                required
              />

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                <FormControlLabel control={<Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} />} label="Remember me" />
                <Typography
                  sx={{ textAlign: 'right', color: 'primary.main', cursor: 'pointer' }}
                  component={Link}
                  href="/forgot-password"
                >
                  Forgot password?
                </Typography>
              </Box>

              <Button fullWidth variant="contained" type="submit" disabled={loading}>
                Log In
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Typography>New on our platform?</Typography>
                <Typography
                  component={Link}
                  href="/register"
                  sx={{ color: 'primary.main', cursor: 'pointer' }}
                >
                  Create an account
                </Typography>
              </Box>

              <Divider>or</Divider>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <IconButton sx={{ color: '#4267B2' }}>
                  <i className="ri-facebook-fill" />
                </IconButton>
                <IconButton sx={{ color: '#1DA1F2' }}>
                  <i className="ri-twitter-fill" />
                </IconButton>
                <IconButton>
                  <i className="ri-github-fill" />
                </IconButton>
                <IconButton sx={{ color: '#DB4437' }}>
                  <i className="ri-google-fill" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Illustrations maskImg={{ src: authBackground }} />
    </div>
  )
}

export default Login
