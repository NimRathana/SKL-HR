'use client'

import { useState } from 'react'
import {
  Button,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import {
  ArrowDropDown as ArrowDropDownIcon,
  DescriptionOutlined as CsvIcon,
  FileDownloadOutlined as ExportIcon,
  PictureAsPdfOutlined as PdfIcon,
  TableViewOutlined as ExcelIcon,
} from '@mui/icons-material'
import { exportData } from '@core/utils/exportData'
import { notifyGlobal } from '@core/notifications'

const formats = [
  { id: 'xlsx', label: 'Excel workbook', description: 'Formatted spreadsheet (.xlsx)', Icon: ExcelIcon, color: '#18864b' },
  { id: 'pdf', label: 'PDF document', description: 'Ready to share or print (.pdf)', Icon: PdfIcon, color: '#d14343' },
  { id: 'csv', label: 'CSV file', description: 'Plain-text table data (.csv)', Icon: CsvIcon, color: '#3478c8' },
]

const GlobalExportMenu = ({ rows, columns, filename, title, disabled = false }) => {
  const [anchorElement, setAnchorElement] = useState(null)
  const [exporting, setExporting] = useState(false)
  const menuOpen = Boolean(anchorElement)

  const handleExport = async format => {
    setAnchorElement(null)
    setExporting(true)
    try {
      await exportData({ format, rows, columns, filename, title })
      notifyGlobal(`${title || 'Data'} exported successfully.`, 'success')
    } catch (error) {
      notifyGlobal(error?.message || `Failed to export ${title || 'data'}.`, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button
        variant='outlined'
        size='small'
        startIcon={exporting ? <CircularProgress size={15} color='inherit' /> : <ExportIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={event => setAnchorElement(event.currentTarget)}
        disabled={disabled || exporting || rows.length === 0}
        aria-haspopup='menu'
        aria-expanded={menuOpen ? 'true' : undefined}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorElement}
        open={menuOpen}
        onClose={() => setAnchorElement(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: { mt: 1, minWidth: 260, borderRadius: 2, p: 0.5 },
          },
          list: { 'aria-label': `Export ${title || 'data'} as` },
        }}
      >
        <Typography variant='overline' color='text.secondary' sx={{ px: 1.5, pt: 0.75, display: 'block' }}>
          Choose a format
        </Typography>
        {formats.map(({ id, label, description, Icon, color }) => (
          <MenuItem key={id} onClick={() => handleExport(id)} sx={{ borderRadius: 1.5, py: 1 }}>
            <ListItemIcon sx={{ color, minWidth: 38 }}>
              <Icon fontSize='small' />
            </ListItemIcon>
            <ListItemText
              primary={label}
              secondary={description}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default GlobalExportMenu
