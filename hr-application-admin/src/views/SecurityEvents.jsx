'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import Refresh from '@mui/icons-material/Refresh'
import { getApi } from '@core/api'
import ApproximateLocation from '@components/security/ApproximateLocation'

const getLoginStatus = event => {
  if (!['/auth/login', '/user/login'].includes(event.endpoint)) return 'Not a login event'
  if (event.status_code === 429) return 'Blocked'
  if (event.status_code === 401) return 'Failed'
  if (event.status_code === 200) return 'Successful'
  return 'Unknown'
}

const SecurityEvents = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const api = await getApi()
      const { data } = await api.get('/auth/security-events')
      setEvents(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load suspicious activity.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return events

    return events.filter(event => [
      event.user_name,
      event.user_email,
      event.ip_address,
      event.location,
      event.method,
      event.endpoint,
      event.status_code,
      getLoginStatus(event),
      event.reason,
      event.action,
    ].some(value => String(value ?? '').toLowerCase().includes(query)))
  }, [events, search])

  const columns = useMemo(() => [
    {
      field: 'account',
      headerName: 'Account / user',
      minWidth: 200,
      flex: 1.1,
      valueGetter: (_, row) => (
        row.user_name || row.user_email
          ? [row.user_name, row.user_email].filter(Boolean).join(' · ')
          : 'Unknown / unauthenticated'
      ),
    },
    {
      field: 'login_status',
      headerName: 'Login status',
      minWidth: 130,
      flex: 0.65,
      sortable: false,
      valueGetter: (_, row) => getLoginStatus(row),
    },
    {
      field: 'ip_address',
      headerName: 'Source IP',
      minWidth: 140,
      flex: 0.7,
      valueGetter: value => value || 'Unknown',
    },
    {
      field: 'location',
      headerName: 'Approximate location',
      minWidth: 170,
      flex: 0.9,
      sortable: false,
      renderCell: params => <ApproximateLocation location={params.value} />,
    },
    {
      field: 'created_at',
      headerName: 'Timestamp',
      minWidth: 170,
      flex: 0.9,
      valueGetter: value => value ? new Date(value) : null,
      valueFormatter: value => value ? dayjs(value).format('MMM D, YYYY h:mm A') : 'Unknown',
    },
    {
      field: 'endpoint',
      headerName: 'Endpoint / action',
      minWidth: 220,
      flex: 1.1,
      valueGetter: (value, row) => (
        `${row.method || ''} ${value || ''}${row.status_code ? ` · HTTP ${row.status_code}` : ''}`.trim()
      ),
    },
    {
      field: 'reason',
      headerName: 'Reason',
      minWidth: 240,
      flex: 1.2,
    },
    {
      field: 'action',
      headerName: 'Current security action',
      minWidth: 210,
      flex: 1,
    },
  ], [])

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" fontWeight={700}>Security monitoring</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Review suspicious activity such as repeated failed sign-ins, denied requests, nonexistent endpoints, and unusual request frequency.
          IP-based locations are approximate and do not establish a person&apos;s identity or physical location.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              label="Search activity"
              value={search}
              onChange={event => setSearch(event.target.value)}
              sx={{ width: { xs: '100%', sm: 320 } }}
            />
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
              onClick={loadEvents}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          {error ? (
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={loadEvents}>Retry</Button>
            }>
              {error}
            </Alert>
          ) : loading ? (
            <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Card className="app-grid-container">
              {filteredEvents.length ? (
                <DataGrid
                  rows={filteredEvents}
                  columns={columns}
                  getRowId={row => row.id}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  disableRowSelectionOnClick
                  density="compact"
                  getRowHeight={() => 'auto'}
                  sx={{
                    '& .MuiDataGrid-cell': { py: 1, alignItems: 'center' },
                    '& .MuiDataGrid-cell[data-field="reason"], & .MuiDataGrid-cell[data-field="endpoint"]': {
                      whiteSpace: 'normal',
                      lineHeight: 1.4,
                    },
                  }}
                />
              ) : (
                <Alert severity="info">
                  {events.length ? 'No activity matches your search.' : 'No suspicious activity has been recorded.'}
                </Alert>
              )}
            </Card>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default SecurityEvents
