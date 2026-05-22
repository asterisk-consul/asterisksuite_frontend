export interface Category {
  id: string

  name: string
  slug?: string | null

  parent_id?: string | null

  active?: boolean

  parent?: Category | null
  children?: Category[]

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CategoryTreeNode
  extends Category {
  children: CategoryTreeNode[]
  level?: number
}

export interface CreateCategoryInput {
  name: string

  slug?: string

  parent_id?: string

  active?: boolean
}

export interface UpdateCategoryInput
  extends Partial<CreateCategoryInput> {}
