export interface SelectOption {
  label: string
  value: string | number | boolean
}

export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'hidden'

export interface BaseField {
  name: string
  label?: string
  type: FieldType
  placeholder?: string
  disabled?: boolean
  span?: 1 | 2
  options?: { label: string; value: any }[]
}
