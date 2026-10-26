import type {
  WhatsAppGatewayStatus,
  WhatsAppGroupOption,
  WhatsAppReportCompanyOption,
  WhatsAppReportRun,
  WhatsAppReportSettings,
  WhatsAppReportTestResult
} from './whatsapp-reports.types'

const baseUrl = '/api/backend/erp/whatsapp/reports'

export const useWhatsAppReportsService = () => ({
  getStatus: () => $fetch<WhatsAppGatewayStatus>(`${baseUrl}/status`),
  getSettings: () => $fetch<WhatsAppReportSettings>(`${baseUrl}/settings`),
  getCompanies: () => $fetch<WhatsAppReportCompanyOption[]>(`${baseUrl}/companies`),
  getGroups: () => $fetch<WhatsAppGroupOption[]>(`${baseUrl}/groups`),
  getRuns: () => $fetch<WhatsAppReportRun[]>(`${baseUrl}/runs`),
  saveSettings: (body: WhatsAppReportSettings) =>
    $fetch<WhatsAppReportSettings>(`${baseUrl}/settings`, { method: 'PUT', body }),
  sendTest: (destination: 'consolidated' | 'inventory', format: 'text' | 'pdf' = 'text') =>
    $fetch<WhatsAppReportTestResult>(`${baseUrl}/test`, {
      method: 'POST',
      body: { destination, format }
    })
})
