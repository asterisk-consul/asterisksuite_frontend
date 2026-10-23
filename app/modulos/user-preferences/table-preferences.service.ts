export interface TablePreferences {
  tableKey: string
  columnOrder: string[]
  columnVisibility: Record<string, boolean>
}

export interface SavedTablePreferences {
  columnOrder: unknown
  columnVisibility: unknown
  updatedAt: string
}

const endpoint = '/api/backend/user-preferences/table'

export const tablePreferencesService = {
  get: (tableKey: string) => $fetch<SavedTablePreferences | null>(endpoint, {
    query: { tableKey }
  }),

  save: (preferences: TablePreferences) => $fetch<SavedTablePreferences>(endpoint, {
    method: 'PUT',
    body: preferences
  })
}
