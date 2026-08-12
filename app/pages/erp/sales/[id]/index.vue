<script setup lang="ts">
definePageMeta({ layout: 'treasury', middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import PresupuestoView from '~/modulos/erp/documents/presupuesto/PresupuestoView.vue'
import OrdenVentaView from '~/modulos/erp/documents/orden-venta/OrdenVentaView.vue'
import EntregasParciales from '~/modulos/erp/documents/orden-venta/EntregasParciales.vue'
import RemitoView from '~/modulos/erp/documents/remito/RemitoView.vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { usePrint } from '~/composables/usePrint'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'

const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { mainCollapsed } = useSidebarState()
const { printElement } = usePrint()

const loading = ref(true)
const processing = ref(false)
const confirmModalOpen = ref(false)
const cancelModalOpen = ref(false)
const statusModalOpen = ref(false)
const acceptModalOpen = ref(false)
const deliverModalOpen = ref(false)

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

const isDraft = computed(() => doc.value?.status === 0)
const isConfirmed = computed(() => doc.value?.status === 2)

const actions = computed(() => {
  const items: any[] = [
    { label: 'Imprimir', icon: 'i-lucide-printer', variant: 'outline', help: 'Abre una nueva ventana con la vista de impresión del documento. Podés imprimirlo o guardarlo como PDF.', onClick: () => printElement('printable-document') },
  ]
  if (isDraft.value) {
    items.push({ label: 'Editar', icon: 'i-lucide-pencil', help: 'Permite modificar los datos del documento. Solo disponible mientras esté en borrador.', onClick: () => router.push(`/erp/sales/${route.params.id}/edit`) })
    items.push({ label: 'Confirmar', icon: 'i-lucide-check-circle', color: 'success', help: 'Confirma el documento fiscalmente. Una vez confirmado, no se puede editar ni eliminar.', onClick: () => { confirmModalOpen.value = true } })
    items.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', help: 'Anula el documento permanentemente. Se revierten los movimientos de cuenta corriente si los hubiera.', onClick: () => { cancelModalOpen.value = true } })
  }
  if (validTransitions.value.length > 0) {
    items.push({ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', help: 'Permite cambiar manualmente el estado del documento según el flujo permitido.', onClick: () => { statusModalOpen.value = true } })
  }
  if (category.value === 'QUOTE' && isConfirmed.value) {
    items.push({ label: 'Aceptar → OV', icon: 'i-lucide-check-circle', color: 'success', help: 'Acepta el presupuesto y crea una Orden de Venta con los mismos ítems y precios.', onClick: () => { acceptModalOpen.value = true } })
  }
  if (category.value === 'ORDER' && isConfirmed.value) {
    items.push({ label: 'Despachar → Remito', icon: 'i-lucide-truck', color: 'success', help: 'Crea un remito de entrega para los ítems de esta OV. Puede ser entrega parcial.', onClick: () => { deliverModalOpen.value = true } })
  }
  if (isConfirmed.value && doc.value?.party_id && ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(doc.value?.document_types?.category)) {
    items.push({ label: 'Cuenta corriente', icon: 'i-lucide-arrow-right-circle', color: 'primary', help: 'Muestra el saldo y los movimientos de cuenta corriente de este cliente/proveedor.', onClick: () => {
      const currency = doc.value!.currency_code ?? 'ARS'
      router.push(`/erp/treasury/current-accounts/${doc.value!.party_id}?currency=${currency}`)
    }})
    if (!doc.value?.payment_documents?.length) {
      items.push({ label: 'Realizar el pago', icon: 'i-lucide-wallet', color: 'success', help: 'Creá un pago o cobro para esta factura.', onClick: () => {
        router.push(`/erp/treasury/payments/create?party_id=${doc.value!.party_id}&document_id=${doc.value!.id}&type=COLLECTION`)
      }})
    }
  }
  return items
})

// ─── Actions ──────────────────────────────────────────
async function handleConfirm() {
  try {
    processing.value = true
    await store.confirm(route.params.id as string)
    await store.fetchOne(route.params.id as string)
    toast.add({ title: 'Documento confirmado', color: 'success' })
    confirmModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally { processing.value = false }
}

async function handleCancel() {
  try {
    processing.value = true
    await store.cancel(route.params.id as string)
    await store.fetchOne(route.params.id as string)
    toast.add({ title: 'Documento anulado', color: 'success' })
    cancelModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally { processing.value = false }
}

async function handleStatus(status: number) {
  try {
    processing.value = true
    await store.changeStatus(route.params.id as string, status)
    await store.fetchOne(route.params.id as string)
    toast.add({ title: 'Estado actualizado', color: 'success' })
    statusModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally { processing.value = false }
}

async function handleAccept() {
  try {
    processing.value = true
    const newDoc = await store.accept(route.params.id as string)
    toast.add({ title: 'OV creada', color: 'success' })
    acceptModalOpen.value = false
    router.push(`/erp/orders/${newDoc.id}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally { processing.value = false }
}

async function handleDeliver() {
  try {
    processing.value = true
    const newDoc = await store.deliver(route.params.id as string)
    toast.add({ title: 'Remito creado', color: 'success' })
    deliverModalOpen.value = false
    router.push(`/erp/remitos/${newDoc.id}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally { processing.value = false }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="doc ? `${doc.document_types?.description} #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Documento'">
        <template #leading>
          <UButton icon="i-lucide-panel-left-close" variant="ghost" color="neutral" @click="mainCollapsed = !mainCollapsed" />
        </template>
        <template #trailing>
          <div class="flex gap-2 items-center">
            <UButton v-for="action in actions" :key="action.label" v-bind="action" size="sm" />
            <DocumentHelpPopover :category="category || 'INVOICE'" :actions="actions" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <DocumentHeader :document="doc" :loading="loading" />
        <DocumentChain v-if="doc" :document="doc" />

        <!-- Presupuesto info -->
        <PresupuestoView v-if="doc && category === 'QUOTE'" :document="doc" />

        <!-- OV info -->
        <OrdenVentaView v-if="doc && category === 'ORDER'" :document="doc" />
        <EntregasParciales v-if="doc && category === 'ORDER'" :document="doc" />

        <!-- Remito info -->
        <RemitoView v-if="doc && category === 'REMITO'" :document="doc" />

        <!-- Items y Totales (compartidos) -->
        <div v-if="doc && company" id="printable-document" class="print-only">
          <DocumentPrintSelector :document="doc" :company="company" />
        </div>
        <DocumentItemsTable v-if="doc" :items="doc.document_items ?? []" :currency="doc.currency_code" :show-tracking="category === 'ORDER'" />
        <DocumentTotals v-if="doc" :document="doc" />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modals -->
  <UModal v-model:open="confirmModalOpen" title="Confirmar documento">
    <template #body>
      <p>¿Confirmar el documento <strong>#{{ doc?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Una vez confirmado, no podrá ser editado.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
        <UButton label="Confirmar" color="success" :loading="processing" @click="handleConfirm" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="cancelModalOpen" title="Anular documento">
    <template #body>
      <p>¿Anular el documento <strong>#{{ doc?.number }}</strong>?</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="cancelModalOpen = false" />
        <UButton label="Anular" color="error" :loading="processing" @click="handleCancel" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="statusModalOpen" title="Cambiar estado">
    <template #body>
      <div class="space-y-2">
        <UButton v-for="t in validTransitions" :key="t.status" :label="t.label" :color="t.color" variant="outline" class="w-full justify-start" :loading="processing" @click="handleStatus(t.status)" />
      </div>
      <div class="flex justify-end pt-4">
        <UButton label="Cancelar" variant="ghost" @click="statusModalOpen = false" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="acceptModalOpen" title="Aceptar presupuesto">
    <template #body>
      <p>¿Aceptar y crear Orden de Venta?</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="acceptModalOpen = false" />
        <UButton label="Aceptar y crear OV" color="success" :loading="processing" @click="handleAccept" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deliverModalOpen" title="Despachar orden">
    <template #body>
      <p>¿Crear remito para esta OV?</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="deliverModalOpen = false" />
        <UButton label="Crear Remito" color="success" :loading="processing" @click="handleDeliver" />
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
