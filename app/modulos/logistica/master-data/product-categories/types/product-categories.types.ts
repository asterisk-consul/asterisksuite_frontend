import type {
  Category
} from '~/modulos/almacen/categories/types/categories.types'

export interface ProductCategory {
  product_id: string

  category_id: string

  categories?: Category

  created_at?: string
  deleted_at?: string | null
}

export interface AssignProductCategoryInput {
  product_id: string

  category_id: string
}

export interface BulkAssignProductCategoriesInput {
  product_id: string

  category_ids: string[]
}
