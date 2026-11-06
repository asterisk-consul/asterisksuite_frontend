export const useDataImportService = () => {
  const upload = <T>(endpoint: string, formData: FormData) =>
    $fetch<T>(endpoint, { method: 'POST', body: formData })

  const uploadFile = <T = any>(endpoint: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return upload<T>(endpoint, formData)
  }

  return {
    upload,
    importCompras: (file: File) => uploadFile('/api/data-import/compras', file),
    importVentas: (file: File) => uploadFile('/api/data-import/ventas', file),
    importNotaCredito: (file: File) => uploadFile('/api/data-import/nota-credito', file),
    importNotaDebito: (file: File) => uploadFile('/api/data-import/nota-debito', file)
  }
}
