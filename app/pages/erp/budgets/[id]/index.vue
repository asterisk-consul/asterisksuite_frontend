<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

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
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'

const route = useRoute()
const router = useRouter()
const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const toast = useToast()
const { printElement } = usePrint()

const loading = ref(true)
const processing = ref(false)
const statusModalOpen = ref(false)
const confirmModalOpen = ref(false)
const cancelModalOpen = ref(false)
const acceptModalOpen = ref(false)

const doc = computed(() => store.current)
const category = computed(() => doc.value?.document_types?.category)
const isDraft = computed(() => doc.value?.status === 0)
const isConfirmed = computed(() => doc.value?.status === 2)

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
    { label: 'Imprimir', icon: 'i-lucide-printer', variant: 'outline', help: 'Abre una nueva ventana con la vista de impresión del presupuesto. Podés imprimirlo o guardarlo como PDF.', onClick: () => printElement('printable-document') },
  ]
  if (isDraft.value) {
    items.push({ label: 'Editar', icon: 'i-lucide-pencil', help: 'Permite modificar los datos del presupuesto. Solo disponible mientras esté en borrador.', onClick: () => router.push(`/erp/sales/${route.params.id}/edit`) })
    items.push({ label: 'Confirmar', icon: 'i-lucide-check-circle', color: 'success', help: 'Confirma el presupuesto y lo marca como enviado al cliente. Una vez confirmado, no se puede editar.', onClick: () => { confirmModalOpen.value = true } })
    items.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', help: 'Anula el presupuesto permanentemente. Se revierten los movimientos de cuenta corriente si los hubiera.', onClick: () => { cancelModalOpen.value = true } })
  }
  if (validTransitions.value.length > 0) {
    items.push({ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', help: 'Permite cambiar manualmente el estado del presupuesto según el flujo permitido.', onClick: () => { statusModalOpen.value = true } })
  }
  if (isConfirmed.value) {
    items.push({ label: 'Convertir a OV', icon: 'i-lucide-arrow-right-circle', color: 'success', help: 'Acepta el presupuesto y crea una Orden de Venta con los mismos ítems y precios.', onClick: () => { acceptModalOpen.value = true } })
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

async function handleConfirm() {
  try {
    processing.value = true
    await store.confirm(route.params.id as string)
    toast.add({ title: 'Presupuesto confirmado', color: 'success' })
    confirmModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    processing.value = false
  }
}

async function handleCancel() {
  try {
    processing.value = true
    await store.cancel(route.params.id as string)
    toast.add({ title: 'Presupuesto anulado', color: 'success' })
    cancelModalOpen.value = false
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
    acceptModalOpen.value = false
    router.push(`/erp/orders/${newDoc.id}`)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader :title="doc ? `Presupuesto #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Presupuesto'">
      <template #links>
        <div class="flex gap-2 items-center">
          <UButton v-for="action in actions" :key="action.label" v-bind="action" size="sm" />
          <DocumentHelpPopover :category="category || 'QUOTE'" :actions="actions" />
        </div>
      </template>
    </AppPageHeader>

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
  </UPage>

  <!-- Confirm Modal -->
  <UModal v-model:open="confirmModalOpen" title="Confirmar presupuesto">
    <template #body>
      <p>¿Confirmar el presupuesto <strong>#{{ doc?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Una vez confirmado, no podrá ser editado.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
        <UButton label="Confirmar" color="success" :loading="processing" @click="handleConfirm" />
      </div>
    </template>
  </UModal>

  <!-- Cancel Modal -->
  <UModal v-model:open="cancelModalOpen" title="Anular presupuesto">
    <template #body>
      <p>¿Anular el presupuesto <strong>#{{ doc?.number }}</strong>?</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="cancelModalOpen = false" />
        <UButton label="Anular" color="error" :loading="processing" @click="handleCancel" />
      </div>
    </template>
  </UModal>

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

  <!-- Accept Modal (Convertir a OV) -->
  <UModal v-model:open="acceptModalOpen" title="Convertir a Orden de Venta">
    <template #body>
      <p>¿Aceptar y crear Orden de Venta?</p>
      <p class="text-sm text-muted mt-2">Se creará una OV con los mismos ítems y precios del presupuesto.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="acceptModalOpen = false" />
        <UButton label="Aceptar y crear OV" color="success" :loading="processing" @click="handleAccept" />
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
