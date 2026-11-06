export interface ChangelogChange {
  type: string
  scope?: string
  title: string
  description?: string
  id?: string
  url?: string
}

export interface ChangelogModule {
  name: string
  version: string
}

export interface ChangelogVersion {
  tag: string
  title: string
  date: string
  notes?: string | null
  message?: string | null
  changes: ChangelogChange[]
  modules: ChangelogModule[]
}

export const useChangelogService = () => ({
  findAll: () => $fetch<ChangelogVersion[]>('/api/changelog')
})
