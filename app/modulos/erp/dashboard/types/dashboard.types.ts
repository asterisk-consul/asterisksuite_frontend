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

export interface DashboardReceivables {
  total: number
  totalAmount: number
}

export interface DashboardCosting {
  totalProducts: number
  costed: number
  uncosted: number
}

export interface DashboardCurrentAccountItem {
  id: string
  party_id: string
  party_name: string
  balance: number
}

export interface DashboardPicking {
  pending: number
}

export interface DashboardTrips {
  planned: number
  inProgress: number
}

export interface DashboardChecksDueItem {
  id: string
  check_number: string
  bank_name: string
  amount: number
  currency_code: string
  due_date: string
}

export interface DashboardChecksDue {
  count: number
  totalAmount: number
  items: DashboardChecksDueItem[]
}

export interface DashboardPaymentsDueGroup {
  count: number
  total: number
}

export interface DashboardPaymentsDue {
  payments: DashboardPaymentsDueGroup
  collections: DashboardPaymentsDueGroup
}

export interface DashboardData {
  quotes: DashboardQuotes
  orders: DashboardOrders
  remitos: DashboardRemitos
  invoices: DashboardDocumentCounts
  creditNotes: DashboardDocumentCounts
  debitNotes: DashboardDocumentCounts
  hr: DashboardHr
  stock: DashboardStock
  receivables: DashboardReceivables
  costing: DashboardCosting
  currentAccounts: DashboardCurrentAccountItem[]
  picking: DashboardPicking
  trips: DashboardTrips
  checksDue: DashboardChecksDue
  paymentsDue: DashboardPaymentsDue
}

export interface DashboardDocumentCounts {
  total: number
  byStatus: Record<number, number>
  totalValue: number
}

export interface PersonalActivity {
  table: string
  action: string
  date: string
  detail: string
}

export interface DashboardPersonal {
  recentActivity: PersonalActivity[]
  pendingDocuments: number
  monthlyPayments: number
  monthlyAmount: number
}

export interface DashboardWidget {
  id: string
  label: string
  icon: string
  description: string
  defaultEnabled: boolean
  defaultPosition: number
  defaultSize: WidgetSize
  permission?: string
}
