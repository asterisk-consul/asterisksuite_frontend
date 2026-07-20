const buildForm = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export const FileService = {
  async importCompras(file: File) {
    return await $fetch('/api/data-import/compras', {
      method: 'POST',
      body: buildForm(file)
    })
  },
  async importVentas(file: File) {
    return await $fetch('/api/data-import/ventas', {
      method: 'POST',
      body: buildForm(file)
    })
  },
  async importNotaCredito(file: File) {
    return await $fetch('/api/data-import/nota-credito', {
      method: 'POST',
      body: buildForm(file)
    })
  },
  async importNotaDebito(file: File) {
    return await $fetch('/api/data-import/nota-debito', {
      method: 'POST',
      body: buildForm(file)
    })
  },
  async importParties(file: File) {
    return await $fetch('/api/master-data/business-parties/import', {
      method: 'POST',
      body: buildForm(file)
    })
  }
}
