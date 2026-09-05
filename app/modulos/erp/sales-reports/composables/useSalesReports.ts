import { useSalesReportsStore } from '../store/sales-reports.store'
import type { SummaryFilters } from '../types/sales-reports.types'

export function useSalesReports() {
  const store = useSalesReportsStore()

  const fetchByPointOfSale = async (filters?: SummaryFilters) => store.fetchByPointOfSale(filters)

  return {
    byPointOfSaleData: computed(() => store.byPointOfSaleData),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    fetchByPointOfSale
  }
}
