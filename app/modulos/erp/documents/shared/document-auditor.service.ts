export interface DocumentAuditor {
  id: string
  name: string
}

export interface DocumentActivityEvent {
  id: string
  event_type: string
  message: string
  from_status: number | null
  to_status: number | null
  created_at: string
  actor: DocumentAuditor | null
}

const assignmentUrl = '/api/backend/documents/assignment'
const salesDocumentsUrl = '/api/backend/documents/sales'

export const useDocumentAuditorService = () => ({
  findOne: (documentId: string) =>
    $fetch<DocumentAuditor | null>(`${assignmentUrl}/${documentId}/auditor`),
  assign: (documentId: string, userId: string | null) =>
    $fetch<DocumentAuditor | null>(`${assignmentUrl}/${documentId}/auditor`, {
      method: 'PATCH',
      body: { user_id: userId }
    }),
  findActivity: (documentId: string) =>
    $fetch<DocumentActivityEvent[]>(`${salesDocumentsUrl}/${documentId}/activity`)
})
