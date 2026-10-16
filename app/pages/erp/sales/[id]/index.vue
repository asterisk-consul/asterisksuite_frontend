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
import { getOrderFlowPresentation } from '~/modulos/erp/documents/orden-venta/order-flow-status'

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
const NO_ASSIGNEE = '__NO_ASSIGNEE__'
const assignmentContextLoading = ref(false)
const confirmationAssigneeId = ref<string | null>(null)
const assignmentSettings = ref({
  prompt_order_assignee_on_confirmation: true,
  require_order_assignee_on_confirmation: false,
  default_order_assignee_id: null as string | null
})
const companyUsers = ref<Array<{ id: string, name: string, email: string }>>([])
const assigneeOptions = computed(() => [
  ...(assignmentSettings.value.require_order_assignee_on_confirmation
    ? []
    : [{ value: NO_ASSIGNEE, label: 'Continuar sin asignar', description: 'La OV no quedará en la bandeja de otra persona.' }]),
  ...companyUsers.value.map(user => ({
    value: user.id,
    label: user.name || user.email,
    description: user.email
  }))
])
const doc = computed(() => store.current)
const company = computed(() => companiesStore.current)
const category = computed(() => doc.value?.document_types?.category)
const isSalesOrder = computed(() => category.value === 'ORDER' || doc.value?.document_types?.code === 'OV')
const orderHasAssignee = computed(() => !!doc.value?.assigned_to)
const showAssigneePrompt = computed(() => isSalesOrder.value
  && !orderHasAssignee.value
  && (assignmentSettings.value.prompt_order_assignee_on_confirmation
    || assignmentSettings.value.require_order_assignee_on_confirmation))
const selectedAssignee = computed(() => companyUsers.value.find(user => user.id === (doc.value?.assigned_to || confirmationAssigneeId.value)))
const effectiveConfirmationAssigneeId = computed(() => confirmationAssigneeId.value === NO_ASSIGNEE
  ? null
  : confirmationAssigneeId.value)
const amountsVisible = computed(() => doc.value?.amounts_visible !== false)
const orderFlowStatus = computed(() => getOrderFlowPresentation(doc.value))
const canCreateDispatchOrder = computed(() => {
  if (!isSalesOrder.value || Number(doc.value?.status) < 2 || Number(doc.value?.status) >= 7) return false
  const operation = doc.value?.commercial_operation
  if (!operation) return true
  return operation.delivery_status === 'ELIGIBLE' && !operation.delivery_note_id
})
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
  if (isSalesOrder.value
    && assignmentSettings.value.require_order_assignee_on_confirmation
    && !doc.value?.assigned_to
    && !effectiveConfirmationAssigneeId.value) {
    useToast().add({ title: 'Falta asignar un responsable', description: 'Seleccioná quién continuará esta Orden de Venta.', color: 'warning' })
    return
  }
  await handleConfirm()
}

async function loadAssignmentContext() {
  if (!isSalesOrder.value) return
  assignmentContextLoading.value = true
  try {
    const [settings, users] = await Promise.all([
      $fetch<typeof assignmentSettings.value>('/api/backend/sales-flow/settings'),
      $fetch<Array<{ id: string, name: string, email: string }>>('/api/access-control/users/all')
    ])
    assignmentSettings.value = {
      prompt_order_assignee_on_confirmation: settings.prompt_order_assignee_on_confirmation ?? true,
      require_order_assignee_on_confirmation: settings.require_order_assignee_on_confirmation ?? false,
      default_order_assignee_id: settings.default_order_assignee_id ?? null
    }
    companyUsers.value = users
    confirmationAssigneeId.value = doc.value?.assigned_to
      || (users.some(user => user.id === settings.default_order_assignee_id) ? settings.default_order_assignee_id : NO_ASSIGNEE)
  } catch (error: any) {
    useToast().add({ title: 'No se pudo cargar la asignación sugerida', description: error?.data?.message, color: 'warning' })
  } finally {
    assignmentContextLoading.value = false
  }
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
    confirm: (id) => store.confirm(id, isSalesOrder.value && !doc.value?.assigned_to
      ? { assigned_to: effectiveConfirmationAssigneeId.value }
      : undefined),
    cancel: (id) => store.cancel(id),
    changeStatus: (id, status) => store.changeStatus(id, status),
    fetchOne: (id) => store.fetchOne(id),
    remove: (id) => store.remove(id),
    accept: (id) => store.accept(id),
    deliver: (id) => store.deliver(id),
  },
})

watch(confirmModalOpen, async (open) => {
  if (open && isSalesOrder.value) {
    await Promise.all([loadStockAvailability(), loadAssignmentContext()])
  }
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
          <UButton v-if="canCreateDispatchOrder" label="Crear Orden de Despacho" icon="i-lucide-clipboard-list" color="primary" variant="outline" size="sm" :loading="creatingDispatch" @click="createDispatchOrder" />
          <UButton v-for="action in primaryActions" :key="action.label" v-bind="action" size="sm" />
          <UDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions">
            <UButton label="Más" icon="i-lucide-ellipsis" variant="ghost" size="sm" trailingIcon="i-lucide-chevron-down" />
          </UDropdownMenu>
          <DocumentHelpPopover :category="category || 'INVOICE'" :actions="[...primaryActions, ...secondaryActions.flat()]" />
        </div>
      </template>
    </AppPageHeader>

      <div class="p-4 space-y-6">
        <DocumentHeader
          :document="doc"
          :loading="loading"
          :status-label="orderFlowStatus?.label"
          :status-color="orderFlowStatus?.color"
          :status-description="orderFlowStatus?.description"
        />
        <DocumentChain v-if="doc" :document="doc" />

        <PresupuestoView v-if="doc && category === 'QUOTE'" :document="doc" />
        <OrdenVentaView v-if="doc && category === 'ORDER'" :document="doc" :show-amounts="amountsVisible" />
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
          :show-amounts="category !== 'REMITO' && amountsVisible"
          :show-warehouse="category === 'REMITO'"
        />
        <DocumentTotals v-if="doc && category !== 'REMITO' && amountsVisible" :document="doc" />
        <UAlert
          v-if="doc && category === 'ORDER' && !amountsVisible"
          color="neutral"
          variant="soft"
          icon="i-lucide-eye-off"
          title="Importes restringidos"
          description="En este estado podés consultar la información operativa de la orden, pero no sus precios, totales ni comisiones."
        />
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
        <div v-if="showAssigneePrompt" class="rounded-xl border border-default bg-muted/30 p-4">
          <div class="mb-3 flex items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning"><UIcon name="i-lucide-user-round-search" class="size-5" /></div>
            <div><p class="font-medium">Esta OV todavía no tiene responsable</p><p class="text-sm text-muted">Si continúa sin asignarla, ninguna persona quedará identificada para seguir su preparación.</p></div>
          </div>
          <UFormField label="Asignar a" :required="assignmentSettings.require_order_assignee_on_confirmation">
            <USelectMenu
              v-model="confirmationAssigneeId"
              :items="assigneeOptions"
              value-key="value"
              label-key="label"
              placeholder="Seleccionar responsable..."
              searchable
              :loading="assignmentContextLoading"
              :disabled="assignmentContextLoading"
              class="w-full"
            />
          </UFormField>
          <p v-if="effectiveConfirmationAssigneeId && effectiveConfirmationAssigneeId === assignmentSettings.default_order_assignee_id" class="mt-2 text-xs text-primary">Responsable predeterminado sugerido por la configuración.</p>
        </div>
        <UAlert
          v-else-if="isSalesOrder && orderHasAssignee"
          color="success"
          variant="subtle"
          icon="i-lucide-user-check"
          title="Orden asignada"
          :description="selectedAssignee ? `${selectedAssignee.name || selectedAssignee.email} continuará esta OV.` : 'La OV ya tiene un responsable asignado.'"
        />
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
          :label="isSalesOrder && !orderHasAssignee && effectiveConfirmationAssigneeId ? 'Asignar y confirmar' : (isSalesOrder && stockAvailability?.summary?.with_shortage ? 'Confirmar OV con faltante' : (isSalesOrder && !orderHasAssignee ? 'Confirmar sin asignar' : 'Confirmar'))"
          color="success"
          :loading="processing || stockAvailabilityLoading"
          :disabled="stockAvailabilityLoading || assignmentContextLoading || stockAvailability?.policy?.blocks_confirmation || (isSalesOrder && assignmentSettings.require_order_assignee_on_confirmation && !orderHasAssignee && !effectiveConfirmationAssigneeId)"
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
