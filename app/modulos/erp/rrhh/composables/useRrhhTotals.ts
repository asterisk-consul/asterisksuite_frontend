import { computed } from 'vue'

const DEBIT_TYPES = ['RETIRO', 'REEMBOLSO', 'PRESTAMO']
const CREDIT_TYPES = ['SUELDO', 'ADELANTO', 'EXTRAS', 'APORTE']

export function useRrhhTotals(getter: () => any[], options?: { status?: string }) {
  const filteredItems = computed(() => {
    const items = getter()
    console.log('[useRrhhTotals] getter items:', items.length, 'items')
    if (items.length > 0) {
      console.log('[useRrhhTotals] primer item:', { type: items[0].type, amount: items[0].amount })
    }
    if (!options?.status) return items
    return items.filter((v) => v.status === options.status)
  })

  const totalDebit = computed(() => {
    const result = filteredItems.value
      .filter((v) => DEBIT_TYPES.includes(v.type))
      .reduce((sum, v) => sum + Number(v.amount), 0)
    console.log('[useRrhhTotals] totalDebit:', result)
    return result
  })

  const totalCredit = computed(() => {
    const result = filteredItems.value
      .filter((v) => CREDIT_TYPES.includes(v.type))
      .reduce((sum, v) => sum + Number(v.amount), 0)
    console.log('[useRrhhTotals] totalCredit:', result)
    return result
  })

  return {
    filteredItems,
    totalDebit,
    totalCredit
  }
}
