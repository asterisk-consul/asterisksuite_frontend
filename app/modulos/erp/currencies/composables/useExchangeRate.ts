import { ref, computed, watch } from 'vue'
import { useCurrencies } from './useCurrencies'
import { useCurrencyRates } from '~/modulos/erp/currency-rates/composables/useCurrencyRates'

export interface ExchangeRateState {
  exchangeRate: number | null
  rateType: string
  isAutoResolved: boolean
  convertedAmount: number | null
}

export function useExchangeRate() {
  const { currencies, baseCurrency, init: initCurrencies } = useCurrencies()
  const { getLatestRateValue, convert, fetchAll: fetchRates } = useCurrencyRates()

  const exchangeRate = ref<number | null>(null)
  const rateType = ref<string>('OFFICIAL')
  const isAutoResolved = ref(false)
  const loading = ref(false)
  const ratesLoaded = ref(false)

  /**
   * Check if a currency is the base currency
   */
  const isBaseCurrency = (code: string): boolean => {
    if (!baseCurrency.value) return false
    return code.toUpperCase() === baseCurrency.value.code.toUpperCase()
  }

  /**
   * Auto-resolve the latest rate for a currency pair
   */
  const autoResolve = async (
    fromCode: string,
    toCode: string,
    type?: string,
  ): Promise<number | null> => {
    if (fromCode.toUpperCase() === toCode.toUpperCase()) {
      exchangeRate.value = 1
      isAutoResolved.value = true
      return 1
    }

    loading.value = true
    try {
      // Ensure currency rates store is loaded
      if (!ratesLoaded.value) {
        await fetchRates()
        ratesLoaded.value = true
      }

      // Try the backend endpoint first
      const fromCurrency = currencies.value.find(c => c.code.toUpperCase() === fromCode.toUpperCase())
      const toCurrency = currencies.value.find(c => c.code.toUpperCase() === toCode.toUpperCase())

      if (fromCurrency && toCurrency) {
        const rate = getLatestRateValue(fromCurrency.id, toCurrency.id, type ?? rateType.value)
        if (rate) {
          exchangeRate.value = rate
          isAutoResolved.value = true
          return rate
        }
      }

      // Fallback: try the server API
      const result = await $fetch('/api/erp/pricing/exchange/convert', {
        query: { from: fromCode, to: toCode, rateType: type ?? rateType.value },
      })

      if (result?.rate) {
        exchangeRate.value = result.rate
        isAutoResolved.value = true
        return result.rate
      }
    } catch {
      // Rate not found
      exchangeRate.value = null
      isAutoResolved.value = false
    } finally {
      loading.value = false
    }

    return null
  }

  /**
   * Set rate manually (user override)
   */
  const setManualRate = (rate: number) => {
    exchangeRate.value = rate
    isAutoResolved.value = false
  }

  /**
   * Reset to auto-resolved rate
   */
  const resetRate = () => {
    exchangeRate.value = null
    isAutoResolved.value = false
  }

  /**
   * Calculate converted amount
   */
  const convertAmount = (amount: number): number | null => {
    if (!exchangeRate.value) return null
    return Number((amount * exchangeRate.value).toFixed(2))
  }

  /**
   * Watch currency changes and auto-resolve
   */
  const watchCurrency = (
    getCurrencyCode: () => string,
    getBaseCode: () => string = () => baseCurrency.value?.code ?? 'ARS',
    callback?: (rate: number | null) => void,
  ) => {
    watch(
      getCurrencyCode,
      async (newCode) => {
        if (!newCode || isBaseCurrency(newCode)) {
          exchangeRate.value = null
          isAutoResolved.value = false
          callback?.(null)
          return
        }
        const rate = await autoResolve(newCode, getBaseCode())
        callback?.(rate)
      },
      { immediate: true },
    )
  }

  return {
    // State
    exchangeRate: computed(() => exchangeRate.value),
    rateType: computed({
      get: () => rateType.value,
      set: (v: string) => { rateType.value = v },
    }),
    isAutoResolved: computed(() => isAutoResolved.value),
    loading: computed(() => loading.value),

    // Methods
    isBaseCurrency,
    autoResolve,
    setManualRate,
    resetRate,
    convertAmount,
    watchCurrency,
  }
}
