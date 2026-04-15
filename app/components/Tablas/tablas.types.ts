import type { TableColumn } from '@nuxt/ui'

export type FilterType = 'text' | 'date-range'

export type ExtendedColumn<T> = TableColumn<T> & {
  accessorKey?: string
  meta?: {
    filterType?: FilterType
  }
}
export interface TableApi<T> {
  getState: () => {
    pagination: {
      pageIndex: number
      pageSize: number
    }
  }

  setPageIndex: (index: number) => void

  getFilteredSelectedRowModel: () => {
    rows: Array<{ original: T }>
  }

  getFilteredRowModel: () => {
    rows: Array<{ original: T }>
  }

  getColumn: (id: string) =>
    | {
        setFilterValue: (v: unknown) => void
        toggleVisibility?: (value?: boolean) => void
        getIsVisible?: () => boolean
        getCanHide?: () => boolean
      }
    | undefined

  setGlobalFilter: (v: unknown) => void

  // 👇 🔥 ESTO ES LO QUE FALTA
  getAllColumns: () => Array<{
    id: string
    getIsVisible: () => boolean
    getCanHide: () => boolean
    toggleVisibility: (value?: boolean) => void
  }>
}
export interface UTableInstance<T> extends ComponentPublicInstance {
  tableApi: TableApi<T> | null
}
