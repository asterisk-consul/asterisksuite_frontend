<script setup lang="ts">
import { getStatusLabel, getStatusColor, getStatusDescription } from '~/modulos/erp/documents/types/document-statuses'

const props = defineProps<{
  document: any
  loading?: boolean
}>()

const emit = defineEmits<{
  action: [name: string]
}>()

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
const docNumber = computed(() => {
  if (!props.document) return ''
  return `${props.document.document_types?.code}-${String(props.document.number).padStart(8, '0')}`
})
</script>

<template>
  <div v-if="loading" class="p-10 text-center text-muted">Cargando...</div>
  <div v-else-if="document" class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ document.document_types?.description }} #{{ docNumber }}</h1>
        <p class="text-sm text-muted">
          {{ fmtDate(document.date) }}
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

    <!-- Documento padre -->
    <UAlert v-if="document.parent_document" color="info" variant="soft" icon="i-lucide-link">
      <template #title>
        <span>Generado desde: </span>
        <NuxtLink :to="`/erp/sales/${document.parent_document.id}`" class="underline font-medium">
          {{ document.parent_document.document_types?.description }} #{{ document.parent_document.number }}
        </NuxtLink>
      </template>
    </UAlert>

    <!-- Documentos hijos -->
    <UAlert v-if="document.child_documents?.length > 0" color="success" variant="soft" icon="i-lucide-arrow-right-circle">
      <template #title>
        <span>Documentos generados ({{ document.child_documents.length }})</span>
      </template>
      <template #description>
        <div class="flex flex-wrap gap-2 mt-1">
          <NuxtLink v-for="child in document.child_documents" :key="child.id" :to="`/erp/sales/${child.id}`" class="underline text-sm">
            {{ child.document_types?.description }} #{{ child.document_types?.code }}-{{ String(child.number).padStart(8, '0') }}
          </NuxtLink>
        </div>
      </template>
    </UAlert>
  </div>
</template>
