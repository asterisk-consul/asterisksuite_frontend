<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import { usePrint } from '~/composables/usePrint'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import OrdenVentaView from '~/modulos/erp/documents/orden-venta/OrdenVentaView.vue'
import EntregasParciales from '~/modulos/erp/documents/orden-venta/EntregasParciales.vue'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'

const route = useRoute()
const router = useRouter()
const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const { printElement } = usePrint()
const toast = useToast()

const loading = ref(true)
const doc = computed(() => store.current)
const company = computed(() => companiesStore.current)
const category = computed(() => doc.value?.document_types?.category)

onMounted(async () => {
  try {
    const companyId = auth.selectedCompany?.id
    await Promise.all([
      store.fetchOne(route.params.id as string),
      companyId && companiesStore.fetchOne(companyId),
    ])
  } finally {
    loading.value = false
  }
})

const {
  primaryActions,
  secondaryActions,
  statusModalOpen,
  processing,
  validTransitions,
  invoiceState,
  handleStatus,
  handleDeliver,
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
    deliver: (id) => store.deliver(id),
  },
})

async function handlePartialDeliver() {
  toast.add({ title: 'Función de entrega parcial - Próximamente', color: 'info' })
}

async function handlePartialInvoice() {
  toast.add({ title: 'Función de facturación parcial - Próximamente', color: 'info' })
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="doc ? `OV #${doc.document_types?.code}-${String(doc.number).padStart(8, '0')}` : 'Orden de Venta'">
        <template #trailing>
          <div class="flex gap-2 items-center flex-wrap">
            <UBadge v-if="invoiceState === 'invoiced'" label="Facturada" color="success" variant="subtle" />
            <UBadge v-else-if="invoiceState === 'partial'" label="Factura parcial" color="warning" variant="subtle" />
            <UButton v-for="action in primaryActions" :key="action.label" v-bind="action" size="sm" />
            <UDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions">
              <UButton label="Más" icon="i-lucide-ellipsis" variant="ghost" size="sm" trailingIcon="i-lucide-chevron-down" />
            </UDropdownMenu>
            <DocumentHelpPopover :category="category || 'ORDER'" :actions="[...primaryActions, ...secondaryActions.flat()]" />
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
