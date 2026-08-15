<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import OrdenVentaView from '~/modulos/erp/documents/orden-venta/OrdenVentaView.vue'
import EntregasParciales from '~/modulos/erp/documents/orden-venta/EntregasParciales.vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { usePrint } from '~/composables/usePrint'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const route = useRoute()
const router = useRouter()
const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const toast = useToast()
const { printElement } = usePrint()

const loading = ref(true)
const processing = ref(false)
const statusModalOpen = ref(false)
const partialDeliverModalOpen = ref(false)
const partialInvoiceModalOpen = ref(false)

const doc = computed(() => store.current)
const company = computed(() => companiesStore.items[0])
const category = computed(() => doc.value?.document_types?.category)

const invoiceState = computed(() => {
  const children = doc.value?.child_documents ?? []
  const invoices = children.filter((c: any) => c.document_types?.category === 'INVOICE' && c.status >= 1)
  if (!invoices.length) return null
  const hasDraft = invoices.some((c: any) => c.status < 2)
  return hasDraft ? 'partial' : 'invoiced'
})

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
    { label: 'Imprimir', icon: 'i-lucide-printer', variant: 'outline', help: 'Abre una nueva ventana con la vista de impresión de la OV. Podés imprimirlo o guardarlo como PDF.', onClick: () => printElement('printable-document') },
  ]
  if (doc.value?.status === 0) {
    items.push({ label: 'Editar', icon: 'i-lucide-pencil', help: 'Permite modificar los datos de la OV. Solo disponible mientras esté en borrador.', onClick: () => router.push(`/erp/sales/${route.params.id}/edit`) })
  }
  if (validTransitions.value.length > 0) {
    items.push({ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', help: 'Permite cambiar manualmente el estado de la OV según el flujo permitido.', onClick: () => { statusModalOpen.value = true } })
  }
  if (doc.value?.status >= 1 && doc.value?.status < 7) {
    items.push({ label: 'Crear Remito', icon: 'i-lucide-truck', color: 'success', help: 'Crea un remito de entrega para los ítems de esta OV. Puede ser entrega parcial.', onClick: () => { deliverModalOpen.value = true } })
    const isPurchaseOrder = doc.value?.document_types?.direction === -1
    const canCreateInvoice = isOwnerOrAdmin.value || (isPurchaseOrder ? hasPermission('purchases.create') : hasPermission('sales.create'))
    if (canCreateInvoice) {
      items.push({
        label: 'Crear Factura',
        icon: 'i-lucide-file-text',
        color: 'info',
        help: isPurchaseOrder ? 'Crea una factura de compra con los ítems de esta OC.' : 'Crea una factura con los ítems de esta OV.',
        onClick: () => router.push(isPurchaseOrder
          ? `/erp/purchases/purchases-documents/new?parent_order_id=${route.params.id}`
          : `/erp/sales/new?category=INVOICE&parent_order_id=${route.params.id}`)
      })
    }
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

async function handlePartialDeliver() {
  // TODO: Open modal to select items and quantities
  // For now, redirect to a future page
  toast.add({ title: 'Función de entrega parcial - Próximamente', color: 'info' })
}

async function handlePartialInvoice() {
  // TODO: Open modal to select items and quantities
  toast.add({ title: 'Función de facturación parcial - Próximamente', color: 'info' })
}

async function handleCreateRemito() {
  try {
    processing.value = true
    const newDoc = await store.deliver(route.params.id as string)
    toast.add({ title: 'Remito creado correctamente', color: 'success' })
    router.push(`/erp/remitos/${newDoc.id}`)
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
      <UDashboardNavbar :title="doc ? `OV #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Orden de Venta'">
        <template #trailing>
          <div class="flex gap-2 items-center">
            <UBadge v-if="invoiceState === 'invoiced'" label="Facturada" color="success" variant="subtle" />
            <UBadge v-else-if="invoiceState === 'partial'" label="Factura parcial" color="warning" variant="subtle" />
            <UButton v-for="action in actions" :key="action.label" v-bind="action" size="sm" />
            <DocumentHelpPopover :category="category || 'ORDER'" :actions="actions" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <DocumentHeader :document="doc" :loading="loading" />
        <DocumentChain v-if="doc" :document="doc" />
        <OrdenVentaView v-if="doc" :document="doc" />
        <EntregasParciales v-if="doc" :document="doc" @partial-deliver="handlePartialDeliver" @partial-invoice="handlePartialInvoice" />
        <div v-if="doc && company" id="printable-document" class="print-only">
          <DocumentPrintSelector :document="doc" :company="company" />
        </div>
        <DocumentItemsTable v-if="doc" :items="doc.document_items ?? []" :currency="doc.currency_code" show-tracking />
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
