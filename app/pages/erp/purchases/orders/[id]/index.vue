<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import OrdenCompraView from '~/modulos/erp/documents/orden-compra/OrdenCompraView.vue'

const store = useDocumentsPurchasesStore()
const companiesStore = useCompaniesStore()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
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

const {
  primaryActions,
  secondaryActions,
  confirmModalOpen,
  cancelModalOpen,
  processing,
  handleConfirm,
  handleCancel,
} = useDocumentActions({
  doc,
  category,
  router,
  routeId: computed(() => route.params.id as string),
  module: 'purchases',
  store: {
    confirm: (id) => store.confirm(id),
    cancel: (id) => store.cancel(id),
    changeStatus: (id, status) => store.changeStatus(id, status),
    fetchOne: (id) => store.fetchOne(id),
  },
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader :title="doc ? `Orden de Compra #${String(doc.number).padStart(8, '0')}` : 'Orden de Compra'">
      <template #links>
        <div class="flex gap-2 items-center flex-wrap">
          <UButton v-for="action in primaryActions" :key="action.label" v-bind="action" size="sm" />
          <UDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions">
            <UButton label="Más" icon="i-lucide-ellipsis" variant="ghost" size="sm" trailingIcon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </div>
      </template>
    </AppPageHeader>

    <div class="p-4 space-y-6">
      <DocumentHeader :document="doc" :loading="loading" />
      <DocumentChain v-if="doc" :document="doc" />
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
