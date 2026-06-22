import type {
  Attribute
} from '~/modulos/almacen/attributes/types/attributes.types'

export interface ProductAttributeValue {
  id: string

  product_id?: string | null
  variant_id?: string | null

  attribute_id: string

  text_value?: string | null
  number_value?: number | null
  boolean_value?: boolean | null

  attributes?: Attribute

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateProductAttributeValueInput {
  product_id?: string

  variant_id?: string

  attribute_id: string

  text_value?: string
  number_value?: number
  boolean_value?: boolean
}

export interface UpdateProductAttributeValueInput
  extends Partial<CreateProductAttributeValueInput> {}
