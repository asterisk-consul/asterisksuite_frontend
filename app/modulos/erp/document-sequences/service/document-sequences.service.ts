import type { DocumentSequence } from './types/document-sequences.types'

const urlBase = '/api/erp/document-sequences'

export const useDocumentSequencesService = () => {
  const findAll = () => {
    return $fetch<DocumentSequence[]>(urlBase, { method: 'GET' })
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

  return { findAll, findOne, create, update, remove }
}
