'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Popper from '@mui/material/Popper'
import Typography from '@mui/material/Typography'

import { getApi } from '@core/api'
import { Card } from '@mui/material'
import { Cancel, Close } from '@mui/icons-material'

const NotificationDropdown = () => {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await (await getApi()).get('/notifications')
      setNotifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Load notifications failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 30000)
    return () => {
      window.clearInterval(interval)
    }
  }, [loadNotifications])

  const allNotifications = notifications

  const unreadNotifications = allNotifications.filter(
    notification => !notification.is_read
  )

  const unreadCount = unreadNotifications.length

  const handleToggle = event => {
    if (anchorEl) {
      setAnchorEl(null)
      return
    }

    setAnchorEl(event.currentTarget)
    loadNotifications()
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const formatDate = value => {
    if (!value) return ''

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
  }

  const getInitials = notification => {
    if (notification.avatar_name) {
      return notification.avatar_name
        .split(' ')
        .map(name => name.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    }

    if (notification.title) {
      return notification.title.charAt(0).toUpperCase()
    }

    return 'N'
  }

  const getAvatarColor = notification => {
    if (notification.isError) {
      return 'error.lighter'
    }

    return 'primary.lighter'
  }

  const handleNotificationClick = async notification => {
    handleClose()
    setSelectedNotification(notification)

    if (notification.is_read) return

    try {
      await (await getApi()).patch(
        `/notifications/${notification.id}/read`
      )

      setNotifications(previous =>
        previous.map(item =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      )
    } catch (error) {
      console.error('Mark notification as read failed:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    const unreadBackendNotifications = notifications.filter(
      notification => !notification.is_read
    )

    try {
      await Promise.all(
        unreadBackendNotifications.map(notification =>
          (async () => {
            await (await getApi()).patch(
              `/notifications/${notification.id}/read`
            )
          })()
        )
      )

      setNotifications(previous =>
        previous.map(notification => ({
          ...notification,
          is_read: true
        })        )
      )
    } catch (error) {
      console.error('Mark all notifications as read failed:', error)
    }
  }

  const handleDeleteNotification = async (event, notificationId) => {
    event.stopPropagation()
    try {
      await (await getApi()).delete(`/notifications/${notificationId}`)
      setNotifications(previous => previous.filter(item => item.id !== notificationId))
      if (selectedNotification?.id === notificationId) setSelectedNotification(null)
    } catch (error) {
      console.error('Delete notification failed:', error)
    }
  }

  return (
    <>
      <IconButton
        aria-label="Notifications"
        onClick={handleToggle}
        sx={{
          color: "text.primary",
          mr: 1,
          transition: "transform 0.3s ease-in-out",
          "&:hover": { transform: "rotate(15deg)" },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
            },
          }}
        >
          <i className="ri-notification-2-line" />
        </Badge>
      </IconButton>

      {/* Dropdown */}
      <Popper
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        placement="bottom-end"
        transition
        sx={{
          zIndex: 1300,
          mt: 1.5,
        }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={250}>
            <Card
              sx={{
                width: {
                  xs: 330,
                  sm: 385,
                },
                overflow: "hidden",
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  <Box
                    sx={{
                      px: 4,
                      py: 2.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 500,
                        fontSize: "1.125rem",
                        lineHeight: 1.5556,
                      }}
                    >
                      Notifications
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {unreadCount > 0 && (
                        <Chip
                          label={`${unreadCount} New`}
                          size="small"
                          color="primary"
                        />
                      )}

                      <IconButton
                        size="small"
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0 || loading}
                        sx={{
                          color: "text.secondary",
                          "&:hover": {
                            color: "primary.main",
                            backgroundColor: "action.hover",
                          },
                        }}
                      >
                        <i
                          className="ri-mail-open-line"
                          style={{
                            fontSize: 20,
                          }}
                        />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider />
                  <Box
                    sx={{
                      maxHeight: 430,
                      overflowY: "auto"
                    }}
                  >
                    {allNotifications.length === 0 ? (
                      <Box
                        sx={{
                          px: 4,
                          py: 6,
                          textAlign: "center",
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            mx: "auto",
                            mb: 2,
                            backgroundColor: "action.hover",
                            color: "text.secondary",
                          }}
                        >
                          <i className="ri-notification-off-line" />
                        </Avatar>

                        <Typography variant="body2" fontWeight={600}>
                          No notifications yet
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          New updates will appear here.
                        </Typography>
                      </Box>
                    ) : (
                      allNotifications.map((notification) => {
                        const unread = !notification.is_read;

                        return (
                          <ListItemButton
                            key={notification.id}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            sx={{
                              position: "relative",
                              px: 4,
                              py: 2,
                              alignItems: "flex-start",
                              gap: 2,
                              borderBottom: "1px solid var(--mui-palette-divider)",
                              "&:hover": {
                                backgroundColor: "action.selected",
                              },
                              "&:hover .notification-dismiss, &:focus-within .notification-dismiss": {
                                opacity: 1,
                              },
                            }}
                          >
                            <Avatar
                              src={notification.avatar || undefined}
                              alt=""
                              sx={{
                                width: 40,
                                height: 40,
                                flexShrink: 0,
                                fontSize: 14,
                                backgroundColor: getAvatarColor(notification),
                                color: notification.isError ? "error.main" : "primary.main",
                              }}
                            >
                              {notification.avatar ? null : notification.isError ? (
                                <i className="ri-error-warning-line" />
                              ) : (
                                getInitials(notification)
                              )}
                            </Avatar>

                            {/* Content */}

                            <ListItemText
                              disableTypography
                              sx={{
                                minWidth: 0,
                                m: 0,
                              }}
                              primary={
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: "text.primary",
                                    lineHeight: 1.5,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    pr: 2,
                                  }}
                                >
                                  {notification.title}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 1 }}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: "-webkit-box",
                                      overflow: "hidden",
                                      WebkitBoxOrient: "vertical",
                                      WebkitLineClamp: 2,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {notification.body}
                                  </Typography>

                                  {notification.created_at && (
                                    <Typography
                                      variant="caption"
                                      color="text.disabled"
                                      sx={{
                                        display: "block",
                                        mt: 0.75,
                                      }}
                                    >
                                      {formatDate(notification.created_at)}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />

                            <IconButton
                              className="notification-dismiss"
                              aria-label="Delete notification"
                              title="Delete notification"
                              size="small"
                              onClick={event => handleDeleteNotification(event, notification.id)}
                              sx={{
                                position: "absolute",
                                top: 15,
                                right: 8,
                                opacity: { xs: 1, sm: 0 },
                                transition: "opacity 120ms ease, background-color 120ms ease",
                              }}
                            >
                              <Close fontSize="small" />
                            </IconButton>

                            {/* Unread dot */}

                            {unread && (
                              <Box
                                sx={{
                                  width: 7,
                                  height: 7,
                                  mt: 1,
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  backgroundColor: notification.isError ? "error.main" : "primary.main",
                                }}
                              />
                            )}
                          </ListItemButton>
                        );
                      })
                    )}
                  </Box>
                  <Box sx={{ p: 2, borderTop: "1px solid var(--mui-palette-divider)" }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        handleClose();
                        router.push('/profile?tab=notifications')
                      }}
                      sx={{
                        textTransform: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        boxShadow: "none",
                        "&:hover": {
                          boxShadow: "none",
                        },
                      }}
                    >
                      View All Notifications
                    </Button>
                  </Box>
                </Box>
              </ClickAwayListener>
            </Card>
          </Fade>
        )}
      </Popper>
      <Dialog
        open={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        fullWidth
        maxWidth='sm'
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  backgroundColor: getAvatarColor(selectedNotification),
                  color: selectedNotification.isError ? 'error.main' : 'primary.main'
                }}
              >
                {selectedNotification.isError
                  ? <i className='ri-error-warning-line' />
                  : getInitials(selectedNotification)}
              </Avatar>
              <Typography component='span' variant='h6' fontWeight={700}>
                {selectedNotification.title}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedNotification.body}
              </Typography>
              {selectedNotification.created_at && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
                  {formatDate(selectedNotification.created_at)}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" startIcon={<Cancel />} size="small" onClick={() => setSelectedNotification(null)}>
                Cancel
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}

export default NotificationDropdown