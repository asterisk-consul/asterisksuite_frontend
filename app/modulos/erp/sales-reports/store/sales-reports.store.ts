import { defineStore } from 'pinia'
import { useSalesReportsService } from '../service/sales-reports.service'
import type { PointOfSaleReportResponse, SummaryFilters } from '../types/sales-reports.types'

export const useSalesReportsStore = defineStore('sales-reports', () => {
  const service = useSalesReportsService()

  const byPointOfSaleData = ref<PointOfSaleReportResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchByPointOfSale = async (filters?: SummaryFilters) => {
    try {
      loading.value = true
      error.value = null
      byPointOfSaleData.value = await service.byPointOfSale(filters)
      return byPointOfSaleData.value
    } catch (e: any) {
      error.value = e?.data?.message ?? e?.message ?? 'Error al cargar reporte'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    byPointOfSaleData,
    loading,
    error,
    fetchByPointOfSale
  }
})
