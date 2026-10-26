export interface WhatsAppGatewayStatus {
  gatewayEnabled: boolean
  configured: boolean
  apiKeyConfigured: boolean
  sessionConfigured: boolean
}

export interface WhatsAppReportSettings {
  enabled: boolean
  selected_company_ids: string[]
  consolidated_enabled: boolean
  consolidated_group_id: string | null
  inventory_enabled: boolean
  inventory_group_id: string | null
}

export interface WhatsAppReportCompanyOption {
  id: string
  name: string
  subdomain: string | null
  role: string
}

export interface WhatsAppGroupOption {
  id: string
  name: string
}

export interface WhatsAppReportRun {
  id: string
  report_type: 'consolidated' | 'inventory'
  period_start: string
  period_end: string
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | string
  attempt_count: number
  last_error: string | null
  started_at: string | null
  sent_at: string | null
  created_at: string
}

export interface WhatsAppReportTestResult {
  success: boolean
  format: 'text' | 'pdf'
  messageId: string | null
  filename?: string
  sizeBytes?: number
  period?: { from: string; to: string }
}
