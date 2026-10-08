'use client'

import { useState } from 'react'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { Close, UploadFile } from '@mui/icons-material'
import ExcelJS from 'exceljs'
import { getApi } from '@core/api'
import { notifyGlobal } from '@core/notifications'

const SHEET_NAMES = ['Companies', 'Positions', 'Employees']

const getErrorMessage = (error, fallback) => {
  const detail = error.response?.data?.detail

  if (typeof detail === 'string') return detail
  if (detail && typeof detail.message === 'string') return detail.message
  if (Array.isArray(detail)) return detail.map(item => item.msg || String(item)).join(', ')

  return fallback
}

const normalizeDateValue = value => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  if (!match) return value

  const [, month, day, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const getCellValue = (cell, header) => {
  const value = cell.value

  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && value.text) return value.text
  if (typeof value === 'object' && value.richText) return value.richText.map(part => part.text).join('')

  const text = String(value).trim()
  return ['Date of birth', 'Hire date'].includes(header) ? normalizeDateValue(text) : text
}

const ImportWorkbookButton = ({ onImported }) => {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [sheets, setSheets] = useState(null)
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)

  const closeDialog = () => {
    if (reading || importing) return
    setOpen(false)
    setFile(null)
    setSheets(null)
  }

  const selectFile = async event => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    setFile(null)
    setSheets(null)

    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      notifyGlobal('Choose an Excel workbook with the .xlsx extension.', 'error')
      return
    }

    try {
      setReading(true)
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await selectedFile.arrayBuffer())
      const parsedSheets = {}

      SHEET_NAMES.forEach(sheetName => {
        const worksheet = workbook.getWorksheet(sheetName)
        if (!worksheet || worksheet.rowCount < 2) return

        const headers = worksheet.getRow(1).values.slice(1).map(value => String(value || '').trim())
        const rows = []

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return
          const values = {}
          headers.forEach((header, index) => {
            if (header) values[header] = getCellValue(row.getCell(index + 1), header)
          })
          if (Object.values(values).some(value => value !== '')) rows.push(values)
        })

        if (rows.length) parsedSheets[sheetName.toLowerCase()] = rows
      })

      if (!Object.keys(parsedSheets).length) {
        throw new Error('No Companies, Positions, or Employees data was found in this workbook.')
      }

      setFile(selectedFile)
      setSheets(parsedSheets)
    } catch (error) {
      notifyGlobal(error.message || 'This workbook could not be read.', 'error')
    } finally {
      setReading(false)
    }
  }

  const importWorkbook = async () => {
    if (!sheets) return

    try {
      setImporting(true)
      const api = await getApi()
      const response = await api.post('/imports/workbook', sheets, { suppressGlobalErrorNotification: true })
      const result = response.data
      const inserted = result.inserted || {}
      const updated = result.updated || {}
      const skipped = result.skipped || {}
      const summarize = values => `${values.companies || 0} companies, ${values.positions || 0} positions, ${values.employees || 0} employees`

      await onImported()
      setOpen(false)
      setFile(null)
      setSheets(null)
      notifyGlobal(`Import complete. Added ${summarize(inserted)}. Updated ${summarize(updated)}. Kept existing ${summarize(skipped)} unchanged.`, 'success')
    } catch (error) {
      notifyGlobal(getErrorMessage(error, 'Import failed. No records were changed.'), 'error')
    } finally {
      setImporting(false)
    }
  }

  const rowSummary = sheets ? `${sheets.companies?.length || 0} companies, ${sheets.positions?.length || 0} positions, ${sheets.employees?.length || 0} employees` : ''

  return (
    <>
      <Button size='small' variant='outlined' startIcon={<UploadFile />} onClick={() => setOpen(true)}>
        Import
      </Button>
      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth='sm'>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <UploadFile /> Import Excel workbook
          </Box>
          <IconButton size='small' onClick={closeDialog} disabled={reading || importing} aria-label='Close import dialog'>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity='info'>
              Choose an exported .xlsx workbook. Companies are checked first, then positions and employees. Matching companies update their name, phone, email, and parent; matching employees update gender and non-empty email. Other existing fields are kept unchanged. If any row has a problem, the entire import is rolled back.
            </Alert>
            <Button component='label' variant='outlined' startIcon={reading ? <CircularProgress size={16} /> : <UploadFile />} disabled={reading || importing}>
              {reading ? 'Reading workbook...' : file ? 'Choose a different file' : 'Choose .xlsx file'}
              <input hidden type='file' accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' onChange={selectFile} />
            </Button>
            {file && (
              <Typography variant='body2' color='text.secondary' aria-live='polite'>
                {file.name} - {rowSummary} ready
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={reading || importing}>Cancel</Button>
          <Button variant='contained' onClick={importWorkbook} disabled={!sheets || reading || importing} startIcon={importing ? <CircularProgress size={16} color='inherit' /> : <UploadFile />}>
            {importing ? 'Importing...' : 'Import workbook'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ImportWorkbookButton