const baseUrl = '/api/backend/fiscal-authorizations'

export const useFiscalAuthorizationsService = () => ({
  findAll: () => $fetch<any[]>(baseUrl),
  getSettings: () => $fetch<any>(`${baseUrl}/settings/current`),
  saveSettings: (body: Record<string, unknown>) => $fetch<any>(`${baseUrl}/settings/current`, { method: 'PUT', body }),
  create: (body: Record<string, unknown>) => $fetch<any>(baseUrl, { method: 'POST', body }),
  update: (id: string, body: Record<string, unknown>) => $fetch<any>(`${baseUrl}/${id}`, { method: 'PUT', body }),
  remove: (id: string) => $fetch<void>(`${baseUrl}/${id}`, { method: 'DELETE' }),
  getDocumentStatus: (documentId: string) => $fetch<any>(`${baseUrl}/documents/${documentId}/status`),
  getDocumentPreview: (documentId: string) => $fetch<any>(`${baseUrl}/documents/${documentId}/preview`),
  replaceForDocument: (documentId: string, body: Record<string, unknown>) =>
    $fetch<any>(`${baseUrl}/documents/${documentId}/replace`, { method: 'PATCH', body }),
})
