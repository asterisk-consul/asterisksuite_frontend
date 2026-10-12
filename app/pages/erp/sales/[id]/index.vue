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
import OrderStockAvailability from '~/modulos/erp/documents/orden-venta/OrderStockAvailability.vue'
import RemitoView from '~/modulos/erp/documents/remito/RemitoView.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'

const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { printElement } = usePrint()

const loading = ref(true)
const creatingDispatch = ref(false)
const stockAvailabilityOpen = ref(false)
const stockAvailabilityLoading = ref(false)
const stockAvailability = ref<any>(null)
const stockWarningShown = ref(false)
const doc = computed(() => store.current)
const company = computed(() => companiesStore.current)
const category = computed(() => doc.value?.document_types?.category)
const isSalesOrder = computed(() => category.value === 'ORDER' || doc.value?.document_types?.code === 'OV')
const documentNumber = computed(() => {
  if (!doc.value) return ''
  const code = doc.value.document_types?.code ?? ''
  const pointOfSale = doc.value.document_sequences?.point_of_sale
  const number = String(doc.value.number).padStart(8, '0')
  return pointOfSale ? `${code}-${pointOfSale}-${number}` : `${code}-${number}`
})

useBreadcrumbEntityLabel(
  computed(() => `/erp/sales/${route.params.id as string}`),
  documentNumber
)

onMounted(async () => {
  try {
    const companyId = auth.selectedCompany?.id
    await Promise.all([
      store.fetchOne(route.params.id as string),
      companyId && companiesStore.fetchOne(companyId),
    ])

    if (store.current?.document_types?.category === 'REMITO') {
      await router.replace(`/erp/remitos/${route.params.id as string}`)
      return
    }

    if (isSalesOrder.value) {
      await loadStockAvailability(true)
    }
  } finally {
    loading.value = false
  }
})

async function loadStockAvailability(showToast = false) {
  if (!doc.value || !isSalesOrder.value) return false
  stockAvailabilityLoading.value = true
  try {
    stockAvailability.value = await DocumentsSalesService.getStockAvailability(doc.value.id)
    if (showToast && !stockWarningShown.value && stockAvailability.value?.summary?.without_physical_stock > 0) {
      const count = stockAvailability.value.summary.without_physical_stock
      useToast().add({
        title: 'La OV tiene productos sin stock físico',
        description: `${count} producto${count === 1 ? '' : 's'} no ${count === 1 ? 'tiene' : 'tienen'} disponibilidad inmediata. Podés revisar depósitos y mercadería en tránsito.`,
        color: 'warning',
        icon: 'i-lucide-warehouse',
      })
      stockWarningShown.value = true
    }
    return true
  } catch (error: any) {
    if (!showToast) {
      useToast().add({ title: 'No se pudo consultar el stock', description: error?.data?.message, color: 'error' })
    }
    return false
  } finally {
    stockAvailabilityLoading.value = false
  }
}

async function openStockAvailability() {
  stockAvailabilityOpen.value = true
  await loadStockAvailability()
}

async function confirmWithAvailability() {
  if (isSalesOrder.value) {
    const loaded = await loadStockAvailability()
    if (!loaded) return
    if (stockAvailability.value?.policy?.blocks_confirmation) return
  }
  await handleConfirm()
}

async function createDispatchOrder() {
  if (!doc.value) return
  creatingDispatch.value = true
  try {
    const dispatch = await $fetch<any>(`/api/backend/documents/sales/${doc.value.id}/create-dispatch`, { method: 'POST' })
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
  deleteModalOpen,
  statusModalOpen,
  acceptModalOpen,
  deliverModalOpen,
  processing,
  validTransitions,
  invoiceState,
  handleConfirm,
  handleCancel,
  handleRemove,
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
    remove: (id) => store.remove(id),
    accept: (id) => store.accept(id),
    deliver: (id) => store.deliver(id),
  },
})

watch(confirmModalOpen, async (open) => {
  if (open && isSalesOrder.value) await loadStockAvailability()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader :title="doc ? `${doc.document_types?.description} #${documentNumber}` : 'Documento'">
      <template #links>
        <div class="flex gap-2 items-center flex-wrap">
          <UBadge v-if="invoiceState === 'invoiced'" label="Facturada" color="success" variant="subtle" />
          <UBadge v-else-if="invoiceState === 'partial'" label="Factura parcial" color="warning" variant="subtle" />
          <UButton v-if="isSalesOrder" label="Ver disponibilidad" icon="i-lucide-warehouse" color="neutral" variant="outline" size="sm" :loading="stockAvailabilityLoading" @click="openStockAvailability" />
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
        <!-- Tracking de entregas y facturación oculto temporalmente.
             El componente EntregasParciales se conserva para retomarlo más adelante. -->
        <RemitoView v-if="doc && category === 'REMITO'" :document="doc" />

        <div v-if="doc && company" id="printable-document" class="print-only">
          <DocumentPrintSelector :document="doc" :company="company" />
        </div>
        <DocumentItemsTable
          v-if="doc"
          :items="doc.document_items ?? []"
          :currency="doc.currency_code"
          :show-tracking="category === 'ORDER'"
          :show-amounts="category !== 'REMITO'"
          :show-warehouse="category === 'REMITO'"
        />
        <DocumentTotals v-if="doc && category !== 'REMITO'" :document="doc" />
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
      <div class="space-y-4">
        <div>
          <p>¿Confirmar el documento <strong>#{{ doc?.number }}</strong>?</p>
          <p class="text-sm text-muted mt-2">Una vez confirmado, no podrá ser editado.</p>
        </div>
        <OrderStockAvailability v-if="isSalesOrder" :availability="stockAvailability" :loading="stockAvailabilityLoading" />
        <UAlert
          v-if="isSalesOrder && stockAvailability?.policy?.blocks_confirmation"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-x"
          title="La configuración actual no permite confirmar esta OV"
          description="Falta stock reservable y no están permitidas las reservas parciales ni la venta sin stock."
        />
      </div>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
        <UButton
          :label="isSalesOrder && stockAvailability?.summary?.with_shortage ? 'Confirmar OV con faltante' : 'Confirmar'"
          color="success"
          :loading="processing || stockAvailabilityLoading"
          :disabled="stockAvailabilityLoading || stockAvailability?.policy?.blocks_confirmation"
          @click="confirmWithAvailability"
        />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="stockAvailabilityOpen" title="Disponibilidad de la Orden de Venta" description="Stock físico, reservas y mercadería en tránsito para los productos de esta OV." :ui="{ content: 'sm:max-w-5xl' }">
    <template #body>
      <OrderStockAvailability :availability="stockAvailability" :loading="stockAvailabilityLoading" />
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton label="Cerrar" variant="outline" @click="stockAvailabilityOpen = false" />
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

  <UModal v-model:open="deleteModalOpen" title="Enviar factura a la papelera">
    <template #body>
      <p>La factura anulada <strong>#{{ doc?.number }}</strong> dejará de aparecer en el circuito habitual.</p>
      <p class="text-sm text-muted mt-2">Se conserva su historial y podrá restaurarse desde la papelera.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
        <UButton label="Enviar a papelera" color="error" :loading="processing" @click="handleRemove" />
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
