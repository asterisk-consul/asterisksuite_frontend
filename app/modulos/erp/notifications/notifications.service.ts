export const useNotificationsService = () => {
  const baseUrl = '/api/backend/notifications'
  const alertUrl = `${baseUrl}/dismissals`
  const whatsappUrl = `${baseUrl}/whatsapp/contact`

  return {
    findFeed: (take: number) => $fetch<UserNotificationFeed>(baseUrl, { query: { take } }),
    dismiss: (id: string) => $fetch<void>(`${baseUrl}/${id}/dismiss`, { method: 'PATCH' }),
    findDismissals: () => $fetch<{ alert_keys: string[] }>(alertUrl),
    dismissAlert: (key: string) => $fetch<void>(alertUrl, { method: 'POST', body: { alert_key: key } }),
    markAllRead: () => $fetch<{ updated: number }>(`${baseUrl}/read-all`, { method: 'PATCH' }),
    remove: (id: string) => $fetch<void>(`${baseUrl}/${id}`, { method: 'DELETE' }),
    getWhatsappContact: () => $fetch<{ phone_e164: string; opted_in: boolean; consent_at: string | null }>(whatsappUrl),
    updateWhatsappContact: (body: { phone_e164: string; opted_in: boolean }) =>
      $fetch<{ phone_e164: string; opted_in: boolean; consent_at: string | null }>(whatsappUrl, { method: 'PUT', body }),
    getObligationAlerts: () => $fetch<any[]>(`${baseUrl}/../treasury/obligations/notifications`),
    getStockReplenishmentAlerts: () => $fetch<any[]>('/api/backend/dashboard/notifications/stock-replenishment'),
    getOldAccountBalanceAlerts: () => $fetch<any[]>('/api/backend/dashboard/notifications/old-account-balances'),
  }
}
