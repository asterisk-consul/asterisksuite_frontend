<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import PresupuestoView from '~/modulos/erp/documents/presupuesto/PresupuestoView.vue'
import OrdenVentaView from '~/modulos/erp/documents/orden-venta/OrdenVentaView.vue'
import EntregasParciales from '~/modulos/erp/documents/orden-venta/EntregasParciales.vue'
import RemitoView from '~/modulos/erp/documents/remito/RemitoView.vue'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'

const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { printElement } = usePrint()

const loading = ref(true)
const creatingDispatch = ref(false)
const doc = computed(() => store.current)
const company = computed(() => companiesStore.current)
const category = computed(() => doc.value?.document_types?.category)
const documentNumber = computed(() => {
  if (!doc.value) return ''
  const code = doc.value.document_types?.code ?? ''
  const pointOfSale = doc.value.document_sequences?.point_of_sale
  const number = String(doc.value.number).padStart(8, '0')
  return pointOfSale ? `${code}-${pointOfSale}-${number}` : `${code}-${number}`
})

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

async function createDispatchOrder() {
  if (!doc.value) return
  creatingDispatch.value = true
  try {
    const dispatch = await $fetch<any>(`/api/erp/documents/sales/${doc.value.id}/create-dispatch`, { method: 'POST' })
    useToast().add({ title: 'Orden de Despacho creada', description: 'Ya puede planificarse en un viaje y generar su remito.', color: 'success' })
    await router.push(`/logistica/viajes/dispatch-orders/${dispatch.id}/edit`)
  } catch (error: any) {
    useToast().add({ title: 'No se pudo crear la Orden de Despacho', description: error?.data?.message, color: 'error' })
  } finally {
    creatingDispatch.value = false
  }
}

// ─── Document Actions (shared composable) ─────────────────
const {
  primaryActions,
  secondaryActions,
  confirmModalOpen,
  cancelModalOpen,
  statusModalOpen,
  acceptModalOpen,
  deliverModalOpen,
  processing,
  validTransitions,
  invoiceState,
  handleConfirm,
  handleCancel,
  handleStatus,
  handleAccept,
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
    accept: (id) => store.accept(id),
    deliver: (id) => store.deliver(id),
  },
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader :title="doc ? `${doc.document_types?.description} #${documentNumber}` : 'Documento'">
      <template #links>
        <div class="flex gap-2 items-center flex-wrap">
          <UBadge v-if="invoiceState === 'invoiced'" label="Facturada" color="success" variant="subtle" />
          <UBadge v-else-if="invoiceState === 'partial'" label="Factura parcial" color="warning" variant="subtle" />
          <UButton v-if="category === 'ORDER' && Number(doc?.status) >= 1 && Number(doc?.status) < 7" label="Crear Orden de Despacho" icon="i-lucide-clipboard-list" color="primary" variant="outline" size="sm" :loading="creatingDispatch" @click="createDispatchOrder" />
          <UButton v-for="action in primaryActions" :key="action.label" v-bind="action" size="sm" />
          <UDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions">
            <UButton label="Más" icon="i-lucide-ellipsis" variant="ghost" size="sm" trailingIcon="i-lucide-chevron-down" />
          </UDropdownMenu>
          <DocumentHelpPopover :category="category || 'INVOICE'" :actions="[...primaryActions, ...secondaryActions.flat()]" />
        </div>
      </template>
    </AppPageHeader>

      <div class="p-4 space-y-6">
        <DocumentHeader :document="doc" :loading="loading" />
        <DocumentChain v-if="doc" :document="doc" />

        <PresupuestoView v-if="doc && category === 'QUOTE'" :document="doc" />
        <OrdenVentaView v-if="doc && category === 'ORDER'" :document="doc" />
        <EntregasParciales v-if="doc && category === 'ORDER'" :document="doc" />
        <RemitoView v-if="doc && category === 'REMITO'" :document="doc" />

        <div v-if="doc && company" id="printable-document" class="print-only">
          <DocumentPrintSelector :document="doc" :company="company" />
        </div>
        <DocumentItemsTable v-if="doc" :items="doc.document_items ?? []" :currency="doc.currency_code" :show-tracking="category === 'ORDER'" />
        <DocumentTotals v-if="doc" :document="doc" />
        <UiAttachmentManager
          v-if="doc"
          entity-type="document"
          :entity-id="doc.id"
          :readonly="Number(doc.status) !== 0"
        />
      </div>
  </UPage>

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

  <UModal v-model:open="deliverModalOpen" title="Crear remito desde la orden">
    <template #body>
      <p>Se copiarán el cliente y todos los productos pendientes de esta Orden de Venta.</p>
      <p class="text-sm text-muted mt-2">El remito se creará en borrador para que puedas revisarlo antes de confirmarlo.</p>
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
