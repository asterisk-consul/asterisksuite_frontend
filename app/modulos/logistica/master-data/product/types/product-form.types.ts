import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

export interface ProductFormState extends CreateProductDto {
  cost_currency_id?: string
  category_ids: string[]
  tag_ids: string[]
}
