export type OperationType = 'IMPORT' | 'EXPORT' | 'OTHER'
export type TransportType = 'MARITIME' | 'AIR' | 'LAND' | 'MULTIMODAL' | 'OTHER'
export type OperationStatus =
  | 'PLANNED'
  | 'IN_PREPARATION'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'CUSTOMS'
  | 'RELEASED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED'
export type ContainerType = 'TWENTY_DV' | 'FORTY_DV' | 'FORTY_HC' | 'FORTY_FIVE_HC' | 'OTHER'
export type ContainerStatus =
  | 'PREPARING'
  | 'LOADED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'CUSTOMS'
  | 'RELEASED'
  | 'DELIVERED'
  | 'CLOSED'
export type ContainerEventType =
  | 'LOADED_AT_ORIGIN'
  | 'DEPARTED_ORIGIN'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_PORT'
  | 'CUSTOMS'
  | 'RELEASED'
  | 'INLAND_TRANSPORT'
  | 'ARRIVED_AT_WAREHOUSE'
  | 'DELIVERED'
export type Incoterm =
  | 'EXW'
  | 'FCA'
  | 'FOB'
  | 'CFR'
  | 'CIF'
  | 'CPT'
  | 'CIP'
  | 'DAP'
  | 'DPU'
  | 'DDP'
export type InternationalExpenseType =
  | 'MERCHANDISE'
  | 'INTERNATIONAL_FREIGHT'
  | 'INSURANCE'
  | 'CUSTOMS_BROKER'
  | 'COMMERCIAL_AGENT'
  | 'PORT_EXPENSE'
  | 'STORAGE'
  | 'LOCAL_TRANSPORT'
  | 'CUSTOMS_DUTIES'
  | 'NACIONALIZACION'
  | 'OTHER'

export type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface InternationalOperation {
  id: string
  number: string
  name?: string
  operation_type: OperationType
  transport_type: TransportType
  status: OperationStatus
  primary_supplier_id?: string
  primary_supplier?: { id: string; name: string; tax_id?: string }
  origin_country?: string
  origin_location?: string
  origin_location_id?: string
  origin_loc?: { id: string; city?: string; province?: string; country?: string; address?: string }
  destination_country?: string
  destination_location?: string
  destination_location_id?: string
  destination_loc?: { id: string; city?: string; province?: string; country?: string; address?: string }
  estimated_departure_date?: string
  actual_departure_date?: string
  estimated_arrival_date?: string
  actual_arrival_date?: string
  currency_code?: string
  incoterm?: Incoterm
  responsible_user_id?: string
  notes?: string
  containers?: InternationalContainer[]
  operation_documents?: OperationDocumentRelation[]
  operation_payments?: OperationPaymentRelation[]
  operation_quotes?: OperationQuoteRelation[]
  purchase_orders?: PurchaseOrderRelation[]
  created_at?: string
  updated_at?: string
}

export interface InternationalContainer {
  id: string
  operation_id: string
  container_number: string
  container_type: ContainerType
  seal_number?: string
  booking_number?: string
  bill_of_lading?: string
  vessel_name?: string
  voyage_number?: string
  origin_port?: string
  origin_port_id?: string
  origin_port_loc?: { id: string; city?: string; province?: string; country?: string; address?: string }
  destination_port?: string
  destination_port_id?: string
  destination_port_loc?: { id: string; city?: string; province?: string; country?: string; address?: string }
  estimated_departure_date?: string
  actual_departure_date?: string
  estimated_arrival_date?: string
  actual_arrival_date?: string
  status: ContainerStatus
  weight?: number
  volume?: number
  notes?: string
  events?: ContainerEvent[]
  created_at?: string
  updated_at?: string
}

export interface ContainerEvent {
  id: string
  container_id: string
  event_type: ContainerEventType
  event_date: string
  location_text?: string
  description?: string
  estimated: boolean
  created_by?: string
  created_at: string
}

export interface OperationDocumentRelation {
  operation_id: string
  document_id: string
  expense_type?: InternationalExpenseType
  custom_expense_description?: string
  container_id?: string
  exchange_rate?: number
  document?: {
    id: string
    number: number
    date: string
    total: number
    paid_amount: number
    currency_code?: string
    party_id?: string
    business_parties?: { id: string; name: string }
    document_types?: { code: string; description: string; category?: string }
    payment_documents?: Array<{
      amount_applied: number
      payment_id: string
      payment?: {
        id: string
        number: number
        date: string
        amount: number
        currency_code: string
        status: string
        payment_method: string
      }
    }>
  }
}

export interface OperationPaymentRelation {  operation_id: string
  payment_id: string
  container_id?: string
  container?: { id: string; container_number: string }
  payment?: {
    id: string
    number: number
    date: string
    amount: number
    currency_code: string
    status: string
    payment_method: string
  }
}

export interface OperationQuoteRelation {
  id: string
  operation_id: string
  document_id: string
  status: QuoteStatus
  notes?: string
  document?: {
    id: string
    number: number
    date: string
    total: number
    currency_code?: string
    business_parties?: { id: string; name: string }
    document_types?: { code: string; description: string; category?: string }
    document_items?: Array<{
      quantity: number
      price: number
      products?: { id: string; name: string; sku?: string }
    }>
  }
}

export interface PurchaseOrderRelation {
  document_id: string
  international_operation_id?: string
  document?: {
    id: string
    number: number
    date: string
    total: number
    currency_code?: string
    document_items?: Array<{
      quantity: number
      price: number
      products?: { id: string; name: string; sku?: string }
    }>
  }
}

export interface OperationSummary {
  operation: {
    id: string
    number: string
    name?: string
    status: OperationStatus
    operation_type: OperationType
    transport_type: TransportType
    origin_country?: string
    destination_country?: string
    estimated_arrival_date?: string
    actual_arrival_date?: string
    incoterm?: Incoterm
    primary_supplier?: { id: string; name: string; tax_id?: string }
  }
  containers: InternationalContainer[]
  stats: {
    containerCount: number
    purchaseOrderCount: number
    documentCount: number
    paymentCount: number
    productCount: number
  }
  financial: {
    currency?: string
    total: { amount: number; baseAmount: number }
    paid: { amount: number; baseAmount: number }
    pending: { amount: number; baseAmount: number }
    unconverted?: { count: number; amount: number }
  }
  financialByCurrency: Array<{
    currency: string
    total: number
    paid: number
    pending: number
  }>
  expenseGroups: ExpenseGroup[]
  alerts: {
    etaApproaching: boolean
    etaOverdue: boolean
    pendingClosure: boolean
  }
}

export interface ExpenseGroup {
  type: string
  label: string
  total: number
  paid: number
  pending: number
  currency?: string
  unconvertedCount?: number
  unconvertedAmount?: number
  documentCount: number
  documents: Array<OperationDocumentRelation & { paid_amount: number; pending_amount: number }>
}

export interface OperationListResponse {
  items: InternationalOperation[]
  total: number
  page: number
  limit: number
  pages: number
}

export type CreateOperationInput = {
  name?: string
  operation_type?: OperationType
  transport_type?: TransportType
  primary_supplier_id?: string
  origin_country?: string
  origin_location?: string
  origin_location_id?: string
  destination_country?: string
  destination_location?: string
  destination_location_id?: string
  estimated_departure_date?: string
  estimated_arrival_date?: string
  currency_code?: string
  incoterm?: Incoterm
  responsible_user_id?: string
  notes?: string
}

export type UpdateOperationInput = Partial<CreateOperationInput> & {
  actual_departure_date?: string
  actual_arrival_date?: string
}

export type CreateContainerInput = {
  container_number: string
  container_type?: ContainerType
  seal_number?: string
  booking_number?: string
  bill_of_lading?: string
  vessel_name?: string
  voyage_number?: string
  origin_port?: string
  origin_port_id?: string
  destination_port?: string
  destination_port_id?: string
  estimated_departure_date?: string
  estimated_arrival_date?: string
  weight?: string
  volume?: string
  notes?: string
}

export type UpdateContainerInput = Partial<CreateContainerInput> & {
  actual_departure_date?: string
  actual_arrival_date?: string
  status?: ContainerStatus
}

export type CreateEventInput = {
  event_type: ContainerEventType
  event_date: string
  location_text?: string
  description?: string
}
