export function usePartiesImportExport() {
  const importOpen = ref(false)

  const handleExportExcel = () => {
    window.open('/api/master-data/business-parties/export?format=xlsx', '_blank')
  }

  const handleExportCSV = () => {
    window.open('/api/master-data/business-parties/export?format=csv', '_blank')
  }

  const downloadTemplate = () => {
    window.open('/api/master-data/business-parties/export/template', '_blank')
  }

  const dataActions = [
    { label: 'Exportar Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel },
    { label: 'Exportar CSV', icon: 'i-lucide-file-text', onSelect: handleExportCSV },
    { label: 'Descargar plantilla Excel', icon: 'i-lucide-file-down', onSelect: downloadTemplate },
    { label: 'Importar datos', icon: 'i-lucide-upload', onSelect: () => { importOpen.value = true } }
  ]

  return { importOpen, handleExportExcel, handleExportCSV, downloadTemplate, dataActions }
}
