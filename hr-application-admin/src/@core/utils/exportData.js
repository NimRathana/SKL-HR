import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const getCellValue = (row, column) => {
  const value = column.value ? column.value(row) : row[column.field]
  return value == null ? '' : value
}

const getRows = (rows, columns) => rows.map(row => columns.map(column => getCellValue(row, column)))

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const exportCsv = (rows, columns, filename) => {
  const escapeCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [
    columns.map(column => escapeCell(column.header)).join(','),
    ...getRows(rows, columns).map(row => row.map(escapeCell).join(',')),
  ].join('\r\n')

  downloadBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), filename)
}

const exportExcel = async (rows, columns, filename, title) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HR Application'
  workbook.subject = `${title} export`
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(title.slice(0, 31) || 'Export')
  worksheet.columns = columns.map(column => ({
    header: column.header,
    key: column.field,
    width: column.width || Math.min(Math.max(column.header.length + 4, 14), 32),
  }))
  worksheet.addRows(getRows(rows, columns))
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF263B63' },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  )
}

const exportPdf = (rows, columns, filename, title) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()

  pdf.setFontSize(18)
  pdf.setTextColor(38, 59, 99)
  pdf.text(title, 40, 42)
  pdf.setFontSize(9)
  pdf.setTextColor(110, 120, 135)
  pdf.text(`Exported ${new Date().toLocaleString()}`, 40, 60)

  autoTable(pdf, {
    head: [columns.map(column => column.header)],
    body: getRows(rows, columns).map(row => row.map(value => String(value))),
    startY: 76,
    margin: { left: 40, right: 40, bottom: 36 },
    styles: { fontSize: 8, cellPadding: 6, overflow: 'linebreak' },
    headStyles: { fillColor: [38, 59, 99], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 251] },
    didDrawPage: data => {
      pdf.setFontSize(8)
      pdf.setTextColor(110, 120, 135)
      pdf.text(`Page ${data.pageNumber}`, pageWidth - 40, pdf.internal.pageSize.getHeight() - 16, {
        align: 'right',
      })
    },
  })

  pdf.save(filename)
}

export const exportData = async ({ format, rows, columns, filename, title }) => {
  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    throw new Error('Export requires table rows and columns.')
  }
  if (!['csv', 'xlsx', 'pdf'].includes(format)) {
    throw new Error(`Unsupported export format: ${format}`)
  }

  const exportColumns = columns.filter(column => {
    const field = String(column.field || '').trim().toLowerCase()
    const header = String(column.header || '').trim().toLowerCase()
    return !['action', 'actions'].includes(field) && !['action', 'actions'].includes(header)
  })
  if (exportColumns.length === 0) {
    throw new Error('Export requires at least one data column.')
  }

  const safeName = String(filename || 'export').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
  const fileName = `${safeName}.${format}`
  const exportTitle = title || 'Data export'

  if (format === 'csv') return exportCsv(rows, exportColumns, fileName)
  if (format === 'xlsx') return exportExcel(rows, exportColumns, fileName, exportTitle)
  return exportPdf(rows, exportColumns, fileName, exportTitle)
}
