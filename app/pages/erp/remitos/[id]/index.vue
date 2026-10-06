<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import { usePrint } from '~/composables/usePrint'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import RemitoView from '~/modulos/erp/documents/remito/RemitoView.vue'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'

const route = useRoute()
const router = useRouter()
const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const { printElement } = usePrint()

const loading = ref(true)
const fiscalPreview = ref<any>(null)
const doc = computed(() => store.current)
const company = computed(() => companiesStore.current)
const category = computed(() => doc.value?.document_types?.category)
const printableDocument = computed(() => {
  if (!doc.value || doc.value.fiscal_authorization_code) {
    return doc.value
  }

  return {
    ...doc.value,
    fiscal_authorization_type: fiscalPreview.value?.fiscal_authorization_type,
    fiscal_authorization_code: fiscalPreview.value?.fiscal_authorization_code,
    fiscal_authorization_expires_at: fiscalPreview.value?.fiscal_authorization_expires_at,
  }
})
const itemsWithoutWarehouse = computed(() =>
  (doc.value?.document_items ?? []).filter((item: any) => !item.warehouse_id && !doc.value?.warehouse_id)
)

onMounted(async () => {
  try {
    const companyId = auth.selectedCompany?.id
    await Promise.all([
      store.fetchOne(route.params.id as string),
      companyId && companiesStore.fetchOne(companyId),
    ])
    fiscalPreview.value = await $fetch(`/api/backend/fiscal-authorizations/documents/${route.params.id}/preview`).catch(() => null)
  } finally {
    loading.value = false
  }
})

const {
  primaryActions,
  secondaryActions,
  confirmModalOpen,
  statusModalOpen,
  processing,
  validTransitions,
  handleConfirm,
  handleStatus,
} = useDocumentActions({
  doc,
  category,
  router,
  routeId: computed(() => route.params.id as string),
  module: 'sales',
  printElement,
  store: {
    confirm: (id) => store.confirm(id),
    cancel: (id) => store.cancel(id),
    changeStatus: (id, status) => store.changeStatus(id, status),
    fetchOne: (id) => store.fetchOne(id),
  },
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="doc ? `Remito #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Remito'">
        <template #trailing>
          <div class="flex gap-2 items-center flex-wrap">
            <UButton v-for="action in primaryActions" :key="action.label" v-bind="action" size="sm" />
            <UDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions">
              <UButton label="Más" icon="i-lucide-ellipsis" variant="ghost" size="sm" trailingIcon="i-lucide-chevron-down" />
            </UDropdownMenu>
            <DocumentHelpPopover :category="category || 'REMITO'" :actions="[...primaryActions, ...secondaryActions.flat()]" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <DocumentHeader :document="doc" :loading="loading" />
        <DocumentChain v-if="doc" :document="doc" />
        <RemitoView v-if="doc" :document="doc" />
        <UAlert
          v-if="doc?.status === 0 && fiscalPreview"
          :color="fiscalPreview.status === 'BLOCKED' ? 'error' : fiscalPreview.status === 'WARNING' ? 'warning' : 'success'"
          variant="soft"
          icon="i-lucide-badge-check"
          :title="fiscalPreview.status === 'BLOCKED' ? 'No se puede confirmar fiscalmente' : fiscalPreview.fiscal_authorization_code ? `${fiscalPreview.fiscal_authorization_type} ${fiscalPreview.fiscal_authorization_code}` : 'Control fiscal'"
          :description="fiscalPreview.message || `Vence el ${String(fiscalPreview.fiscal_authorization_expires_at).slice(0, 10)} · ${fiscalPreview.days_remaining} día(s) restantes.`"
        />
        <UAlert
          v-if="doc && itemsWithoutWarehouse.length > 0"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Falta seleccionar un depósito de salida"
          :description="`${itemsWithoutWarehouse.length} ${itemsWithoutWarehouse.length === 1 ? 'producto no tiene' : 'productos no tienen'} depósito. El remito no podrá confirmarse ni descontar stock hasta completarlo.`"
        >
          <template #actions>
            <UButton label="Completar depósitos" icon="i-lucide-warehouse" color="warning" variant="outline" :to="`/erp/sales/${doc.id}/edit`" />
          </template>
        </UAlert>
        <div v-if="doc && company" id="printable-document" class="print-only">
          <DocumentPrintSelector :document="printableDocument" :company="company" />
        </div>
        <DocumentItemsTable
          v-if="doc"
          :items="doc.document_items ?? []"
          :show-amounts="false"
          show-warehouse
          :quantity-label="Number(doc.status) === 2 ? 'Cantidad entregada' : 'Cantidad a entregar'"
          title="Productos del remito"
        />
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="confirmModalOpen" title="Confirmar remito">
    <template #body>
      <p>¿Confirmar este remito y registrar la salida de mercadería?</p>
      <p class="text-sm text-muted mt-2">
        Se descontará el stock de los depósitos seleccionados en cada producto.
      </p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
        <UButton
          label="Confirmar remito"
          color="success"
          :loading="processing"
          :disabled="itemsWithoutWarehouse.length > 0 || fiscalPreview?.status === 'BLOCKED'"
          @click="handleConfirm"
        />
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
</template>

<style>
.print-only { display: none; }
@media print {
  .print-only { display: block !important; }
}
</style>
