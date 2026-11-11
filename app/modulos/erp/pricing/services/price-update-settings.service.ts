export interface PriceUpdateSettings {
  update_sales_party_prices: boolean
  update_sales_global_prices: boolean
  update_purchases_party_prices: boolean
  update_purchases_global_costs: boolean
}

const url = '/api/backend/pricing/price-update-settings'

export const usePriceUpdateSettingsService = () => ({
  get: () => $fetch<PriceUpdateSettings>(url),
  update: (body: PriceUpdateSettings) => $fetch<PriceUpdateSettings>(url, { method: 'PATCH', body })
})
