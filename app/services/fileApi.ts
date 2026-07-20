// services/fileApi.ts
import { postData } from '@/composables/apiService'

const buildForm = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export const FileService = {
  async importCompras(file: File) {
    return await postData('/data-import/compras', buildForm(file))
  },
  async importVentas(file: File) {
    return await postData('/data-import/ventas', buildForm(file))
  },
  async importNotaCredito(file: File) {
    return await postData('/data-import/nota-credito', buildForm(file))
  },
  async importNotaDebito(file: File) {
    return await postData('/data-import/nota-debito', buildForm(file))
  },
  async importParties(file: File) {
    return await postData('/logistica/master-data/business-parties/import', buildForm(file))
  },
  async exportParties(format: string = 'xlsx', type?: string) {
    const params = new URLSearchParams({ format })
    if (type) params.append('type', type)
    return await $fetch(`/api/logistica/master-data/business-parties/export?${params.toString()}`, {
      responseType: 'blob'
    })
  },
  async downloadTemplateParties() {
    return await $fetch('/api/logistica/master-data/business-parties/export/template', {
      responseType: 'blob'
    })
  }
}
