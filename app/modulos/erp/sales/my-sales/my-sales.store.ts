import { defineStore } from 'pinia'
import { useMySalesService } from './my-sales.service'
import type { MySalesSummary, MySalesOrder, PendingClient, ClientSales, SalesAnalysis } from './my-sales.types'

export const useMySalesStore = defineStore('mySales', () => {
  const service = useMySalesService()

  const summary = ref<MySalesSummary | null>(null)
  const orders = ref<MySalesOrder[]>([])
  const pending = ref<PendingClient[]>([])
  const byClient = ref<ClientSales[]>([])
  const analysis = ref<SalesAnalysis | null>(null)
  const loading = ref(false)

  const fetchSummary = async (period?: string) => {
    loading.value = true
    try {
      summary.value = await service.getSummary(period)
    } finally {
      loading.value = false
    }
  }

  const fetchOrders = async (period?: string) => {
    loading.value = true
    try {
      orders.value = await service.getOrders(period)
    } finally {
      loading.value = false
    }
  }

  const fetchPending = async () => {
    loading.value = true
    try {
      pending.value = await service.getPending()
    } finally {
      loading.value = false
    }
  }

  const fetchByClient = async (period?: string) => {
    loading.value = true
    try {
      byClient.value = await service.getByClient(period)
    } finally {
      loading.value = false
    }
  }

  const fetchAnalysis = async () => {
    loading.value = true
    try {
      analysis.value = await service.getAnalysis()
    } finally {
      loading.value = false
    }
  }

  return {
    summary, orders, pending, byClient, analysis, loading,
    fetchSummary, fetchOrders, fetchPending, fetchByClient, fetchAnalysis,
  }
})
