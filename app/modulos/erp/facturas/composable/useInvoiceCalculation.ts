import { computed } from 'vue'
import type { Ref } from 'vue'
import type { FacturaItem, FacturaTax } from '../types/factura.types'

export interface InvoiceCalculation {
  subtotal: Ref<number>
  totalTaxes: Ref<number>
  total: Ref<number>
  taxesSummary: Ref<TaxSummary[]>
  recalculateItem: (item: FacturaItem) => void
  recalculateAll: () => void
}

export interface TaxSummary {
  tax_id: string
  name: string
  code: string
  rate: number
  amount: number
  taxableBase: number
}

/**
 * Composable para cálculo de impuestos y totales de facturas.
 * Centraliza la lógica de cálculo para uso en formulario y vista.
 */
export function useInvoiceCalculation(
  items: Ref<FacturaItem[]>,
  documentTypeTaxes: Ref<any[]>
): InvoiceCalculation {
  /**
   * Recalcula un ítem individual: subtotal → taxes → total
   */
  function recalculateItem(item: FacturaItem) {
    // Subtotal
    item.subtotal = Number(
      (Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)
    )

    // Recalcular cada tax
    item.taxes = (item.taxes ?? []).map((tax) => {
      const subtotal = Number(item.subtotal || 0)

      const taxAmount = tax.is_included_in_price
        ? 0
        : subtotal * (Number(tax.tax_rate || 0) / 100)

      return {
        ...tax,
        tax_amount: Number(taxAmount.toFixed(2))
      }
    })

    // Total taxes
    item.total_taxes = item.taxes.reduce(
      (acc, tax) => acc + Number(tax.tax_amount || 0),
      0
    )

    // Total
    item.total = Number((item.subtotal + item.total_taxes).toFixed(2))
  }

  /**
   * Recalcula todos los ítems
   */
  function recalculateAll() {
    for (const item of items.value) {
      recalculateItem(item)
    }
  }

  /**
   * Subtotal: suma de price (subtotal) de todos los ítems
   */
  const subtotal = computed(() =>
    items.value.reduce((acc, item) => acc + Number(item.subtotal || item.price || 0), 0)
  )

  /**
   * Impuestos agrupados por tax_id
   */
  const taxesSummary = computed<TaxSummary[]>(() => {
    const map = new Map<string, TaxSummary>()

    for (const item of items.value) {
      for (const tax of item.taxes ?? []) {
        const amount = Number(tax.tax_amount || 0)
        if (amount <= 0) continue

        const key = tax.tax_id
        if (!map.has(key)) {
          map.set(key, {
            tax_id: key,
            name: tax.name || `Impuesto ${tax.tax_rate}%`,
            code: tax.code || '',
            rate: Number(tax.tax_rate || 0),
            amount,
            taxableBase: Number(item.subtotal || item.price || 0)
          })
        } else {
          const existing = map.get(key)!
          existing.amount = Number((existing.amount + amount).toFixed(2))
          existing.taxableBase = Number((existing.taxableBase + Number(item.subtotal || item.price || 0)).toFixed(2))
        }
      }
    }

    return Array.from(map.values())
  })

  /**
   * Total de impuestos
   */
  const totalTaxes = computed(() =>
    taxesSummary.value.reduce((acc, tax) => acc + tax.amount, 0)
  )

  /**
   * Total = subtotal + impuestos
   */
  const total = computed(() =>
    Number((subtotal.value + totalTaxes.value).toFixed(2))
  )

  return {
    subtotal,
    totalTaxes,
    total,
    taxesSummary,
    recalculateItem,
    recalculateAll
  }
}
