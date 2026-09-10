export function usePartiesImportExport() {
  const importOpen = ref(false)
  const { canImport, canExport } = useDataTransferPermissions()
  const allowImport = computed(() => canImport('business_parties.import'))
  const allowExport = computed(() => canExport('business_parties.export'))

  const handleExportExcel = () => {
    window.open('/api/master-data/business-parties/export?format=xlsx', '_blank')
  }

  const handleExportCSV = () => {
    window.open('/api/master-data/business-parties/export?format=csv', '_blank')
  }

  const downloadTemplate = () => {
    window.open('/api/master-data/business-parties/export/template', '_blank')
  }

  const dataActions = computed(() => [
    ...(allowExport.value ? [
      { label: 'Exportar Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel },
      { label: 'Exportar CSV', icon: 'i-lucide-file-text', onSelect: handleExportCSV }
    ] : []),
    ...(allowImport.value ? [
      { label: 'Descargar plantilla Excel', icon: 'i-lucide-file-down', onSelect: downloadTemplate },
      { label: 'Importar datos', icon: 'i-lucide-upload', onSelect: () => { importOpen.value = true } }
    ] : [])
  ])

  return { importOpen, allowImport, allowExport, handleExportExcel, handleExportCSV, downloadTemplate, dataActions }
}
