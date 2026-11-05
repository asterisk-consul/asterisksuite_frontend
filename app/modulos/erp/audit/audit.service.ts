import type { TableFilter } from '~/components/Tablas/types/tablas.types'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'

export interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  old_data: unknown
  new_data: unknown
  changed_by: string | null
  changed_at: string
  ip_address: string | null
  request_id: string | null
  action: AuditAction
  user: { id: string; name: string; email: string } | null
}

export interface AuditLogQuery {
  limit?: number
  offset?: number
  table?: string
  record_id?: string
  action?: AuditAction
  user_id?: string
  days?: number
  search?: string
  filters?: string | TableFilter[]
  sort?: string
  order?: 'asc' | 'desc'
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

const baseUrl = '/api/backend/erp/audit'

export const useAuditService = () => ({
  findAll: (query: AuditLogQuery) =>
    $fetch<AuditLogResponse>(baseUrl, {
      query: {
        ...query,
        filters: Array.isArray(query.filters) ? JSON.stringify(query.filters) : query.filters,
      },
    }),
})
