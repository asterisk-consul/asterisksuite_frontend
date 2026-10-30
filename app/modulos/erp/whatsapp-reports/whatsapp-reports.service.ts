import type {
  WhatsAppGatewayStatus,
  WhatsAppGroupOption,
  WhatsAppReportCompanyOption,
  WhatsAppReportRun,
  WhatsAppReportSettings,
  WhatsAppReportTestResult,
  WhatsAppOperationalNotificationSettings,
  WhatsAppNotificationRecipient
} from './whatsapp-reports.types'

const baseUrl = '/api/backend/erp/whatsapp/reports'
const notificationBaseUrl = '/api/backend/notifications/whatsapp/company'

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
    }),
  getOperationalSettings: () => $fetch<WhatsAppOperationalNotificationSettings>(`${notificationBaseUrl}/settings`),
  getNotificationRecipients: () => $fetch<WhatsAppNotificationRecipient[]>(`${notificationBaseUrl}/recipients`),
  saveOperationalSettings: (body: WhatsAppOperationalNotificationSettings) =>
    $fetch<WhatsAppOperationalNotificationSettings>(`${notificationBaseUrl}/settings`, { method: 'PUT', body })
})
