import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

/**
 * Etiquetas legibles para segmentos dinámicos de los breadcrumbs.
 * La clave es la ruta completa de la entidad, por ejemplo
 * `/operaciones-internacionales/:id`.
 */
export const useBreadcrumbEntityLabels = () =>
  useState<Record<string, string>>('breadcrumb-entity-labels', () => ({}))

export const useBreadcrumbEntityLabel = (
  path: MaybeRefOrGetter<string>,
  label: MaybeRefOrGetter<string | null | undefined>
) => {
  const labels = useBreadcrumbEntityLabels()

  watchEffect(() => {
    const currentPath = toValue(path)
    const currentLabel = toValue(label)?.trim()
    if (currentPath && currentLabel) labels.value[currentPath] = currentLabel
  })
}

export const formatDocumentBreadcrumbLabel = (document: any) => {
  if (!document?.number) return null

  const code = document.document_types?.code
    ? String(document.document_types.code).trim()
    : null
  const pointOfSale = document.document_sequences?.point_of_sale
    ? String(document.document_sequences.point_of_sale).trim()
    : null
  const number = String(document.number).padStart(8, '0')

  return [code, pointOfSale, number].filter(Boolean).join('-')
}
