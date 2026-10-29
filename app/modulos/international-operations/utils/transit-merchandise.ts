export interface TransitMerchandiseRow {
  id: string
  productId: string
  docId: string
  docLabel: string
  productName: string
  sku?: string
  quantity: number
  price?: number
  currencyCode?: string
  documents: number
}

/** An OC and its invoice cover the same shipment; independent orders add up. */
export function summarizeTransitMerchandise(links: readonly any[]): TransitMerchandiseRow[] {
  const rows = new Map<string, TransitMerchandiseRow>()
  const sorted = [...links].sort((a, b) => Number(a.document?.document_types?.category === 'INVOICE') - Number(b.document?.document_types?.category === 'INVOICE'))
  for (const link of sorted) {
    const doc = link.document
    if (link.expense_type !== 'MERCHANDISE' || !doc || doc.deleted_at || doc.status !== 2 || !['ORDER', 'INVOICE'].includes(doc.document_types?.category)) continue
    if (doc.document_types?.direction != null && Number(doc.document_types.direction) !== -1) continue
    const root = doc.document_types.category === 'INVOICE' && doc.parent_document_id ? doc.parent_document_id : doc.id
    const products = new Map<string, { quantity: number; price: number; name: string; sku?: string }>()
    for (const item of doc.document_items ?? []) {
      const productId = item.product_id ?? item.products?.id
      if (!productId || item.deleted_at) continue
      const previous = products.get(productId) ?? { quantity: 0, price: 0, name: item.products?.name ?? 'Producto sin nombre', sku: item.products?.sku }
      previous.quantity += Number(item.stock_quantity ?? item.quantity ?? 0)
      previous.price += Number(item.price ?? 0)
      products.set(productId, previous)
    }
    for (const [productId, product] of products) {
      const id = `${root}:${productId}`
      const previous = rows.get(id)
      const documents = (previous?.documents ?? 0) + 1
      if (!previous || product.quantity >= previous.quantity) {
        rows.set(id, { id, productId, docId: doc.id, docLabel: `${doc.document_types?.code ?? 'Documento'} #${doc.number ?? ''}`, productName: product.name, sku: product.sku, quantity: product.quantity, price: product.price, currencyCode: doc.currency_code, documents })
      } else previous.documents = documents
    }
  }
  return [...rows.values()]
}
