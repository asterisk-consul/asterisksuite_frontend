<script setup lang="ts">
import DocumentAssignment from './DocumentAssignment.vue'
import { getStatusLabel, getStatusColor, getStatusDescription } from '~/modulos/erp/documents/types/document-statuses'
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'

const props = defineProps<{
  document: any
  loading?: boolean
}>()

const emit = defineEmits<{
  action: [name: string]
}>()

const { can: canDocument } = useDocumentPermissions()

function canOpenDocument(doc: any): boolean {
  if (!doc) return false
  const scope = doc.document_types?.direction === -1 ? 'purchases' : 'sales'
  return canDocument(scope, doc.document_types?.category, 'read')
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.document?.currency_code ?? 'ARS' }).format(n ?? 0)
}

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}

const category = computed(() => props.document?.document_types?.category)
const statusLabel = computed(() => getStatusLabel(category.value, props.document?.status))
const statusColor = computed(() => getStatusColor(category.value, props.document?.status))
const statusDescription = computed(() => getStatusDescription(category.value, props.document?.status))
const pointOfSale = computed(() => props.document?.document_sequences?.point_of_sale)
const docNumber = computed(() => {
  if (!props.document) return ''
  const code = props.document.document_types?.code ?? ''
  const pointOfSale = props.document.document_sequences?.point_of_sale
  const number = String(props.document.number).padStart(8, '0')
  return pointOfSale ? `${code}-${pointOfSale}-${number}` : `${code}-${number}`
})

function resolveDocLink(doc: any): string {
  if (!doc) return '#'
  const direction = doc.document_types?.direction
  const cat = doc.document_types?.category
  const id = doc.id

  if (direction === -1) {
    if (cat === 'ORDER') return `/erp/purchases/orders/${id}`
    if (cat === 'REMITO') return `/erp/purchases/remitos/${id}`
    return `/erp/purchases/purchases-documents/${id}`
  }

  if (cat === 'REMITO') return `/erp/remitos/${id}`
  return `/erp/sales/${id}`
}
</script>

<template>
  <div v-if="loading" class="p-10 text-center text-muted">Cargando...</div>
  <div v-else-if="document" class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ document.document_types?.description }} #{{ docNumber }}</h1>
        <p class="text-sm text-muted">
          {{ fmtDate(document.date) }}
          <template v-if="pointOfSale"> · Punto de venta {{ pointOfSale }}</template>
          <template v-if="document.business_parties"> · {{ document.business_parties.name }}</template>
        </p>
      </div>
      <UPopover v-if="statusDescription" :ui="{ content: 'w-72' }">
        <UBadge :label="statusLabel" :color="statusColor" variant="subtle" size="lg" class="cursor-help" />
        <template #content>
          <div class="p-3">
            <p class="text-sm font-semibold">{{ statusLabel }}</p>
            <p class="text-xs text-muted mt-1">{{ statusDescription }}</p>
          </div>
        </template>
      </UPopover>
      <UBadge v-else :label="statusLabel" :color="statusColor" variant="subtle" size="lg" />
    </div>

    <DocumentAssignment :key="document.id" :document-id="document.id" />

    <!-- Documento padre -->
    <UAlert v-if="document.parent_document" color="info" variant="soft" icon="i-lucide-link">
      <template #title>
        <span>Generado desde: </span>
        <NuxtLink v-if="canOpenDocument(document.parent_document)" :to="resolveDocLink(document.parent_document)" class="underline font-medium">
          {{ document.parent_document.document_types?.description }} #{{ document.parent_document.number }}
        </NuxtLink>
        <span v-else class="inline-flex items-center gap-1 font-medium text-muted" title="No tenés permiso para abrir este tipo de documento">
          <UIcon name="i-lucide-lock" class="size-3.5" />
          {{ document.parent_document.document_types?.description }} #{{ document.parent_document.number }}
        </span>
      </template>
    </UAlert>

  </div>
</template>
