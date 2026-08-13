<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import RemitoView from '~/modulos/erp/documents/remito/RemitoView.vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { usePrint } from '~/composables/usePrint'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const route = useRoute()
const router = useRouter()
const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const toast = useToast()
const { printElement } = usePrint()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const loading = ref(true)
const processing = ref(false)
const statusModalOpen = ref(false)

const doc = computed(() => store.current)
const company = computed(() => companiesStore.items[0])
const category = computed(() => doc.value?.document_types?.category)

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
    { label: 'Imprimir', icon: 'i-lucide-printer', variant: 'outline', help: 'Abre una nueva ventana con la vista de impresión del remito. Podés imprimirlo o guardarlo como PDF.', onClick: () => printElement('printable-document') },
  ]
  if (validTransitions.value.length > 0) {
    items.push({ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', help: 'Permite cambiar manualmente el estado del remito según el flujo permitido.', onClick: () => { statusModalOpen.value = true } })
  }
  if (doc.value?.status === 2 && (isOwnerOrAdmin.value || hasPermission('sales.create'))) {
    items.push({ label: 'Crear Factura', icon: 'i-lucide-file-text', color: 'info', help: 'Crea una factura con los ítems de este remito.', onClick: () => router.push(`/erp/sales/new?category=INVOICE&parent_order_id=${route.params.id}`) })
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
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="doc ? `Remito #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Remito'">
        <template #trailing>
          <div class="flex gap-2">
            <UButton v-for="action in actions" :key="action.label" v-bind="action" size="sm" />
            <DocumentHelpPopover :category="category || 'REMITO'" :actions="actions" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <DocumentHeader :document="doc" :loading="loading" />
        <DocumentChain v-if="doc" :document="doc" />
        <RemitoView v-if="doc" :document="doc" />
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
