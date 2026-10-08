'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar, Box, Card, CardActionArea, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { Business, Groups, Person, Work, Refresh, Domain } from '@mui/icons-material'
import IconButton from '@mui/material/IconButton'
import { getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const initialSummary = {
  companies: 0,
  active_companies: 0,
  tenants: 0,
  positions: 0,
  employees: 0,
  active_employees: 0,
  users: 0,
  recent_employees: []
}

const Dashboard = () => {
  const [summary, setSummary] = useState(initialSummary)
  const [loading, setLoading] = useState(true)

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true)
      const api = await getApi()
      const { data } = await api.get('/dashboard/summary')
      setSummary({ ...initialSummary, ...data })
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Unable to load dashboard data.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const cards = [
    { label: 'Employees', value: summary.employees, detail: `${summary.active_employees} active`, icon: <Groups />, color: '#2563eb', href: '/employees' },
    { label: 'Companies', value: summary.companies, detail: `${summary.active_companies} active`, icon: <Business />, color: '#059669', href: '/companies' },
    { label: 'Positions', value: summary.positions, detail: 'Defined positions', icon: <Work />, color: '#d97706', href: '/positions' },
    { label: 'Users', value: summary.users, detail: 'Users', icon: <Person />, color: '#7c3aed', href: '/users' },
    { label: 'Tenants', value: summary.tenants, detail: 'Organizations', icon: <Person />, color: '#0891b2', href: '/tenants' }
  ]

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
        <Box>
          <Typography variant='h4' fontWeight={700}>HR Dashboard</Typography>
          <Typography color='text.secondary'>A live overview of your workforce and organization.</Typography>
        </Box>
        <IconButton onClick={loadSummary} disabled={loading} aria-label='Refresh dashboard'>
          {loading ? <CircularProgress size={20} /> : <Refresh />}
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          gap: 3,
          mb: 4,
        }}
      >
        {cards.map(card => {
          const content = (
            <CardContent>
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography color='text.secondary' variant='body2'>{card.label}</Typography>
                  <Typography variant='h3' fontWeight={700} sx={{ my: 1 }}>{loading ? '—' : card.value}</Typography>
                  <Typography variant='body2' color='text.secondary'>{card.detail}</Typography>
                </Box>
                <Avatar sx={{ backgroundColor: `${card.color}18`, color: card.color, width: 48, height: 48 }}>{card.icon}</Avatar>
              </Stack>
            </CardContent>
          )

          return (
            <Card key={card.label} sx={{ borderRadius: 3, height: '100%' }}>
                {card.href ? (
                  <CardActionArea component={Link} href={card.href} sx={{ height: '100%' }}>
                    {content}
                  </CardActionArea>
                ) : content}
            </Card>
          )
        })}
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant='h6' fontWeight={700} sx={{ mb: 2 }}>Recently added employees</Typography>
          {loading && <CircularProgress size={24} />}
          {!loading && summary.recent_employees.length === 0 && (
            <Typography color='text.secondary'>No employees have been added yet.</Typography>
          )}
          {!loading && summary.recent_employees.map(employee => (
            <Stack key={employee.id} direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Box>
                <Typography fontWeight={600}>{employee.name}</Typography>
                <Typography variant='body2' color='text.secondary'>{employee.position_title}</Typography>
              </Box>
              <Typography variant='body2' color='text.secondary'>{employee.company_name}</Typography>
            </Stack>
          ))}
        </CardContent>
      </Card>
    </Box>
  )
}

export default Dashboard
