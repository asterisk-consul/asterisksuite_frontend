import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'

function localDateToday() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Construye valores limpios para un alta nueva, sin IDs, estado ni fechas fiscales del original. */
export function buildDocumentDuplicateValues(document: any) {
  const mapped = mapDocumentToFacturaForm(document)
  const { id: _documentId, updated_at: _updatedAt, status: _status, ...values } = mapped as any
  const sourceItems = document.document_items ?? []

  return {
    ...values,
    date: localDateToday(),
    items: (mapped.items ?? []).map((item: any, index: number) => {
      const { id: _itemId, ...cleanItem } = item
      const source = sourceItems[index] ?? {}
      return {
        ...cleanItem,
        product_id: source.product_id ?? cleanItem.product_id,
        variant_id: source.variant_id ?? null,
        variant_name: source.product_variants?.name ?? null,
        warehouse_id: source.warehouse_id ?? document.warehouse_id ?? cleanItem.warehouse_id ?? null,
      }
    }),
  }
}

/** Copia sólo los campos operativos de la extensión; nunca metadatos ni relaciones. */
export function buildDocumentExtensionDuplicateValues(extension: Record<string, any> | null | undefined) {
  if (!extension) return {}
  const { id: _id, document_id: _documentId, created_at: _createdAt, updated_at: _updatedAt, deleted_at: _deletedAt, ...values } = extension
  return values
}
