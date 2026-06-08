export enum AttributeType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN'
}

export interface Attribute {
  id: string

  name: string
  code: string

  type: AttributeType

  active?: boolean

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateAttributeInput {
  name: string
  code: string

  type: AttributeType

  active?: boolean
}

export interface UpdateAttributeInput
  extends Partial<CreateAttributeInput> {}
