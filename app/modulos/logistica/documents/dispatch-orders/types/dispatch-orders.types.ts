// 🔹 status
export type DispatchStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

// 🔹 customer
export interface DispatchCustomer {
  id: string
  type: 'client' | 'supplier'
  name: string
  tax_id: string
  active: boolean
  created_at: string
}

// 🔹 location
import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'

// 🔹 corridor
export interface Corridor {
  id: string
  name: string
}

// 🔹 transfer_rates
export interface TransferRate {
  id: string
  name: string
  rate_type: string
  description?: string | null
  active?: boolean
  created_at?: string
}

// 🔹 dispatch_rates
export interface DispatchRate {
  id: string
  dispatch_id: string
  rate_id: string
  value: number
  created_at?: string

  transfer_rates?: TransferRate
}

export interface DispatchOrderItem {
  id?: string
  product_id?: string
  source_document_item_id?: string
  quantity: number
  unit_price: number
  currency_code?: string
  product?: { id: string; name: string; sku?: string | null; is_rate_type?: boolean; rate_id?: string | null }
}

// 🔹 main entity
export interface DispatchOrder {
  id: string
  order_number: string
  status: DispatchStatus
  requires_stock?: boolean

  customer_id?: string
  origin_location_id?: string
  destination_location_id?: string
  corridor_id?: string | null

  planned_date?: string
  confirmed_at?: string | null

  created_by: string

  // relaciones
  customers?: DispatchCustomer
  origin_location?: Location
  destination_location?: Location
  corridors?: Corridor

  dispatch_rates?: DispatchRate[]
  dispatch_items?: DispatchOrderItem[]
  tariff_total?: number
  tariff_source?: 'PRODUCTS' | 'LEGACY_RATES'
  tripStopOrders?: Array<{ id: string; trip_stop?: { trip?: { id: string; status: string } } }>

  created_at: string
  updated_at?: string
}

/**
 * 🔹 DTOs frontend
 */
export interface DispatchRateInput {
  rate_id: string
  value: number
}

export interface DispatchItemInput {
  product_id?: string
  source_document_item_id?: string
  quantity: number
  unit_price: number
  currency_code?: string
  product?: DispatchOrderItem['product']
}

export interface CreateDispatchOrderDto {
  order_number: string
  status?: DispatchStatus
  requires_stock?: boolean

  customer_id?: string
  origin_location_id?: string
  destination_location_id?: string
  corridor_id?: string

  planned_date?: string

  rates?: DispatchRateInput[]
  items?: DispatchItemInput[]
}

export type UpdateDispatchOrderDto = Partial<CreateDispatchOrderDto>
