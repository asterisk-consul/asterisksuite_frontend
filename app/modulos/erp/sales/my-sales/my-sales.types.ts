export interface MySalesSummary {
  seller_id: string
  period: string
  total_ventas: number
  total_facturado: number
  total_cobrado: number
  pendiente_cobro: number
  pendiente_facturar: number
  cantidad_ov: number
  clientes_vendidos: number
  comision_generada: number
  comision_pendiente: number
}

export interface MySalesOrder {
  id: string
  number: number
  date: string
  client_name: string
  total: number
  facturado: number
  cobrado: number
  pendiente: number
  status: string
  currency_code: string
  commission_rate: number | null
}

export interface PendingClient {
  client_id: string
  client_name: string
  facturas: number
  total_facturado: number
  cobrado: number
  pendiente: number
}

export interface ClientSales {
  client_id: string
  client_name: string
  ordenes: number
  facturado: number
  cobrado: number
  pendiente: number
}

export interface SalesAnalysis {
  current: {
    period: string
    ventas: number
    facturado: number
    cobrado: number
    pendiente: number
    cantidad_ov: number
  } | null
  previous: {
    period: string
    ventas: number
    facturado: number
    cobrado: number
    pendiente: number
    cantidad_ov: number
  } | null
}
