'use client'

import { useCallback, useEffect, useState } from 'react'
import { Box, Button, Card, Chip, Stack, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import GlobalExportMenu from '@components/GlobalExportMenu'
import { getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const formatDate = value => {
  if (!value) return '-'
  const date = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '-'
}

const getSelectedRows = (rows, selectionModel) => rows.filter(row => (
  selectionModel.type === 'exclude'
    ? !selectionModel.ids.has(row.id)
    : selectionModel.ids.has(row.id)
))

const Tenants = () => {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectionModel, setSelectionModel] = useState({ type: 'include', ids: new Set() })

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true)
      const api = await getApi()
      const { data } = await api.get('/tenants')
      setTenants(data)
    } catch (error) {
      notifyGlobal(error.response?.data?.detail || 'Failed to load tenants.', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  const columns = [
    {
      field: 'tenant_name',
      headerName: 'Tenant',
      flex: 1.2,
      minWidth: 180,
      exportHeader: 'Tenant',
    },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 220, exportHeader: 'Email' },
    {
      field: 'plan',
      headerName: 'Plan',
      flex: 0.8,
      minWidth: 120,
      valueGetter: value => value ? String(value).replaceAll('_', ' ') : '-',
      exportHeader: 'Plan',
      exportValue: row => row.plan ? String(row.plan).replaceAll('_', ' ') : '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 130,
      renderCell: params => {
        const active = String(params.value || '').toLowerCase() === 'active'
        return <Chip label={active ? 'Active' : 'Inactive'} size='small' color={active ? 'success' : 'default'} />
      },
      exportHeader: 'Status',
      exportValue: row => String(row.status || '').toLowerCase() === 'active' ? 'Active' : 'Inactive',
    },
    {
      field: 'created_at',
      headerName: 'Created',
      flex: 0.9,
      minWidth: 130,
      valueGetter: value => formatDate(value),
      exportHeader: 'Created',
      exportValue: row => formatDate(row.created_at),
    },
  ]

  const exportColumns = columns.map(column => ({
    field: column.field,
    header: column.exportHeader || column.headerName,
    value: column.exportValue,
  }))
  const selectedTenants = getSelectedRows(tenants, selectionModel)

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        flex: 1,
        minHeight: 0,
        flexDirection: "column",
      }}
    >
      <Stack direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        pb={2}
      >
        <Box>
          <Typography  variant="h5" fontWeight={700}>Tenant</Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          <GlobalExportMenu
            rows={selectedTenants}
            columns={exportColumns}
            filename='tenants'
            title='Tenant list'
            disabled={loading}
          />
          <Button startIcon={<RefreshIcon />} size="small" onClick={fetchTenants} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Card className="app-grid-container">
        <DataGrid
          rows={tenants}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
          checkboxSelection
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={setSelectionModel}
          disableRowSelectionOnClick
          density="compact"
        />
      </Card>

    </Box>
  )
}

export default Tenants
