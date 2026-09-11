<script setup lang="ts">
import { useDocumentPermissions } from '~/modulos/erp/documents/composables/useDocumentPermissions'

const props = defineProps<{
  document: any
}>()

const { can: canDocument } = useDocumentPermissions()

function canOpenDocument(doc: any): boolean {
  if (!doc) return false
  const scope = doc.document_types?.direction === -1 ? 'purchases' : 'sales'
  return canDocument(scope, doc.document_types?.category, 'read')
}

function fmtDate(d?: string) {
  return d ? d.slice(0, 10) : '-'
}

function fmtNumber(doc: any) {
  if (!doc) return ''
  const code = doc.document_types?.code ?? ''
  const pointOfSale = doc.document_sequences?.point_of_sale
  const number = String(doc.number).padStart(8, '0')
  return pointOfSale ? `${code}-${pointOfSale}-${number}` : `${code}-${number}`
}

function resolveDocLink(doc: any): string {
  if (!doc) return '#'
  const direction = doc.document_types?.direction
  const category = doc.document_types?.category
  const id = doc.id

  if (direction === -1) {
    if (category === 'ORDER') return `/erp/purchases/orders/${id}`
    if (category === 'REMITO') return `/erp/purchases/remitos/${id}`
    return `/erp/purchases/purchases-documents/${id}`
  }

  if (category === 'REMITO') return `/erp/remitos/${id}`
  return `/erp/sales/${id}`
}
</script>

<template>
  <UCard v-if="document">
    <template #header>
      <h3 class="font-semibold">Cadena de documentos</h3>
    </template>

    <div class="space-y-3">
      <!-- Documento padre -->
      <div v-if="document.parent_document" class="flex items-center gap-3 text-sm">
        <UBadge label="Origen" color="info" variant="subtle" size="sm" />
        <NuxtLink v-if="canOpenDocument(document.parent_document)" :to="resolveDocLink(document.parent_document)" class="underline font-medium">
          {{ document.parent_document.document_types?.description }} #{{ fmtNumber(document.parent_document) }}
        </NuxtLink>
        <span v-else class="inline-flex items-center gap-1 font-medium text-muted" title="No tenés permiso para abrir este tipo de documento">
          <UIcon name="i-lucide-lock" class="size-3.5" />
          {{ document.parent_document.document_types?.description }} #{{ fmtNumber(document.parent_document) }}
        </span>
        <span class="text-muted">{{ fmtDate(document.parent_document.date) }}</span>
      </div>

      <!-- Documento actual -->
      <div class="flex items-center gap-3 text-sm pl-4 border-l-2 border-primary">
        <UBadge label="Actual" color="primary" variant="subtle" size="sm" />
        <span class="font-bold">
          {{ document.document_types?.description }} #{{ fmtNumber(document) }}
        </span>
        <span class="text-muted">{{ fmtDate(document.date) }}</span>
      </div>

      <!-- Documentos hijos -->
      <div v-for="child in document.child_documents" :key="child.id" class="flex items-center gap-3 text-sm pl-4 border-l-2 border-success">
        <UBadge label="Generado" color="success" variant="subtle" size="sm" />
        <NuxtLink v-if="canOpenDocument(child)" :to="resolveDocLink(child)" class="underline font-medium">
          {{ child.document_types?.description }} #{{ fmtNumber(child) }}
        </NuxtLink>
        <span v-else class="inline-flex items-center gap-1 font-medium text-muted" title="No tenés permiso para abrir este tipo de documento">
          <UIcon name="i-lucide-lock" class="size-3.5" />
          {{ child.document_types?.description }} #{{ fmtNumber(child) }}
        </span>
        <span class="text-muted">{{ fmtDate(child.date) }}</span>
        <span class="font-medium" :class="child.status === 2 ? 'text-success' : 'text-muted'">
          {{ child.status === 2 ? 'Confirmado' : 'Borrador' }}
        </span>
      </div>

      <div v-if="!document.parent_document && !document.child_documents?.length" class="text-sm text-muted">
        Sin documentos relacionados
      </div>
    </div>
  </UCard>
</template>
