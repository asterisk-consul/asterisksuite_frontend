export interface ExternalExchangeQuote {
  moneda: string
  casa: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion: string
}

export const useExchangeQuotesService = () => ({
  getDollarRates: () => $fetch<ExternalExchangeQuote[]>('/api/dolar'),
  getOtherCurrencyRates: () => $fetch<ExternalExchangeQuote[]>('/api/cotizaciones')
})
