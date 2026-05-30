import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

export interface ProductFormState extends CreateProductDto {
  category_ids: string[]
  tag_ids: string[]
}
