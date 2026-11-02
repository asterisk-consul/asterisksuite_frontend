export interface DocumentAssignee {
  id: string
  name: string
  email?: string
}

const baseUrl = '/api/backend/documents/assignment'

export const useDocumentAssignmentService = () => ({
  findOne: (documentId: string) => $fetch<DocumentAssignee | null>(`${baseUrl}/${documentId}`),
  findUsers: () => $fetch<DocumentAssignee[]>(`${baseUrl}/users`),
  assign: (documentId: string, userId: string | null) =>
    $fetch<DocumentAssignee>(`${baseUrl}/${documentId}`, { method: 'PATCH', body: { user_id: userId } }),
})
