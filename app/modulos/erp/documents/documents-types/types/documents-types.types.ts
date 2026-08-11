export interface Tax {
  id: string

  code: string

  name: string

  tax_type: string

  rate: number | string

  calculation_level?: string

  is_percentage?: boolean

  active?: boolean
}

export interface DocumentTypeTax {
  id: string

  document_type_id: string

  tax_id: string

  created_at?: string

  created_by?: string | null

  taxes: Tax
}

export interface DocumentSequence {
  id: string

  name: string

  automatic?: boolean

  range_start?: number | null

  range_end?: number | null
}

export interface CustomFieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox'
  required?: boolean
  options?: string[]
  default_value?: any
  placeholder?: string
}

export type DocumentCategory = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'ORDER' | 'QUOTE' | 'RECEIPT' | 'REMITO'

export interface DocumentsType {
  id: string

  code: string

  description: string

  direction: number

  active?: boolean

  affects_accounting?: boolean

  affects_stock?: boolean

  affects_tax_book?: boolean

  affects_payment?: boolean

  document_sequence_id?: string | null

  module_id?: string | null

  category?: DocumentCategory | null

  letter_type?: string | null

  afip_code?: string | null

  requires_cae?: boolean

  is_electronic?: boolean

  custom_fields_config?: CustomFieldConfig[] | null

  system_modules?: {
    id: string
    code: string
    name: string
  } | null

  created_at?: string

  updated_at?: string | null

  created_by?: string | null

  updated_by?: string | null

  deleted_at?: string | null

  deleted_by?: string | null

  document_sequences?: DocumentSequence | null

  document_type_taxes?: DocumentTypeTax[]
}

export interface CreateDocumentsTypeDto {
  code: string

  description: string

  direction: number

  active?: boolean

  affects_accounting?: boolean

  affects_stock?: boolean

  affects_tax_book?: boolean

  affects_payment?: boolean

  document_sequence_id?: string

  category?: DocumentCategory

  letter_type?: string

  afip_code?: string

  requires_cae?: boolean

  is_electronic?: boolean

  custom_fields_config?: CustomFieldConfig[]
}

export interface UpdateDocumentsTypeDto extends Partial<CreateDocumentsTypeDto> {}
