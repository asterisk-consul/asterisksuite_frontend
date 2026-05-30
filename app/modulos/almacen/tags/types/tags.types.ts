export interface Tag {
  id: string

  name: string

  active?: boolean

  created_at?: string
  updated_at?: string
  deleted_at?: string | null

  created_by?: string | null
  updated_by?: string | null
  deleted_by?: string | null
}

export interface CreateTagInput {
  name: string

  active?: boolean
}

export interface UpdateTagInput extends Partial<CreateTagInput> {}
