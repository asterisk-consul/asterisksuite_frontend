import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  label: string
  width?: number
  format?: (value: any, row: any) => string
}

export interface ExportOptions {
  filename: string
  sheetName?: string
  columns: ExportColumn[]
  data: any[]
}

export function useExcelExport() {
  const exportToExcel = (options: ExportOptions) => {
    const { filename, sheetName = 'Datos', columns, data } = options

    // Build header row
    const headers = columns.map(col => col.label)

    // Build data rows
    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col.key]
        if (col.format) {
          return col.format(value, row)
        }
        return value ?? ''
      })
    })

    // Create worksheet
    const wsData = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths
    ws['!cols'] = columns.map(col => ({
      wch: col.width || 15
    }))

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Download
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const exportWithTemplate = (options: ExportOptions & { template?: any[] }) => {
    const { filename, sheetName = 'Datos', columns, data, template = [] } = options

    // Template row (headers)
    const headers = columns.map(col => col.label)

    // Example row from template or first data row
    const exampleRow = template.length > 0
      ? template[0]
      : data.length > 0
        ? columns.map(col => {
            const value = data[0][col.key]
            return col.format ? col.format(value, data[0]) : value ?? ''
          })
        : columns.map(() => '')

    // Data rows
    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col.key]
        if (col.format) {
          return col.format(value, row)
        }
        return value ?? ''
      })
    })

    // Create worksheet with headers + example + data
    const wsData = [headers, exampleRow, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths
    ws['!cols'] = columns.map(col => ({
      wch: col.width || 15
    }))

    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Download
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  return {
    exportToExcel,
    exportWithTemplate
  }
}
