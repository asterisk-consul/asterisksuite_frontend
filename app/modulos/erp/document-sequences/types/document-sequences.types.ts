export interface DocumentSequence {
  id: string
  name: string
  point_of_sale: string
  prefix?: string | null
  range_start?: number | null
  range_end?: number | null
  current_number: number
  automatic: boolean
  active: boolean
  created_at?: string
  updated_at?: string
  document_type_links?: {
    document_types: { id: string; code: string; description: string }
  }[]
}

export interface CreateDocumentSequenceInput {
  name: string
  point_of_sale: string
  prefix?: string
  range_start?: number
  range_end?: number
  automatic?: boolean
  document_type_ids?: string[]
}

export interface UpdateDocumentSequenceInput extends Partial<CreateDocumentSequenceInput> {}
