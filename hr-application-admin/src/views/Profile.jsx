'use client'

// React Imports
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import PersonOutline from '@mui/icons-material/PersonOutline'
import SecurityOutlined from '@mui/icons-material/SecurityOutlined'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined'
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import Close from '@mui/icons-material/Close'
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import ResponsiveDatePicker from '@components/ResponsiveDatePicker'

// Hook Imports
import { clearAuthCookies, getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'
import Billing from '@views/Billing'
import ApproximateLocation from '@components/security/ApproximateLocation'

const EditProfile = () => {
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
  })
  const [profileImage, setProfileImage] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [securityLoading, setSecurityLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', next: '', confirm: '' })
  const [recentLogins, setRecentLogins] = useState([])
  const [loadingLogins, setLoadingLogins] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [activeTab, setActiveTab] = useState('account')

  const router = useRouter()

  useEffect(() => {
    fetchUserProfile()
    const requestedTab = new URLSearchParams(window.location.search).get('tab')
    if (requestedTab === 'notifications') {
      setActiveTab('notifications')
      loadNotifications()
    }
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoadingProfile(true)
      const api = await getApi()
      const response = await api.get('/users/profile')
      const userData = response.data
      setProfile(userData)

      setFormData({
        name: userData?.name || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        date_of_birth: userData?.date_of_birth || '',
        address: userData?.address || '',
      })

      if (userData?.profile_image) {
        const imageUrl = userData.profile_image

        if (typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl)) {
          setProfileImagePreview(imageUrl)
        }
      } else {
        setProfileImagePreview(null)
      }
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Failed to load profile', 'error')
    } finally {
      setLoadingProfile(false)
    }

  }

  const handleDeleteImage = async () => {
    if (!profileImagePreview && !profileImage) return
    setLoading(true)
    try {
      const api = await getApi()
      await api.delete('/users/profile/image')
      setProfileImage(null)
      setProfileImagePreview(null)
      const updatedProfile = { ...profile, profile_image: null }
      setProfile(updatedProfile)
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedProfile }))
      notifyGlobal('Profile image removed successfully!', 'success')
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Failed to remove profile image', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field) => (event) => {
    setFormData(current => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const resetProfileForm = () => {
    if (!profile) return
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      date_of_birth: profile.date_of_birth || '',
      address: profile.address || '',
    })
    setProfileImage(null)
    setProfileImagePreview(profile.profile_image || null)
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        notifyGlobal('Please select a valid image file', 'error')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        notifyGlobal('Image size must be less than 5MB', 'error')
        return
      }

      setProfileImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const api = await getApi()
      const formDataToSend = new FormData()

      formDataToSend.append('name', formData.name.trim())
      formDataToSend.append('email', formData.email.trim())
      formDataToSend.append('phone', formData.phone.trim())
      formDataToSend.append('date_of_birth', formData.date_of_birth)
      formDataToSend.append('address', formData.address.trim())

      if (profileImage) {
        formDataToSend.append('profile_image', profileImage)
      }

      const { data: updatedProfile } = await api.put('/users/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setProfileImage(null)
      setProfile(updatedProfile)
      if (updatedProfile?.profile_image) setProfileImagePreview(updatedProfile.profile_image)
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedProfile }))
      notifyGlobal('Profile updated successfully!', 'success')
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || err.message || 'Failed to update profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (passwordData.next !== passwordData.confirm) {
      notifyGlobal('New password and confirmation do not match.', 'error')
      return
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/.test(passwordData.next)) {
      notifyGlobal('Use at least 8 characters, including an uppercase letter, a number, and a symbol.', 'error')
      return
    }
    setSecurityLoading(true)
    try {
      const api = await getApi()
      await api.post('/auth/change-password', {
        current_password: passwordData.current,
        new_password: passwordData.next,
      })
      setPasswordData({ current: '', next: '', confirm: '' })
      notifyGlobal('Password changed successfully.', 'success')
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || err.message || 'Unable to change password.', 'error')
    } finally {
      setSecurityLoading(false)
    }
  }

  const loadRecentLogins = async () => {
    setLoadingLogins(true)
    try {
      const api = await getApi()
      const { data } = await api.get('/auth/recent-logins')
      setRecentLogins(Array.isArray(data) ? data : [])
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Unable to load recent sign-ins.', 'error')
    } finally {
      setLoadingLogins(false)
    }
  }

  const loadNotifications = async () => {
    setLoadingNotifications(true)
    try {
      const api = await getApi()
      const { data } = await api.get('/notifications')
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Unable to load notifications.', 'error')
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleTabChange = (event, tab) => {
    if (tab === 'billing' && !['admin', 'owner'].includes(String(profile?.role || '').toLowerCase())) {
      return
    }
    setActiveTab(tab)
    if (tab === 'security') loadRecentLogins()
    if (tab === 'notifications') loadNotifications()
  }

  const markNotificationRead = async (notificationId) => {
    try {
      const api = await getApi()
      await api.patch(`/notifications/${notificationId}/read`)
      setNotifications(current => current.map(notification => (
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      )))
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Unable to update notification.', 'error')
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      const api = await getApi()
      await api.delete(`/notifications/${notificationId}`)
      setNotifications(current => current.filter(notification => notification.id !== notificationId))
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Unable to delete notification.', 'error')
    }
  }

  const deleteAccount = async () => {
    if (!deleteConfirmed || !deletePassword) return
    setDeletingAccount(true)
    try {
      const api = await getApi()
      await api.delete('/users/profile', { data: { current_password: deletePassword } })
      clearAuthCookies()
      router.replace('/login')
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Unable to delete account.', 'error')
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <Box>
      {loadingProfile ? (
        <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                TabIndicatorProps={{ sx: { display: 'none' } }}
                sx={{
                  borderBlockEnd: 'none !important',
                  fontWeight: 500,
                  '& .MuiTab-root': {
                    minHeight: 38,
                    m: 1,
                    gap: 1,
                    borderRadius: 'var(--mui-shape-borderRadius)',
                    '&:hover': { backgroundColor: 'action.hover', color: 'primary.main', paddingBlockEnd: '0.5rem' },
                  },
                  '& .MuiTab-root.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { backgroundColor: 'primary.dark' },
                  },
                }}
              >
                <Tab value="account" label="Account" icon={<PersonOutline />} iconPosition="start" />
                <Tab value="security" label="Security" icon={<SecurityOutlined />} iconPosition="start" />
                {['admin', 'owner'].includes(String(profile?.role || '').toLowerCase()) && (
                  <Tab value="billing" label="Billing & plans" icon={<CreditCardOutlined />} iconPosition="start" />
                )}
                <Tab value="notifications" label="Notifications" icon={<NotificationsOutlined />} iconPosition="start" />
              </Tabs>
          </Card>

          {activeTab !== 'billing' && (
            <Stack spacing={2}>
              {activeTab === 'account' && (
                <Card>
                  <CardContent>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                      sx={{ mb: 3 }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar
                          src={profileImagePreview || undefined}
                          sx={{ width: 72, height: 72, flexShrink: 0, backgroundColor: 'primary.main', fontSize: 28 }}
                        >
                          {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700}>{formData.name || 'Your account'}</Typography>
                          <Typography variant="caption" color="text.secondary">JPG, GIF or PNG. Maximum 5 MB.</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button component="label" size="small" variant="contained" startIcon={<CloudUploadOutlined />}>
                          Upload new photo
                          <input accept="image/*" hidden type="file" onChange={handleImageUpload} />
                        </Button>
                        <Button size="small" variant="outlined" onClick={resetProfileForm} disabled={loading}>
                          Reset
                        </Button>
                        {(profileImagePreview || profileImage) && (
                          <Button
                            aria-label="Remove profile photo"
                            title="Remove profile photo"
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={handleDeleteImage}
                            disabled={loading}
                          >
                            <DeleteOutline />
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                    <Typography variant="h6" fontWeight={700}>Personal information</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
                      Update the contact details associated with your account.
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit}>
                      <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth size="small" label="Full name" value={formData.name} onChange={handleInputChange('name')} required />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth size="small" label="Email address" type="email" value={formData.email} onChange={handleInputChange('email')} required />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth size="small" label="Phone" value={formData.phone} onChange={handleInputChange('phone')} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <ResponsiveDatePicker
                              label="Date of birth"
                              value={formData.date_of_birth ? dayjs(formData.date_of_birth) : null}
                              onChange={(date) => handleInputChange('date_of_birth')({ target: { value: date?.isValid() ? date.format('YYYY-MM-DD') : '' } })}
                              format="YYYY-MM-DD"
                              slotProps={{ textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } } }}
                            />
                          </LocalizationProvider>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField fullWidth size="small" label="Address" value={formData.address} onChange={handleInputChange('address')} multiline minRows={2} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Stack direction="row" justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              type="submit"
                              disabled={loading}
                              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <i className="ri-save-line" />}
                            >
                              Save changes
                            </Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'security' && (
                <>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700}>Change password</Typography>
                      <Box component="form" onSubmit={handleChangePassword} sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Current password"
                              type="password"
                              autoComplete="current-password"
                              value={passwordData.current}
                              onChange={event => setPasswordData(current => ({ ...current, current: event.target.value }))}
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="New password"
                              type="password"
                              autoComplete="new-password"
                              value={passwordData.next}
                              onChange={event => setPasswordData(current => ({ ...current, next: event.target.value }))}
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Confirm new password"
                              type="password"
                              autoComplete="new-password"
                              value={passwordData.confirm}
                              onChange={event => setPasswordData(current => ({ ...current, confirm: event.target.value }))}
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Use at least 8 characters, including an uppercase letter, a number, and a symbol.
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Button size="small" type="submit" variant="contained" disabled={securityLoading}>
                              {securityLoading ? <CircularProgress size={18} color="inherit" /> : 'Save password'}
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700}>Login activity</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                        Successful sign-ins for your account. Location is an approximate estimate based on the source IP; it may reflect a VPN, proxy, mobile carrier, corporate network, or shared connection.
                      </Typography>
                      {loadingLogins ? (
                        <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>
                      ) : recentLogins.length ? (
                        <TableContainer sx={{ overflowX: 'auto', borderRadius: 'var(--mui-shape-borderRadius)', border: 1, borderColor: 'divider' }}>
                          <Table size="small" sx={{ minWidth: 1000 }}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                <TableCell>Account / user</TableCell>
                                <TableCell>Source IP</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Login time</TableCell>
                                <TableCell>Login status</TableCell>
                                <TableCell>Security information</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {recentLogins.map(login => (
                                <TableRow key={login.id} hover>
                                  <TableCell>{profile?.name || profile?.email || 'Current account'}</TableCell>
                                  <TableCell>{login.ip_address || 'Unknown'}</TableCell>
                                  <TableCell><ApproximateLocation location={login.location} /></TableCell>
                                  <TableCell>{dayjs(login.created_at).format('MMM D, YYYY h:mm A')}</TableCell>
                                  <TableCell>Successful</TableCell>
                                  <TableCell>
                                    Signed in · {[login.browser, login.device || login.device_type].filter(Boolean).join(' · ') || 'Device unknown'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="info">No devices recorded yet. Future successful sign-ins will appear here.</Alert>
                      )}
                    </CardContent>
                  </Card>

                </>
              )}

              {activeTab === 'notifications' && (
                <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <MarkEmailReadOutlined color="primary" />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Notifications</Typography>
                      <Typography variant="body2" color="text.secondary">Updates and alerts for your account.</Typography>
                    </Box>
                  </Stack>
                  {loadingNotifications ? (
                    <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>
                  ) : notifications.length ? (
                    <Stack spacing={1.25}>
                      {notifications.map(notification => (
                        <Box
                          key={notification.id}
                          sx={{
                            p: 2,
                            position: 'relative',
                            pr: { sm: 6 },
                            border: 1,
                            borderColor: notification.is_read ? 'divider' : 'primary.main',
                            borderRadius: 1,
                            backgroundColor: notification.is_read ? 'background.paper' : 'action.hover',
                            '&:hover .notification-delete, &:focus-within .notification-delete': { opacity: 1 },
                          }}
                        >
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                            <Box>
                              <Typography variant="subtitle2">{notification.title}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{notification.body}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                {dayjs(notification.created_at).format('MMM D, YYYY h:mm A')}
                              </Typography>
                            </Box>
                            {!notification.is_read && (
                              <Button size="small" onClick={() => markNotificationRead(notification.id)}>
                                Mark read
                              </Button>
                            )}
                          </Stack>
                          <IconButton
                            className="notification-delete"
                            aria-label="Delete notification"
                            title="Delete notification"
                            size="small"
                            onClick={() => deleteNotification(notification.id)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              opacity: { xs: 1, sm: 0 },
                              transition: 'opacity 120ms ease, background-color 120ms ease',
                            }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <NotificationsOutlined color="action" sx={{ fontSize: 34, mb: 1 }} />
                      <Typography fontWeight={600}>You&apos;re all caught up</Typography>
                      <Typography variant="body2" color="text.secondary">New account notifications will appear here.</Typography>
                    </Box>
                  )}
                </CardContent>
                </Card>
              )}

            </Stack>
          )}
          {activeTab === 'billing' && ['admin', 'owner'].includes(String(profile?.role || '').toLowerCase()) && <Billing />}
            {activeTab === 'account' && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} color="error.main">Delete account</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                    Your sign-in and personal profile will be removed. Organization, employee, and billing records will be retained.
                  </Typography>
                  <Stack spacing={2} alignItems="flex-start">
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={deleteConfirmed}
                          onChange={event => setDeleteConfirmed(event.target.checked)}
                        />
                      )}
                      label="I confirm my account deactivation"
                    />
                    <Button
                      size="small"
                      color="error"
                      variant="contained"
                      disabled={!deleteConfirmed}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Deactivate account
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
        </>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingAccount && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>Delete your account?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This removes your login and profile details. Your organization and billing records remain.
          </Alert>
          <Stack spacing={1}>
            <TextField
              fullWidth
              label="Current password"
              size="small"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={event => setDeletePassword(event.target.value)}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteDialogOpen(false)} disabled={deletingAccount}>Keep account</Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={deleteAccount}
            disabled={!deleteConfirmed || !deletePassword || deletingAccount}
            startIcon={deletingAccount ? <CircularProgress size={16} color="inherit" /> : <DeleteOutline />}
          >
            Delete account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default EditProfile
