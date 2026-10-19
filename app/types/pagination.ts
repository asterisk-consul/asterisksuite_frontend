export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
}

export interface ServerListParams {
  page: number
  pageSize: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  filters?: string
}
