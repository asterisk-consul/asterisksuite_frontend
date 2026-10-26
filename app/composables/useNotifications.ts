export const useNotifications = () => {
  const items = useState<UserNotification[]>('user-notifications:items', () => [])
  const unreadCount = useState('user-notifications:unread-count', () => 0)
  const totalCount = useState('user-notifications:total-count', () => 0)
  const companyAlertCount = useState('user-notifications:company-alert-count', () => 0)
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

  async function markRead(id: string) {
    await $fetch(`/api/backend/notifications/${id}/read`, { method: 'PATCH' })
    const notification = items.value.find(item => item.id === id)
    if (notification && !notification.read_at) {
      notification.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllRead() {
    if (!unreadCount.value) return
    await $fetch('/api/backend/notifications/read-all', { method: 'PATCH' })
    const now = new Date().toISOString()
    items.value = items.value.map(item => item.read_at ? item : { ...item, read_at: now })
    unreadCount.value = 0
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

  return { items, unreadCount, totalCount, companyAlertCount, loading, refresh, markRead, markAllRead, remove, setCompanyAlertCount }
}
