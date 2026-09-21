// composables/useCurrencyRates.ts

import { computed } from 'vue'

import { useCurrencyRatesStore } from '~/modulos/erp/currency-rates/store/currency-rates.store'

export const useCurrencyRates = () => {
  const store = useCurrencyRatesStore()

  // =========================
  // HELPERS
  // =========================

  const sortByLatest = (rates: any[]) => {
    return [...rates].sort((a, b) => {
      return (
        new Date(b.effective_date ?? b.created_at ?? 0).getTime() -
        new Date(a.effective_date ?? a.created_at ?? 0).getTime()
      )
    })
  }

  // =========================
  // ULTIMA COTIZACION GENERAL
  // =========================

  const latestRates = computed(() => {
    const grouped = new Map<string, any>()

    for (const rate of sortByLatest(store.items)) {
      const key = `${rate.from_currency_id}-${rate.to_currency_id}-${rate.rate_type}`

      if (!grouped.has(key)) {
        grouped.set(key, rate)
      }
    }

    return Array.from(grouped.values())
  })

  // =========================
  // OBTENER ULTIMA COTIZACION
  // =========================

  const getLatestRate = (
    fromCurrencyId: string,
    toCurrencyId: string,
    rateType?: string
  ) => {
    const sorted = sortByLatest(store.items)

    // 1. Buscar dirección directa (ej: USD → ARS)
    const direct = sorted.find((rate) => {
      return (
        rate.from_currency_id === fromCurrencyId &&
        rate.to_currency_id === toCurrencyId &&
        (!rateType || rate.rate_type === rateType)
      )
    })
    if (direct) return direct

    // 2. Buscar dirección inversa (ej: ARS → USD) y calcular 1/rate
    // Igual que ExchangeService.convertAmount() en el backend
    const inverse = sorted.find((rate) => {
      return (
        rate.from_currency_id === toCurrencyId &&
        rate.to_currency_id === fromCurrencyId &&
        (!rateType || rate.rate_type === rateType)
      )
    })
    if (inverse && Number(inverse.rate) !== 0) {
      return { ...inverse, rate: 1 / Number(inverse.rate) }
    }

    return null
  }

  // =========================
  // OBTENER VALOR
  // =========================

  const getLatestRateValue = (
    fromCurrencyId: string,
    toCurrencyId: string,
    rateType?: string
  ) => {
    return getLatestRate(fromCurrencyId, toCurrencyId, rateType)?.rate ?? null
  }

  // =========================
  // CONVERTIR MONEDA
  // =========================

  const convert = (
    amount: number,
    fromCurrencyId: string,
    toCurrencyId: string,
    rateType?: string
  ) => {
    const rate = getLatestRateValue(fromCurrencyId, toCurrencyId, rateType)

    if (!rate) return null

    return amount * rate
  }

  return {
    latestRates,

    getLatestRate,
    getLatestRateValue,

    convert,

    fetchAll: store.fetchAll,
    loading: computed(() => store.loading),
  }
}
