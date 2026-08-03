<script setup lang="ts">
definePageMeta({ layout: 'erp', middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import PresupuestoView from '~/modulos/erp/documents/presupuesto/PresupuestoView.vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { usePrint } from '~/composables/usePrint'

const route = useRoute()
const router = useRouter()
const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const toast = useToast()
const { printElement } = usePrint()

const loading = ref(true)
const processing = ref(false)
const statusModalOpen = ref(false)

const doc = computed(() => store.current)
const category = computed(() => doc.value?.document_types?.category)
const isDraft = computed(() => doc.value?.status === 0)

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchOne(route.params.id as string),
      companiesStore.fetchAll(),
    ])
  } finally {
    loading.value = false
  }
})

const company = computed(() => companiesStore.items[0])

const validTransitions = computed(() => {
  if (!doc.value) return []
  return getValidTransitions(category.value, doc.value.status).map(s => ({
    label: getStatusLabel(category.value, s),
    status: s,
    color: getStatusColor(category.value, s),
  }))
})

const actions = computed(() => {
  const items: any[] = [
    { label: 'Imprimir', icon: 'i-lucide-printer', variant: 'outline', onClick: () => printElement('printable-document') },
  ]
  if (isDraft.value) {
    items.push({ label: 'Editar', icon: 'i-lucide-pencil', onClick: () => router.push(`/erp/sales/${route.params.id}/edit`) })
  }
  if (validTransitions.value.length > 0) {
    items.push({ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', onClick: () => { statusModalOpen.value = true } })
  }
  return items
})

async function changeStatus(status: number) {
  try {
    processing.value = true
    await store.changeStatus(route.params.id as string, status)
    toast.add({ title: 'Estado actualizado', color: 'success' })
    statusModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    processing.value = false
  }
}

async function handleAccept() {
  try {
    processing.value = true
    const newDoc = await store.accept(route.params.id as string)
    toast.add({ title: 'OV creada correctamente', color: 'success' })
    router.push(`/erp/orders/${newDoc.id}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="doc ? `Presupuesto #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Presupuesto'">
        <template #trailing>
          <div class="flex gap-2">
            <UButton v-for="action in actions" :key="action.label" v-bind="action" size="sm" />
            <UButton v-if="doc?.status === 2" label="Convertir a OV" icon="i-lucide-arrow-right-circle" color="success" size="sm" :loading="processing" @click="handleAccept" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <DocumentHeader :document="doc" :loading="loading" />
        <DocumentChain v-if="doc" :document="doc" />
        <PresupuestoView v-if="doc" :document="doc" />
        <div v-if="doc && company" id="printable-document" class="print-only">
          <DocumentPrintSelector :document="doc" :company="company" />
        </div>
        <DocumentItemsTable v-if="doc" :items="doc.document_items ?? []" :currency="doc.currency_code" />
        <DocumentTotals v-if="doc" :document="doc" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Status Modal -->
  <UModal v-model:open="statusModalOpen" title="Cambiar estado">
    <template #body>
      <div class="space-y-2">
        <UButton v-for="t in validTransitions" :key="t.status" :label="t.label" :color="t.color" variant="outline" class="w-full justify-start" :loading="processing" @click="changeStatus(t.status)" />
      </div>
      <div class="flex justify-end pt-4">
        <UButton label="Cancelar" variant="ghost" @click="statusModalOpen = false" />
      </div>
    </template>
  </UModal>
</template>

<style>
.print-only { display: none; }
@media print {
  .print-only { display: block !important; }
}
</style>
