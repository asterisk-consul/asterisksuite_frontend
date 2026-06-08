import type { Tag } from '~/modulos/almacen/tags/types/tags.types'

export interface ProductTag {
  product_id: string

  tag_id: string

  tags?: Tag

  created_at?: string
}

export interface AssignProductTagInput {
  product_id: string

  tag_id: string
}
