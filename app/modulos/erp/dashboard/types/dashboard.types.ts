export type WidgetSize = 'sm' | 'md' | 'lg'

export interface WidgetConfig {
  id: string
  enabled: boolean
  position: number
  size: WidgetSize
}

export interface DashboardConfig {
  widgets: WidgetConfig[]
}

export interface DashboardQuotes {
  total: number
  byStatus: Record<number, number>
  totalValue: number
}

export interface DashboardOrders {
  total: number
  byStatus: Record<number, number>
  totalValue: number
}

export interface DashboardRemitos {
  total: number
  byStatus: Record<number, number>
}

export interface DashboardHr {
  totalVales: number
  byStatus: Record<string, number>
  totalDebit: number
  totalCredit: number
  accounts: { id: string; party_id: string; party_type: string; currency_code: string; balance: number }[]
}

export interface DashboardStock {
  totalProducts: number
  totalQuantity: number
  totalReserved: number
  lowStockCount: number
}

export interface DashboardData {
  quotes: DashboardQuotes
  orders: DashboardOrders
  remitos: DashboardRemitos
  hr: DashboardHr
  stock: DashboardStock
}

export interface DashboardWidget {
  id: string
  label: string
  icon: string
  description: string
  defaultEnabled: boolean
  defaultPosition: number
  defaultSize: WidgetSize
}
