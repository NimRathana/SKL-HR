'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'
import SaveIcon from '@mui/icons-material/Save'

import { getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const SystemParameters = () => {
  const [parameters, setParameters] = useState([])
  const [originalParameters, setOriginalParameters] = useState([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRole(sessionStorage.getItem('authRole') || '')
    fetchParameters()
  }, [])

  const fetchParameters = async () => {
    try {
      setLoading(true)
      const api = await getApi()
      const response = await api.get('/system-parameters')
      setParameters(response.data)
      setOriginalParameters(response.data)
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Failed to load system parameters', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateParameter = (parameter, value) => {
    const normalizedValue = parameter.type === 'Boolean' ? (value ? 'True' : 'False') : value
    setParameters(previous => previous.map(row => (
      row.id === parameter.id ? { ...row, value: normalizedValue } : row
    )))
  }

  const saveParameters = async () => {
    const changedParameters = parameters.filter(parameter => {
      const original = originalParameters.find(row => row.id === parameter.id)
      return original?.value !== parameter.value
    })

    if (!changedParameters.length) return

    try {
      setSaving(true)
      const api = await getApi()
      const responses = await Promise.all(
        changedParameters.map(parameter => (
          api.patch(`/system-parameters/${parameter.id}`, { value: parameter.value })
        ))
      )
      const updatedParameters = responses.map(response => response.data)
      setParameters(previous => previous.map(row => (
        updatedParameters.find(updated => updated.id === row.id) || row
      )))
      setOriginalParameters(previous => previous.map(row => (
        updatedParameters.find(updated => updated.id === row.id) || row
      )))
      notifyGlobal('System parameters saved successfully', 'success')
    } catch (err) {
      notifyGlobal(err.response?.data?.detail || 'Failed to save system parameters', 'error')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = ['admin', 'owner'].includes(role.toLowerCase())
  const hasChanges = parameters.some(parameter => {
    const original = originalParameters.find(row => row.id === parameter.id)
    return original?.value !== parameter.value
  })

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 2,
      minWidth: 280,
      renderCell: params => (
        <Stack justifyContent='center' height='100%'>
          <Typography variant='body2' fontWeight={600}>{params.value}</Typography>
        </Stack>
      ),
    },
    {
      field: 'value',
      headerName: 'Value',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: params => {
        if (params.row.type === 'Boolean') {
          return (
            <Tooltip title={canEdit ? 'Update value' : 'Only admins can update parameters'}>
              <span>
                <Switch
                  checked={params.value === true || params.value === 'True'}
                  disabled={!canEdit || saving}
                  onChange={event => updateParameter(params.row, event.target.checked)}
                  size='small'
                />
              </span>
            </Tooltip>
          )
        }

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              size='small'
              variant='outlined'
              disabled={!canEdit || saving}
              type={params.row.type === 'Number' ? 'number' : 'text'}
              value={params.value ?? ''}
              onChange={event => {
                const value = event.target.value
                if (params.row.type === 'Number' && !/^\d*$/.test(value)) return
                setParameters(previous => previous.map(row => (
                  row.id === params.row.id ? { ...row, value } : row
                )))
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 34,
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                },
                '& .MuiOutlinedInput-input': {
                  px: 1.25,
                  py: 0.75,
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        )
      },
    },
    { field: 'type', headerName: 'Type', flex: 0.7, minWidth: 110 },
    { field: 'category', headerName: 'Category', flex: 1, minWidth: 130 },
  ]

  return (
    <Box sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          flex: 1,
          minHeight: 0,
          flexDirection: "column",
        }}
    >
    
    <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        pb={2}
        px={2}
        pt={2}
    >
        <Typography variant="h5" fontWeight={700}>
        System Parameters
        </Typography>
        <Button
        size="small"
        variant="contained"
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
        onClick={saveParameters}
        disabled={!canEdit || !hasChanges || saving || loading}
        >
        {saving ? 'Saving...' : 'Save'}
        </Button>
    </Stack>
        
      <Card className="app-grid-container">
        <DataGrid
            rows={parameters}
            columns={columns}
            loading={loading}
            getRowId={row => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
            density='compact'
          />
      </Card>
    </Box>
  )
}

export default SystemParameters
