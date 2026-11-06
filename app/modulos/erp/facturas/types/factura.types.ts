// factura-form.types.ts

export interface Tax {
  id: string
  name: string
  code: string
  rate: number
}

export interface Product {
  id: string
  name: string
  code: string
}

export interface DocumentItemTax {
  tax_id: string

  tax_rate: number

  tax_amount: number

  taxes?: Tax
}

export interface DocumentItem {
  id: string

  product_id: string | null

  item_instructions?: string | null

  quantity: number

  purchase_unit_id?: string | null

  unit_conversion_factor?: number

  stock_quantity?: number

  unit_price: number

  original_unit_price?: number

  /** Bonificación comercial aplicada sobre el precio unitario de lista. */
  discount_percentage?: number

  /** Importe neto exacto del renglón, opcional para ajustar redondeos del proveedor. */
  net_subtotal_override?: number | null

  /** Neto visible ingresado manualmente en el formulario de compras. */
  subtotal_override?: number | null

  /** Importe exacto de bonificación ingresado manualmente en compras. */
  discount_amount_override?: number | null

  price: number

  products?: Product | null

  document_item_taxes?: DocumentItemTax[]
}

export interface DocumentTax {
  tax_id: string

  tax_rate: number

  taxable_base: number

  tax_amount: number

  taxes?: Tax
}

export interface CommercialAdjustment {
  concept: string
  value_type: 'PERCENTAGE' | 'AMOUNT'
  basis: 'NET' | 'GROSS'
  value: number
  base_amount?: number
  calculated_amount?: number
  net_discount?: number
  tax_reduction?: number
  total_reduction?: number
}

export interface Document {
  id: string

  updated_at?: string

  created_by?: string | null

  creator?: {
    id: string
    name?: string | null
    email?: string | null
  } | null

  number: number
  document_type_id: string
  parent_document_id?: string | null
  parent_document?: Partial<InvoiceReferenceDocument> | null
  document_sequence_id?: string | null

  document_sequences?: {
    id: string
    name: string
    point_of_sale: string
    prefix?: string | null
    current_number?: number
  } | null

  party_id: string | null
  warehouse_id?: string | null

  fiscal_jurisdiction_id?: string | null

  currency_code?: string | null

  exchange_rate?: number | null

  rate_type?: string | null

  date: string

  status: number

  subtotal: number

  exempt_amount: number

  total_taxes: number

  total: number

  assigned_to?: string | null

  amounts_visible?: boolean
  monetary_visibility?: {
    restricted_by_status?: boolean
    paid_percentage?: number | null
    required_percentage?: number | null
  } | null

  paid_amount?: number | null

  descrip?: string | null

  ref?: string | null

  document_types?: {
    id: string
    code: string
    description: string
    direction: number
    category?: string | null
    affects_payment?: boolean
  } | null

  commercial_operation?: {
    payment_document_basis?: 'ORDER' | 'INVOICE' | 'BOTH' | null
    ordered_total?: number | null
    paid_total?: number | null
    delivery_status?: string | null
    delivery_note_id?: string | null
  } | null

  orden_venta_doc?: Record<string, any> | null
  orden_compra_doc?: Record<string, any> | null

  business_parties?: {
    id: string
    name: string
    tax_id?: string | null
  } | null

  items: FacturaItem[]

  document_items?: DocumentItem[]

  document_taxes?: DocumentTax[]

  commercial_adjustments?: CommercialAdjustment[] | null
  fiscal_authorization_code?: string | null
}

export interface InvoiceReferenceParty {
  id: string
  name: string
  type: string
  business_names: string | null
  email: string | null
  tax_id: string | null
  vat_condition: string | null
  exemption_rate: number | string
  active: boolean
  roles: Array<{ id: string; role: string; active: boolean }>
}

export interface InvoiceReferenceItem {
  id: string
  product_id: string | null
  variant_id: string | null
  quantity: number | string
  quantity_invoiced: number | string | null
  unit_price: number | string
  products: { name: string } | null
  product_variants: { name: string | null } | null
}

/** Datos livianos de una factura usados al buscar o vincular una NC/ND. */
export interface InvoiceReferenceDocument {
  id: string
  number: number
  date: string
  total: number | string
  party_id: string | null
  currency_code: string | null
  ref: string | null
  descrip: string | null
  document_types: { code: string } | null
  business_parties: InvoiceReferenceParty | null
  document_items?: InvoiceReferenceItem[]
}

export interface FacturaTax {
  tax_id: string

  name?: string

  code?: string

  tax_rate: number

  taxable_base?: number

  tax_amount: number

  calculation_level?: 'line' | 'document'

  is_included_in_price?: boolean
}

export interface FacturaItem {
  id?: string

  product_id: string | null

  item_instructions?: string | null

  /** Estado visual del formulario; no forma parte del payload. */
  instructions_expanded?: boolean

  variant_id?: string | null

  variant_name?: string | null

  warehouse_id?: string | null

  product_name?: string

  product_code?: string

  quantity: number

  purchase_unit_id?: string | null

  unit_conversion_factor?: number

  stock_quantity?: number

  unit_price: number

  original_unit_price?: number

  discount_percentage?: number

  /** Manual net amount for supplier lines; taxes remain calculated separately. */
  net_subtotal_override?: number | null

  /** Manual displayed subtotal for supplier lines. */
  subtotal_override?: number | null

  /** Manual discount amount entered for supplier lines. */
  discount_amount_override?: number | null

  price: number

  subtotal?: number

  taxes: FacturaTax[]

  total_taxes?: number

  total: number
}

export interface FacturaFormValues {
  id?: string

  updated_at?: string

  document_type_id: string

  parent_document_id?: string | null

  parent_document?: Partial<InvoiceReferenceDocument> | null

  document_sequence_id?: string | null

  party_id: string | null

  fiscal_jurisdiction_id?: string | null

  warehouse_id?: string | null

  currency_code?: string

  exchange_rate?: number | null

  rate_type?: string | null

  date: string

  descrip: string

  ref: string

  status?: number

  subtotal: number

  exempt_amount: number

  taxable_base?: number

  total_taxes: number

  total: number

  items: FacturaItem[]

  document_taxes: FacturaTax[]

  commercial_adjustments?: CommercialAdjustment[]
}
