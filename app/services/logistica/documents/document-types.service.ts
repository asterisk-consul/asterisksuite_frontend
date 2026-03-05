import type {
  DocumentType,
  CreateDocumentTypeInput,
  DocumentEntity
} from '~/types/logistica/transport-document/document-types'

export const useDocumentTypesService = () => {
  /**
   * Obtener todos (opcional filtrar por entity)
   */
  const getAll = (entity?: DocumentEntity) =>
    $fetch<DocumentType[]>('/api/transport-document', {
      query: entity ? { entity } : undefined
    })

  /**
   * Crear tipo de documento
   */
  const create = (body: CreateDocumentTypeInput) =>
    $fetch<DocumentType>('/api/transport-document', {
      method: 'POST',
      body
    })

  /**
   * Desactivar (soft delete)
   */
  const deactivate = (id: string) =>
    $fetch<void>(`/api/transport-document/${id}/deactivate`, {
      method: 'PATCH'
    })

  return {
    getAll,
    create,
    deactivate
  }
}
