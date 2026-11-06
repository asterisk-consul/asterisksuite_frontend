export interface IntakeRecord {
  id: string
  title: string
  notes?: string | null
  suggested_type?: string | null
  status?: string
  created_at?: string
  [key: string]: unknown
}

const baseUrl = '/api/intake-records'

export const useIntakeRecordsService = () => ({
  findAll: () => $fetch<IntakeRecord[]>(baseUrl),
  create: (body: Record<string, unknown>) => $fetch<IntakeRecord>(baseUrl, { method: 'POST', body }),
  send: (id: string, assignedTo: string) => $fetch<IntakeRecord>(`${baseUrl}/${id}/send`, {
    method: 'POST', body: { assigned_to: assignedTo },
  }),
  start: (id: string) => $fetch<IntakeRecord>(`${baseUrl}/${id}/start`, { method: 'POST' }),
  complete: (id: string, targetType: string, targetId: string) => $fetch<IntakeRecord>(`${baseUrl}/${id}/complete`, {
    method: 'POST', body: { target_type: targetType, target_id: targetId },
  }),
  remove: (id: string) => $fetch<void>(`${baseUrl}/${id}`, { method: 'DELETE' }),
})
