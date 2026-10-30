export const useNotifications = () => {
  const items = useState<UserNotification[]>('user-notifications:items', () => [])
  const unreadCount = useState('user-notifications:unread-count', () => 0)
  const totalCount = useState('user-notifications:total-count', () => 0)
  const companyAlertCount = useState('user-notifications:company-alert-count', () => 0)
  const dismissedAlertKeys = useState<string[]>('user-notifications:dismissed-alert-keys', () => [])
  const loading = useState('user-notifications:loading', () => false)

  async function refresh(take = 30) {
    if (loading.value) return
    loading.value = true
    try {
      const result = await $fetch<UserNotificationFeed>('/api/backend/notifications', {
        query: { take }
      })
      items.value = result.items
      unreadCount.value = result.unread_count
      totalCount.value = result.total_count
    } catch {
      // Keep the last known count if the API is temporarily unavailable.
    } finally {
      loading.value = false
    }
  }

  async function dismissNotification(id: string) {
    await $fetch(`/api/backend/notifications/${id}/dismiss`, { method: 'PATCH' })
    const notification = items.value.find(item => item.id === id)
    items.value = items.value.filter(item => item.id !== id)
    if (notification && !notification.read_at) unreadCount.value = Math.max(0, unreadCount.value - 1)
    totalCount.value = Math.max(0, totalCount.value - 1)
  }

  async function refreshDismissals() {
    try {
      const result = await $fetch<{ alert_keys: string[] }>('/api/backend/notifications/dismissals')
      dismissedAlertKeys.value = result.alert_keys ?? []
    } catch {
      dismissedAlertKeys.value = []
    }
  }

  function isAlertDismissed(key: string) {
    return dismissedAlertKeys.value.includes(key)
  }

  async function dismissAlert(key: string) {
    await $fetch('/api/backend/notifications/dismissals', {
      method: 'POST',
      body: { alert_key: key }
    })
    if (!dismissedAlertKeys.value.includes(key)) dismissedAlertKeys.value.push(key)
  }

  async function markAllRead() {
    if (!unreadCount.value) return
    const result = await $fetch<{ updated: number }>('/api/backend/notifications/read-all', { method: 'PATCH' })
    const unreadIds = new Set(items.value.filter(item => !item.read_at).map(item => item.id))
    items.value = items.value.filter(item => !unreadIds.has(item.id))
    unreadCount.value = 0
    totalCount.value = Math.max(0, totalCount.value - (result.updated ?? unreadIds.size))
  }

  async function remove(id: string) {
    await $fetch(`/api/backend/notifications/${id}`, { method: 'DELETE' })
    const notification = items.value.find(item => item.id === id)
    items.value = items.value.filter(item => item.id !== id)
    if (notification && !notification.read_at) {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    totalCount.value = Math.max(0, totalCount.value - 1)
  }

  function setCompanyAlertCount(count: number) {
    companyAlertCount.value = Math.max(0, count)
  }

  return {
    items, unreadCount, totalCount, companyAlertCount, dismissedAlertKeys, loading,
    refresh, dismissNotification, refreshDismissals, isAlertDismissed, dismissAlert,
    markAllRead, remove, setCompanyAlertCount
  }
}
