import type { DocumentSequence } from './types/document-sequences.types'

const urlBase = '/api/backend/document-sequences'

export const useDocumentSequencesService = () => {
  const previewNextNumber = (documentTypeId: string, sequenceId?: string) => {
    return $fetch<{
      next_number: number
      point_of_sale: string | null
      prefix: string | null
      formatted: string
      source: 'SEQUENCE' | 'DOCUMENT_TYPE'
    }>(`${urlBase}/preview/next-number`, {
      query: { document_type_id: documentTypeId, ...(sequenceId ? { sequence_id: sequenceId } : {}) },
      timeout: 6_000,
      retry: 1,
      retryDelay: 300
    })
  }

  const findAll = () => {
    return $fetch<DocumentSequence[]>(urlBase, { method: 'GET', timeout: 10_000, retry: 1 })
  }

  const findOne = (id: string) => {
    return $fetch<DocumentSequence>(`${urlBase}/${id}`)
  }

  const create = (data: Partial<DocumentSequence>) => {
    return $fetch<DocumentSequence>(urlBase, { method: 'POST', body: data })
  }

  const update = (id: string, data: Partial<DocumentSequence>) => {
    return $fetch<DocumentSequence>(`${urlBase}/${id}`, { method: 'PATCH', body: data })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, { method: 'DELETE' })
  }

  return { findAll, findOne, create, update, remove, previewNextNumber }
}
