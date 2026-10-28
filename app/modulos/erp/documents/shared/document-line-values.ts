export function getLineTaxAmount(item: any): number {
  const taxes = item?.document_item_taxes ?? item?.taxes ?? []
  return taxes.reduce(
    (sum: number, tax: any) => sum + Number(tax.tax_amount ?? 0),
    0,
  )
}

/**
 * Older document item rows stored the line gross (net + line taxes) in `price`.
 * New rows store the net line price. Detect the old shape at document level,
 * where the persisted document subtotal and line tax breakdown are available.
 */
export function hasLegacyGrossLinePrices(documentSubtotal: unknown, items: any[]): boolean {
  const subtotal = Number(documentSubtotal)
  if (!Number.isFinite(subtotal) || !items?.length) return false

  const storedLinePrices = items.reduce((sum, item) => sum + Number(item.price ?? 0), 0)
  const lineTaxes = items.reduce((sum, item) => sum + getLineTaxAmount(item), 0)
  const tolerance = Math.max(0.05, items.length * 0.02)
  const matchesGross = Math.abs(storedLinePrices - (subtotal + lineTaxes)) <= tolerance
  const differsFromNet = Math.abs(storedLinePrices - subtotal) > tolerance

  return lineTaxes > 0 && matchesGross && differsFromNet
}

export function getDocumentLineAmounts(item: any, legacyGrossPrices = false) {
  const taxes = getLineTaxAmount(item)
  const storedPrice = Number(item?.price ?? 0)
  const subtotal = legacyGrossPrices && taxes > 0
    ? Math.max(0, storedPrice - taxes)
    : storedPrice

  return { subtotal, taxes, total: subtotal + taxes }
}

export function getCommercialAdjustmentFactor(document: any): number {
  const subtotalAfter = Number(document?.subtotal ?? 0)
  const netDiscounts = (Array.isArray(document?.commercial_adjustments) ? document.commercial_adjustments : [])
    .reduce((sum: number, adjustment: any) => sum + Number(adjustment.net_discount ?? 0), 0)
  const subtotalBefore = subtotalAfter + netDiscounts
  return subtotalBefore > 0 ? subtotalAfter / subtotalBefore : 1
}

export function getLineSubtotalBeforeCommercialAdjustments(
  document: any,
  item: any,
  legacyGrossPrices = false,
): number {
  const lineSubtotal = getDocumentLineAmounts(item, legacyGrossPrices).subtotal
  const adjustmentFactor = getCommercialAdjustmentFactor(document)
  return adjustmentFactor > 0 ? lineSubtotal / adjustmentFactor : lineSubtotal
}

export function getItemDiscountPercentage(item: any): number {
  const configuredPercentage = Number(item?.discount_percentage ?? 0)
  if (configuredPercentage > 0) return configuredPercentage

  const originalUnitPrice = Number(item?.original_unit_price)
  const unitPrice = Number(item?.unit_price ?? 0)
  if (item?.original_unit_price == null || originalUnitPrice <= 0 || unitPrice >= originalUnitPrice) return 0
  return ((originalUnitPrice - unitPrice) / originalUnitPrice) * 100
}

export function getItemDiscountAmount(item: any, netLineSubtotal?: number): number {
  const quantity = Number(item?.quantity ?? 0)
  const unitPrice = Number(item?.unit_price ?? 0)
  const originalUnitPrice = Number(item?.original_unit_price)
  const configuredPercentage = Math.min(100, Math.max(0, Number(item?.discount_percentage ?? 0)))

  // Honor the entered percentage before comparing unit prices: both unit
  // prices are rounded to cents, while the discount applies to the full line.
  if (configuredPercentage > 0 && item?.original_unit_price != null && Number.isFinite(originalUnitPrice)) {
    if (netLineSubtotal != null && Number.isFinite(netLineSubtotal)) {
      const expectedNet = originalUnitPrice * quantity * (1 - configuredPercentage / 100)
      if (Math.abs(netLineSubtotal - expectedNet) > 0.02) {
        return Math.max(0, originalUnitPrice * quantity - netLineSubtotal)
      }
    }
    return originalUnitPrice * quantity * configuredPercentage / 100
  }

  if (item?.original_unit_price != null && Number.isFinite(originalUnitPrice)) {
    return Math.max(0, originalUnitPrice - unitPrice) * quantity
  }

  const percentage = getItemDiscountPercentage(item)
  return percentage > 0 && percentage < 100
    ? (unitPrice / (1 - percentage / 100) - unitPrice) * quantity
    : 0
}
