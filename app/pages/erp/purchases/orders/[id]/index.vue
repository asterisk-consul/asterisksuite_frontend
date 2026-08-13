<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { usePrint } from '~/composables/usePrint'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import OrdenCompraView from '~/modulos/erp/documents/orden-compra/OrdenCompraView.vue'

const store = useDocumentsPurchasesStore()
const companiesStore = useCompaniesStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { printElement } = usePrint()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()

const loading = ref(true)
const processing = ref(false)
const confirmModalOpen = ref(false)
const cancelModalOpen = ref(false)

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

const actions = computed(() => {
  const items: any[] = [
    { label: 'Imprimir', icon: 'i-lucide-printer', variant: 'outline', help: 'Imprimir la orden de compra.', onClick: () => printElement('printable-document') },
  ]
  if (isDraft.value && (isOwnerOrAdmin.value || hasPermission('documents.update'))) {
    items.push({ label: 'Editar', icon: 'i-lucide-pencil', help: 'Modificar la orden de compra.', onClick: () => router.push(`/erp/purchases/orders/${route.params.id}/edit`) })
  }
  if (isDraft.value && (isOwnerOrAdmin.value || hasPermission('documents.confirm'))) {
    items.push({ label: 'Confirmar', icon: 'i-lucide-check-circle', color: 'success', onClick: () => { confirmModalOpen.value = true } })
  }
  if (isDraft.value && (isOwnerOrAdmin.value || hasPermission('documents.cancel'))) {
    items.push({ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onClick: () => { cancelModalOpen.value = true } })
  }
  if (doc.value?.status === 2 && (isOwnerOrAdmin.value || hasPermission('documents.create'))) {
    items.push({ label: 'Crear Factura', icon: 'i-lucide-file-text', color: 'info', onClick: () => router.push(`/erp/purchases/purchases-documents/new?parent_order_id=${route.params.id}`) })
  }
  return items
})

async function handleConfirm() {
  try {
    processing.value = true
    await store.confirm(route.params.id as string)
    await store.fetchOne(route.params.id as string)
    toast.add({ title: 'Orden confirmada', color: 'success' })
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
    toast.add({ title: 'Orden anulada', color: 'success' })
    cancelModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
  } finally { processing.value = false }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader :title="doc ? `Orden de Compra #${String(doc.number).padStart(8, '0')}` : 'Orden de Compra'">
      <template #links>
        <div class="flex gap-2 items-center">
          <UButton v-for="action in actions" :key="action.label" v-bind="action" size="sm" />
        </div>
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-6">
      <DocumentHeader :document="doc" :loading="loading" />
      <DocumentChain v-if="doc" :document="doc" />

      <!-- OC info -->
      <OrdenCompraView v-if="doc" :document="doc" />

      <div v-if="doc && company" id="printable-document" class="print-only">
        <DocumentPrintSelector :document="doc" :company="company" />
      </div>
      <DocumentItemsTable v-if="doc" :items="doc.document_items ?? []" :currency="doc.currency_code" />
      <DocumentTotals v-if="doc" :document="doc" />
    </div>

    <UModal v-model:open="confirmModalOpen" title="Confirmar orden">
      <template #body>
        <p>¿Confirmar la orden de compra <strong>#{{ doc?.number }}</strong>?</p>
        <p class="text-sm text-muted mt-2">Una vez confirmada, podrás generar una factura.</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
          <UButton label="Confirmar" color="success" :loading="processing" @click="handleConfirm" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="cancelModalOpen" title="Anular orden">
      <template #body>
        <p>¿Anular la orden de compra <strong>#{{ doc?.number }}</strong>?</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="cancelModalOpen = false" />
          <UButton label="Anular" color="error" :loading="processing" @click="handleCancel" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>

<style>
.print-only { display: none; }
@media print {
  .print-only { display: block !important; }
}
</style>
