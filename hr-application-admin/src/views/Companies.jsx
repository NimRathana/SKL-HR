'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import { Add, Business, Cancel, Close, ContentCopy, Edit, FileDownload, PeopleAlt, PersonOutline, Refresh, Save, WorkOutline } from '@mui/icons-material'
import { DataGrid } from '@mui/x-data-grid'
import ExcelJS from 'exceljs'
import { getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'
import ImportWorkbookButton from '@components/ImportWorkbookButton'
import GlobalExportMenu from '@components/GlobalExportMenu';

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  parent_id: ''
}

const DEFAULT_COMPANY_STORAGE_KEY = 'defaultCompanyId'

const getErrorMessage = (error, fallback) => {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map(item => typeof item === 'string' ? item : item.msg || 'Validation error').join(', ')
  }

  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') return detail.msg || fallback

  return fallback
}

const getSelectedRows = (rows, selectionModel) => rows.filter(row => (
  selectionModel.type === 'exclude'
    ? !selectionModel.ids.has(row.id)
    : selectionModel.ids.has(row.id)
));

const CompaniesPage = () => {
  const [companies, setCompanies] = useState([])
  const [selectionModel, setSelectionModel] = useState({ type: 'include', ids: new Set() });
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [users, setUsers] = useState([])
  const [companyAssignments, setCompanyAssignments] = useState([])
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [defaultCompanyId, setDefaultCompanyId] = useState('')
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportCompany, setExportCompany] = useState(null)
  const [exportData, setExportData] = useState({ companies: [], positions: [], employees: [] })
  const [exportSelection, setExportSelection] = useState({ companies: true, positions: false, employees: false })
  const [exportLoading, setExportLoading] = useState(false)
  const [exportGenerating, setExportGenerating] = useState(false)
  const [exportError, setExportError] = useState('')

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const api = await getApi()
      const [companiesResponse, usersResponse, assignmentsResponse] = await Promise.all([
        api.get('/companies'),
        api.get('/users'),
        api.get('/company-users')
      ])
      setCompanies(Array.isArray(companiesResponse.data) ? companiesResponse.data : [])
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : [])
      setCompanyAssignments(Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : [])
    } catch (err) {
      notifyGlobal(getErrorMessage(err, 'Failed to load companies.'), 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    setDefaultCompanyId(window.localStorage.getItem(DEFAULT_COMPANY_STORAGE_KEY) || '')
  }, [])

  const handleDefaultCompanyChange = companyId => {
    setDefaultCompanyId(previousId => {
      const nextId = previousId === companyId ? '' : companyId

      if (nextId) {
        window.localStorage.setItem(DEFAULT_COMPANY_STORAGE_KEY, nextId)
      } else {
        window.localStorage.removeItem(DEFAULT_COMPANY_STORAGE_KEY)
      }

      return nextId
    })
  }

  const updateField = event => {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
  }

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
    setForm(EMPTY_FORM)
    setEditingCompany(null)
    setIsDuplicating(false)
  }

  const openCreateDialog = () => {
    setEditingCompany(null)
    setIsDuplicating(false)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = company => {
    setEditingCompany(company)
    setIsDuplicating(false)
    setForm({
      name: company.name || '',
      code: company.code || '',
      description: company.description || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      parent_id: company.parent_id || ''
    })
    setDialogOpen(true)
  }

  const openDuplicateDialog = company => {
    setEditingCompany(null)
    setIsDuplicating(true)
    setForm({
      name: '',
      code: '',
      description: company.description || '',
      address: company.address || '',
      phone: company.phone || '',
      email: '',
      website: company.website || '',
      parent_id: company.parent_id || ''
    })
    setDialogOpen(true)
  }

  const handleCreate = async event => {
    event.preventDefault()
    try {
      setSaving(true)
      const api = await getApi()
      const payload = { ...form, parent_id: form.parent_id || null }
      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, payload)
      } else {
        await api.post('/companies', payload)
      }
      notifyGlobal(editingCompany ? 'Company updated.' : isDuplicating ? 'Company duplicated.' : 'Company created.', 'success')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      setEditingCompany(null)
      setIsDuplicating(false)
      await fetchCompanies()
    } catch (err) {
      notifyGlobal(getErrorMessage(err, 'Failed to save company.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async company => {
    const status = company.status === 'active' ? 'inactive' : 'active'
    try {
      const api = await getApi()
      await api.patch(`/companies/${company.id}/status`, { status })
      setCompanies(previous => previous.map(item => item.id === company.id ? { ...item, status } : item))
      notifyGlobal(status === 'active' ? 'Company activated.' : 'Company deactivated.', 'success')
    } catch (err) {
      notifyGlobal(getErrorMessage(err, 'Failed to update company status.'), 'error')
    }
  }

  const openUserAssignmentDialog = company => {
    setSelectedCompany(company)
    setSelectedUsers(
      companyAssignments
        .filter(assignment => assignment.company_id === company.id)
        .map(assignment => users.find(user => user.id === assignment.user_id))
        .filter(Boolean)
    )
    setUserDialogOpen(true)
  }

  const closeUserAssignmentDialog = () => {
    if (assignmentSaving) return
    setUserDialogOpen(false)
    setSelectedCompany(null)
    setSelectedUsers([])
  }

  const saveUserAssignments = async event => {
    event.preventDefault()
    if (!selectedCompany) return

    try {
      setAssignmentSaving(true)
      const api = await getApi()
      const existingAssignments = companyAssignments.filter(assignment => assignment.company_id === selectedCompany.id)
      const selectedUserIds = new Set(selectedUsers.map(user => user.id))
      const existingUserIds = new Set(existingAssignments.map(assignment => assignment.user_id))
      const newUserIds = selectedUsers
        .filter(user => !existingUserIds.has(user.id))
        .map(user => user.id)

      await Promise.all([
        ...existingAssignments
          .filter(assignment => !selectedUserIds.has(assignment.user_id))
          .map(assignment => api.delete(`/company-users/${assignment.id}`)),
        ...(newUserIds.length
          ? [api.post(`/company-users/companies/${selectedCompany.id}/users`, { user_ids: newUserIds })]
          : [])
      ])

      notifyGlobal('Company user assignments saved.', 'success')
      setUserDialogOpen(false)
      setSelectedCompany(null)
      setSelectedUsers([])
      await fetchCompanies()
    } catch (err) {
      notifyGlobal(getErrorMessage(err, 'Failed to update user assignments.'), 'error')
    } finally {
      setAssignmentSaving(false)
    }
  }

  const openExportDialog = async company => {
    setExportCompany(company)
    setExportData({ companies: [], positions: [], employees: [] })
    setExportSelection({ companies: true, positions: false, employees: false })
    setExportError('')
    setExportDialogOpen(true)

    try {
      setExportLoading(true)
      const api = await getApi()
      const [companiesResponse, positionsResponse, employeesResponse] = await Promise.all([
        api.get('/companies'),
        api.get('/positions'),
        api.get('/employees')
      ])
      const companyRows = (Array.isArray(companiesResponse.data) ? companiesResponse.data : [])
        .filter(item => String(item.id) === String(company.id))
      const positionRows = (Array.isArray(positionsResponse.data) ? positionsResponse.data : [])
        .filter(item => String(item.company_id) === String(company.id))
      const employeeRows = (Array.isArray(employeesResponse.data) ? employeesResponse.data : [])
        .filter(item => String(item.company_id) === String(company.id))

      setExportData({ companies: companyRows, positions: positionRows, employees: employeeRows })
      setExportSelection({
        companies: companyRows.length > 0,
        positions: positionRows.length > 0,
        employees: employeeRows.length > 0
      })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load company export data.')
      setExportError(message)
      notifyGlobal(message, 'error')
    } finally {
      setExportLoading(false)
    }
  }

  const exportSelectedData = async () => {
    const selectedGroups = [
      { label: 'Companies', key: 'companies' },
      { label: 'Positions', key: 'positions' },
      { label: 'Employees', key: 'employees' }
    ].filter(group => exportSelection[group.key])
    const companyById = new Map(companies.map(company => [String(company.id), company]))
    const positionById = new Map(exportData.positions.map(position => [String(position.id), position]))
    const fieldsByType = {
      companies: ['Company name', 'Company code', 'Parent company', 'Address', 'Email', 'Phone', 'Website', 'Description'],
      positions: ['Company', 'Code', 'Title', 'Description'],
      employees: ['Company', 'Position', 'First name', 'Last name', 'Gender', 'Hire date', 'Date of birth', 'Phone', 'Email', 'Address']
    }
    const getExportRow = (key, row) => {
      if (key === 'companies') {
        return {
          'Company name': row.name,
          'Company code': row.code,
          'Parent company': companyById.get(String(row.parent_id))?.name,
          Address: row.address,
          Email: row.email,
          Phone: row.phone,
          Website: row.website,
          Description: row.description
        }
      }

      if (key === 'positions') {
        return {
          Company: companyById.get(String(row.company_id))?.name || exportCompany?.name,
          Code: row.code,
          Title: row.title,
          Description: row.description
        }
      }

      return {
        Company: companyById.get(String(row.company_id))?.name || exportCompany?.name,
        Position: positionById.get(String(row.position_id))?.title,
        'First name': row.first_name,
        'Last name': row.last_name,
        Gender: row.gender,
        'Hire date': row.hire_date,
        'Date of birth': row.date_of_birth,
        Phone: row.phone,
        Email: row.email,
        Address: row.address
      }
    }
    const filename = (exportCompany?.name || 'company').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '')
    const workbook = new ExcelJS.Workbook()

    workbook.creator = 'HR Application'
    workbook.subject = `Company data export for ${exportCompany?.name || 'company'}`
    workbook.created = new Date()

    try {
      setExportGenerating(true)
      setExportError('')

      selectedGroups.forEach(group => {
        const headers = fieldsByType[group.key]
        const worksheet = workbook.addWorksheet(group.label)

        worksheet.columns = headers.map(header => ({
          header,
          key: header,
          width: header === 'Description' || header === 'Address' ? 32 : Math.min(Math.max(header.length + 4, 16), 28)
        }))
        worksheet.addRows(exportData[group.key].map(row => getExportRow(group.key, row)))
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: headers.length }
        }

        const headerRow = worksheet.getRow(1)
        headerRow.height = 24
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } }
        headerRow.alignment = { vertical: 'middle', wrapText: true }
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) row.alignment = { vertical: 'top', wrapText: true }
        })
      })

      const workbookBuffer = await workbook.xlsx.writeBuffer()
      const blobUrl = URL.createObjectURL(new Blob([workbookBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }))
      const downloadLink = document.createElement('a')

      downloadLink.href = blobUrl
      downloadLink.download = `${filename || 'company'}-export.xlsx`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      notifyGlobal('Company workbook exported.', 'success')
      setExportDialogOpen(false)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create the Excel workbook.')
      setExportError(message)
      notifyGlobal(message, 'error')
    } finally {
      setExportGenerating(false)
    }
  }

  const columns = [
    {
      field: 'name',
      headerName: 'Company name',
      flex: 1.4,
      minWidth: 190,
    },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 190 },
    {
      field: 'parent_id',
      headerName: 'Parent company',
      flex: 1.2,
      minWidth: 180,
      renderCell: params => companies.find(company => company.id === params.value)?.name || ''
    },
    {
      field: 'assigned_users',
      headerName: 'Assigned users',
      flex: 1.4,
      minWidth: 220,
      sortable: false,
      filterable: false,
      display: 'flex',
      renderCell: params => {
        const assignedUsers = companyAssignments
          .filter(assignment => assignment.company_id === params.row.id)
          .map(assignment => assignment.user_name || users.find(user => user.id === assignment.user_id)?.name)
          .filter(Boolean)

        if (!assignedUsers.length) {
          return <Typography variant='body2' color='text.secondary'>No users assigned</Typography>
        }

        const visibleUsers = assignedUsers.slice(0, 2)
        const remainingCount = assignedUsers.length - visibleUsers.length

        return (
          <Tooltip title={assignedUsers.join(', ')}>
            <Stack direction='row' spacing={0.5} alignItems='center' sx={{ overflow: 'hidden' }}>
              {visibleUsers.map(userName => (
                <Chip key={userName} label={userName} size='small' sx={{ maxWidth: 110 }} />
              ))}
              {remainingCount > 0 && <Chip label={`+${remainingCount}`} size='small' color='primary' />}
            </Stack>
          </Tooltip>
        )
      }
    },
    { field: 'phone', headerName: 'Phone', flex: 1, minWidth: 140 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      exportValue: row =>
        String(row.status || '').toLowerCase() === 'active'
          ? 'Active'
          : 'Inactive',
      renderCell: params => {
        const isActive = params.value === 'active'

        return (
          <Chip
            label={isActive ? 'Active' : 'Inactive'}
            size='small'
            color={isActive ? 'primary' : 'default'}
          />
        )
      }
    },
    {
      field: 'default',
      headerName: 'Default',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      exportValue: row => defaultCompanyId === row.id,
      renderCell: params => {
        const isDefault = defaultCompanyId === params.row.id

        return (
          <Tooltip title={isDefault ? 'Unset default company' : 'Set as default company'}>
            <Switch
              size='small'
              checked={isDefault}
              color='primary'
              inputProps={{
                'aria-label': isDefault ? `Unset ${params.row.name} as default company` : `Set ${params.row.name} as default company`
              }}
              onChange={() => handleDefaultCompanyChange(params.row.id)}
            />
          </Tooltip>
        )
      }
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 220,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',

      renderCell: params => {
        const isActive = params.row.status === 'active'

        return (
          <Stack direction='row' spacing={1} alignItems='center' justifyContent='center' width='100%' height='100%'>
            <Tooltip title='Edit company'>
              <IconButton
                size='small'
                color='primary'
                aria-label='Edit company'
                onClick={() => openEditDialog(params.row)}
              >
                <Edit fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Assign users'>
              <IconButton
                size='small'
                color='primary'
                aria-label={`Assign users to ${params.row.name}`}
                onClick={() => openUserAssignmentDialog(params.row)}
              >
                <PeopleAlt fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Duplicate company'>
              <IconButton
                size='small'
                color='primary'
                aria-label={`Duplicate ${params.row.name}`}
                onClick={() => openDuplicateDialog(params.row)}
              >
                <ContentCopy fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Export Excel'>
              <IconButton
                size='small'
                color='primary'
                aria-label={`Export Excel data for ${params.row.name}`}
                disabled={exportLoading || exportGenerating}
                onClick={() => openExportDialog(params.row)}
              >
                <i className='ri-file-excel-2-line' aria-hidden='true' />
              </IconButton>
            </Tooltip>
            <Tooltip title={isActive ? 'Deactivate company' : 'Activate company'}>
              <Switch
                checked={isActive}
                color='primary'
                inputProps={{
                  'aria-label': isActive ? 'Deactivate company' : 'Activate company'
                }}
                onChange={() => handleStatusChange(params.row)}
              />
            </Tooltip>
          </Stack>
        )
      }
    }
  ]

  const exportOptions = [
    { key: 'companies', label: 'Companies', count: exportData.companies.length, Icon: Business },
    { key: 'positions', label: 'Positions', count: exportData.positions.length, Icon: WorkOutline },
    { key: 'employees', label: 'Employees', count: exportData.employees.length, Icon: PersonOutline }
  ].filter(option => option.key === 'companies' || option.count > 0)
  const selectedExportTypes = exportOptions.filter(option => exportSelection[option.key])
  const selectedExportRecordCount = selectedExportTypes.reduce((total, option) => total + option.count, 0)

  const exportColumns = columns.map(column => ({
      field: column.field,
      header: column.exportHeader || column.headerName,
      value: column.exportValue,
    }))
    const selectedCompanies = getSelectedRows(companies, selectionModel)

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={1} pb={2}>
        <Typography variant='h5' fontWeight={700}>
          Companies
        </Typography>
        <Stack direction='row' spacing={1}>
          <GlobalExportMenu
            rows={selectedCompanies}
            columns={exportColumns}
            filename='companies'
            title='Company list'
            disabled={loading}
          />
          <Button size="small" onClick={fetchCompanies} startIcon={<Refresh />} disabled={loading}>
            Refresh
          </Button>
          <ImportWorkbookButton onImported={fetchCompanies} />
          <Button size="small" variant='contained' startIcon={<Add />} onClick={openCreateDialog} disabled={loading}>
            Add
          </Button>
        </Stack>
      </Stack>


      <Card className="app-grid-container">
        <DataGrid
          rows={companies}
          columns={columns}
          loading={loading}
          getRowId={row => row.id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          checkboxSelection
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={setSelectionModel}
          disableRowSelectionOnClick
          density='compact'
        />
      </Card>

      <Dialog
        open={exportDialogOpen}
        onClose={() => !exportLoading && !exportGenerating && setExportDialogOpen(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pb: 1.5 }}>
          <Stack direction='row' spacing={1.5} alignItems='center' minWidth={0}>
            <Box sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, flexShrink: 0, borderRadius: 1, backgroundColor: 'action.selected', color: 'primary.main' }}>
              <FileDownload />
            </Box>
            <Box minWidth={0}>
              <Typography variant='h6' fontWeight={700}>Export company data</Typography>
              <Typography variant='body2' color='text.secondary' noWrap>{exportCompany?.name || 'Company'}</Typography>
            </Box>
          </Stack>
          <IconButton
            size='small'
            aria-label='Close export dialog'
            onClick={() => setExportDialogOpen(false)}
            disabled={exportLoading || exportGenerating}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {exportLoading || exportGenerating ? (
            <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='center' py={5}>
              <CircularProgress size={22} />
              <Typography variant='body2' color='text.secondary'>
                {exportGenerating ? 'Preparing your workbook...' : 'Loading company data...'}
              </Typography>
            </Stack>
          ) : exportError ? null : (
            <Stack spacing={1.25} pt={1}>
              <Typography variant='subtitle2' color='text.secondary'>Include in file</Typography>
              <Stack spacing={1}>
                {exportOptions.map(({ key, label, count, Icon }) => {
                  const isSelected = exportSelection[key]

                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={event => setExportSelection(previous => ({ ...previous, [key]: event.target.checked }))}
                        />
                      }
                      label={
                        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1.5} width='100%'>
                          <Stack direction='row' alignItems='center' spacing={1.25}>
                            <Icon sx={{ color: isSelected ? 'primary.main' : 'text.secondary' }} fontSize='small' />
                            <Typography variant='body2' fontWeight={isSelected ? 600 : 500}>{label}</Typography>
                          </Stack>
                          <Chip label={`${count} records`} size='small' variant='outlined' />
                        </Stack>
                      }
                      sx={{
                        m: 0,
                        px: 1,
                        py: 0.5,
                        width: '100%',
                        border: '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        backgroundColor: isSelected ? 'action.selected' : 'transparent',
                        transition: 'background-color 140ms ease, border-color 140ms ease',
                        '&:hover': { backgroundColor: 'action.hover' },
                        '& .MuiFormControlLabel-label': { flex: 1 }
                      }}
                    />
                  )
                })}
              </Stack>
              <Box aria-live='polite' sx={{ px: 1.5, py: 1, borderRadius: 1, backgroundColor: 'action.hover' }}>
                <Typography variant='body2' fontWeight={600}>
                  {selectedExportTypes.length} data types, {selectedExportRecordCount} records selected
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <Button size='small' onClick={() => setExportDialogOpen(false)} disabled={exportLoading || exportGenerating}>Cancel</Button>
          <Button
            size='small'
            variant='contained'
            startIcon={exportGenerating ? <CircularProgress size={16} color='inherit' /> : <FileDownload />}
            onClick={exportSelectedData}
            disabled={exportLoading || exportGenerating || Boolean(exportError) || !Object.values(exportSelection).some(Boolean)}
          >
            {exportGenerating ? 'Preparing...' : 'Export Excel workbook'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={userDialogOpen}
        onClose={closeUserAssignmentDialog}
        fullWidth
        maxWidth='sm'
        PaperProps={{ component: 'form', onSubmit: saveUserAssignments }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction='row' spacing={1.25} alignItems='center'>
            <PeopleAlt color='primary' />
            <Box>
              <Typography variant='h6' fontWeight={700}>Assign Users</Typography>
              <Typography variant='caption' color='text.secondary'>
                {selectedCompany?.name || 'Select users for this company'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={closeUserAssignmentDialog} disabled={assignmentSaving} aria-label='Close assign users dialog'>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={users.filter(user => String(user.role || '').toLowerCase() === 'hr')}
            value={selectedUsers}
            onChange={(_, value) => setSelectedUsers(value)}
            getOptionLabel={user => `${user.name || 'Unnamed user'} (${user.email})`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={params => (
              <TextField
                {...params}
                label='Users'
                placeholder={selectedUsers.length ? '' : 'Select one or more users'}

              />
            )}
            renderOption={(props, user) => (
              <li {...props} key={user.id}>
                <Stack>
                  <Typography variant='body2' fontWeight={600}>{user.name || 'Unnamed user'}</Typography>
                  <Typography variant='caption' color='text.secondary'>{user.email}</Typography>
                </Stack>
              </li>
            )}
            noOptionsText='No users available'
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" color="error" onClick={closeUserAssignmentDialog} disabled={assignmentSaving} startIcon={<Cancel />}> Cancel </Button>
          <Button size="small" type='submit' variant='contained' disabled={assignmentSaving} startIcon={assignmentSaving ? <CircularProgress size={16} color='inherit' /> : <PeopleAlt />}>
            Save Assignments
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth='sm' PaperProps={{ component: 'form', onSubmit: handleCreate }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {editingCompany ? <Edit /> : isDuplicating ? <ContentCopy /> : <Add />}
            {editingCompany ? "Edit Company" : isDuplicating ? "Duplicate Company" : "Add Company"}
          </Box>
          <IconButton onClick={closeDialog} disabled={saving}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField name='name' label='Company name' size='small' value={form.name} onChange={updateField} required fullWidth />
              <TextField name='code' label='Company code' size='small' value={form.code} onChange={updateField} required fullWidth />
            </Stack>
            <FormControl fullWidth>
              <InputLabel
                id='parent-company-label'
                sx={{
                  top: '50%',
                  transform: 'translate(14px, -50%)',
                  '&.MuiInputLabel-shrink': {
                    top: 0,
                    transform: 'translate(14px, -50%) scale(0.75)'
                  }
                }}
              >
                Parent company
              </InputLabel>
              <Select
                labelId='parent-company-label'
                name='parent_id'
                label='Parent company'
                value={form.parent_id}
                onChange={updateField}
                size='small'
              >
                {companies
                  .filter(company => company.id !== editingCompany?.id)
                  .map(company => (
                    <MenuItem key={company.id} value={company.id}>
                      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ width: '100%', gap: 1 }}>
                        <span>{company.name} ({company.code})</span>
                        <Chip
                          size='small'
                          label={company.status || 'Unknown'}
                          color={String(company.status).toLowerCase() === 'active' ? 'success' : 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Stack>
                    </MenuItem>
                  ))}
              </Select>
              {form.parent_id && (
                <Tooltip title='Clear parent company'>
                  <IconButton
                    size='small'
                    aria-label='Clear parent company'
                    onMouseDown={event => event.stopPropagation()}
                    onClick={() => setForm(previous => ({ ...previous, parent_id: '' }))}
                    sx={{
                      position: 'absolute',
                      right: 28,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 1,
                      p: 2.35
                    }}
                  >
                    <Close fontSize='small' />
                  </IconButton>
                </Tooltip>
              )}
            </FormControl>

            <TextField name='address' size='small' label='Address' value={form.address} onChange={updateField} fullWidth />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField name='email' size='small' label='Email' type='email' value={form.email} onChange={updateField} fullWidth />
              <TextField name='phone' size='small' label='Phone' value={form.phone} onChange={updateField} fullWidth />
            </Stack>
            <TextField name='website' size='small' label='Website' value={form.website} onChange={updateField} fullWidth />
            <TextField name='description' size='small' label='Description' value={form.description} onChange={updateField} multiline minRows={2} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" color="error" onClick={closeDialog} disabled={saving} startIcon={<Cancel />}> Cancel </Button>
          <Button size="small" type='submit' variant='contained' disabled={saving} startIcon={<Save />}>{editingCompany ? 'Save Changes' : isDuplicating ? 'Create Duplicate' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CompaniesPage
