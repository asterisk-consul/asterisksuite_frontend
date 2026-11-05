<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import { useDocumentDetailShortcuts } from '~/modulos/erp/documents/composables/useDocumentDetailShortcuts'
import DocumentHeader from '~/modulos/erp/documents/shared/DocumentHeader.vue'
import DocumentActionButton from '~/modulos/erp/documents/shared/DocumentActionButton.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentPrintSelector from '~/components/documents/DocumentPrintSelector.vue'
import PresupuestoView from '~/modulos/erp/documents/presupuesto/PresupuestoView.vue'
import OrdenVentaView from '~/modulos/erp/documents/orden-venta/OrdenVentaView.vue'
import OrderStockAvailability from '~/modulos/erp/documents/orden-venta/OrderStockAvailability.vue'
import RemitoView from '~/modulos/erp/documents/remito/RemitoView.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { useSalesFlowService } from '~/modulos/erp/sales/services/sales-flow.service'
import { useUsersService } from '~/modulos/access-control/services/users.service'
import DocumentHelpPopover from '~/components/shared/DocumentHelpPopover.vue'
import { getOrderFlowPresentation } from '~/modulos/erp/documents/orden-venta/order-flow-status'

const store = useDocumentsSalesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { printElement } = usePrint()
const salesFlowService = useSalesFlowService()
const usersService = useUsersService()

const loading = ref(true)
const creatingDispatch = ref(false)
const stockAvailabilityOpen = ref(false)
const stockAvailabilityLoading = ref(false)
const stockAvailability = ref<any>(null)
const stockWarningShown = ref(false)
const NO_ASSIGNEE = '__NO_ASSIGNEE__'
const assignmentContextLoading = ref(false)
const confirmationAssigneeId = ref<string | undefined>(undefined)
const assignmentSettings = ref({
  prompt_order_assignee_on_confirmation: true,
  require_order_assignee_on_confirmation: false,
  default_order_assignee_id: null as string | null,
  require_order_delivery_address: false,
  warn_when_order_delivery_data_empty: true,
})
const companyUsers = ref<Array<{ id: string, name: string, email: string }>>([])
const emptyDeliveryConfirmOpen = ref(false)
const deliveryWarningAcknowledged = ref(false)
const assigneeOptions = computed(() => [
  ...(assignmentSettings.value.require_order_assignee_on_confirmation || orderHasAssignee.value
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
const category = computed(() => doc.value?.document_types?.category ?? undefined)
const isSalesOrder = computed(() => category.value === 'ORDER' || doc.value?.document_types?.code === 'OV')
const orderHasAssignee = computed(() => !!doc.value?.assigned_to)
const showAssigneePrompt = computed(() => isSalesOrder.value
  && !orderHasAssignee.value
  && (assignmentSettings.value.prompt_order_assignee_on_confirmation
    || assignmentSettings.value.require_order_assignee_on_confirmation))
const effectiveConfirmationAssigneeId = computed(() => confirmationAssigneeId.value === NO_ASSIGNEE
  ? null
  : confirmationAssigneeId.value)
const orderDeliveryDataIsEmpty = computed(() => {
  const delivery = doc.value?.orden_venta_doc
  return ![
    delivery?.delivery_address,
    delivery?.delivery_contact,
    delivery?.delivery_phone,
    delivery?.delivery_time,
    delivery?.delivery_instructions,
    delivery?.transport_provider,
    delivery?.confirmed_delivery_date,
  ].some(value => String(value ?? '').trim() !== '')
})
const requiredOrderDeliveryAddressMissing = computed(() => assignmentSettings.value.require_order_delivery_address
  && !String(doc.value?.orden_venta_doc?.delivery_address ?? '').trim())
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
  if (isSalesOrder.value && requiredOrderDeliveryAddressMissing.value) {
    useToast().add({
      title: 'Falta la dirección de entrega',
      description: 'La configuración exige una dirección para confirmar esta OV. Completala desde Editar.',
      color: 'warning',
    })
    return
  }

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
  if (isSalesOrder.value
    && !assignmentSettings.value.require_order_delivery_address
    && assignmentSettings.value.warn_when_order_delivery_data_empty
    && orderDeliveryDataIsEmpty.value
    && !deliveryWarningAcknowledged.value) {
    confirmModalOpen.value = false
    emptyDeliveryConfirmOpen.value = true
    return
  }
  await handleConfirm()
}

async function loadAssignmentContext() {
  if (!isSalesOrder.value) return
  assignmentContextLoading.value = true
  try {
    const settings = await salesFlowService.getSettings()
    assignmentSettings.value = {
      prompt_order_assignee_on_confirmation: settings.prompt_order_assignee_on_confirmation ?? true,
      require_order_assignee_on_confirmation: settings.require_order_assignee_on_confirmation ?? false,
      default_order_assignee_id: settings.default_order_assignee_id ?? null,
      require_order_delivery_address: settings.require_order_delivery_address ?? false,
      warn_when_order_delivery_data_empty: settings.warn_when_order_delivery_data_empty ?? true,
    }
    const users = await usersService.findAll()
    companyUsers.value = users
    confirmationAssigneeId.value = doc.value?.assigned_to
      || (users.some(user => user.id === settings.default_order_assignee_id) ? settings.default_order_assignee_id ?? NO_ASSIGNEE : NO_ASSIGNEE)
  } catch (error: any) {
    useToast().add({ title: 'No se pudo cargar la asignación sugerida', description: error?.data?.message, color: 'warning' })
  } finally {
    assignmentContextLoading.value = false
  }
}

async function createDispatchOrder() {
  if (creatingDispatch.value || !doc.value) return
  creatingDispatch.value = true
  try {
    const dispatch = await DocumentsSalesService.createDispatch(doc.value.id)
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
  canTrashOrphanNote,
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
    confirm: (id) => {
      const options: { assigned_to?: string | null; confirm_empty_delivery_data?: boolean } = {}
      if (isSalesOrder.value && (showAssigneePrompt.value || orderHasAssignee.value)) {
        options.assigned_to = effectiveConfirmationAssigneeId.value
      }
      if (deliveryWarningAcknowledged.value) options.confirm_empty_delivery_data = true
      return store.confirm(id, Object.keys(options).length ? options : undefined)
    },
    cancel: (id) => store.cancel(id),
    changeStatus: (id, status) => store.changeStatus(id, status),
    fetchOne: (id) => store.fetchOne(id),
    remove: (id) => store.remove(id),
    accept: (id) => store.accept(id),
    deliver: (id) => store.deliver(id),
  },
})

const { shortcutKeys } = useDocumentDetailShortcuts(primaryActions, [
  confirmModalOpen, cancelModalOpen, deleteModalOpen, statusModalOpen,
  acceptModalOpen, deliverModalOpen, stockAvailabilityOpen, emptyDeliveryConfirmOpen,
])

async function editOrderDelivery() {
  emptyDeliveryConfirmOpen.value = false
  confirmModalOpen.value = false
  if (doc.value) await router.push(`/erp/sales/${doc.value.id}/edit`)
}

async function confirmWithoutDeliveryData() {
  if (processing.value) return
  deliveryWarningAcknowledged.value = true
  emptyDeliveryConfirmOpen.value = false
  try {
    await confirmWithAvailability()
  } finally {
    deliveryWarningAcknowledged.value = false
  }
}

watch(confirmModalOpen, async (open) => {
  if (open && isSalesOrder.value && doc.value) {
    // A direct reassignment is saved inside DocumentAssignment. Refresh before
    // opening the selector so confirmation uses the persisted responsible user.
    assignmentContextLoading.value = true
    try {
      await store.fetchOne(doc.value.id)
    } catch {
      useToast().add({ title: 'No se pudo actualizar la Orden de Venta', color: 'warning' })
    } finally {
      assignmentContextLoading.value = false
    }
    await Promise.all([loadStockAvailability(), loadAssignmentContext()])
  }
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      :title="doc ? `${doc.document_types?.description} #${documentNumber}` : 'Documento'"
    >
      <template #footer>
        <div class="space-y-3 pt-3 pb-3">
          <div v-if="doc?.descrip?.trim() || doc?.ref?.trim()" class="flex min-w-0 items-start gap-2 rounded-lg border border-primary/20 border-l-2 border-l-primary bg-primary/5 px-3 py-2">
            <UIcon name="i-lucide-bookmark" class="mt-0.5 size-4 shrink-0 text-primary" />
            <div class="min-w-0">
              <div class="text-xs font-medium uppercase tracking-wide text-muted">Referencia</div>
              <div class="break-words text-sm font-semibold text-highlighted">{{ doc.descrip?.trim() || doc.ref?.trim() }}</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge v-if="invoiceState === 'invoiced'" label="Facturada" color="success" variant="subtle" />
            <UBadge v-else-if="invoiceState === 'partial'" label="Factura parcial" color="warning" variant="subtle" />
            <UButton v-if="isSalesOrder" label="Ver disponibilidad" icon="i-lucide-warehouse" color="neutral" variant="outline" size="sm" :loading="stockAvailabilityLoading" @click="openStockAvailability" />
            <UButton v-if="canCreateDispatchOrder" label="Crear Orden de Despacho" icon="i-lucide-clipboard-list" color="primary" variant="outline" size="sm" :loading="creatingDispatch" @click="createDispatchOrder" />
            <DocumentActionButton
              v-for="action in primaryActions"
              :key="action.label"
              :action="action"
              :shortcut-keys="shortcutKeys(action.label)"
            />
            <ShortcutDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions" />
            <DocumentHelpPopover :category="category || 'INVOICE'" :actions="[...primaryActions, ...secondaryActions.flat()]" />
          </div>
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
          :show-title="false"
          :show-reference="false"
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
          :currency="doc.currency_code ?? undefined"
          :document-subtotal="doc.subtotal"
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
  <UModal v-model:open="confirmModalOpen" title="Confirmar documento" :ui="{ content: 'sm:max-w-4xl' }">
    <template #body>
      <div class="space-y-4">
        <div v-if="showAssigneePrompt || orderHasAssignee" class="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div class="mb-3 flex items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-user-round-search" class="size-5" /></div>
            <div>
              <p class="font-medium">{{ orderHasAssignee ? 'Responsable de la Orden de Venta' : 'Asignar responsable' }}</p>
              <p class="text-sm text-muted">{{ orderHasAssignee ? 'Confirmá quién continuará con la preparación de esta OV.' : 'Elegí quién continuará con la preparación de esta OV.' }}</p>
            </div>
          </div>
          <UFormField label="Responsable" :required="assignmentSettings.require_order_assignee_on_confirmation">
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
        <UAlert
          v-if="isSalesOrder && requiredOrderDeliveryAddressMissing"
          color="error"
          variant="subtle"
          icon="i-lucide-map-pin"
          title="Falta la dirección obligatoria"
          description="Completá la dirección de entrega antes de confirmar esta OV."
        />
      </div>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { confirmModalOpen = false }" />
        <UButton
          v-if="isSalesOrder && requiredOrderDeliveryAddressMissing"
          label="Editar OV"
          icon="i-lucide-pencil"
          variant="outline"
          @click="router.push(`/erp/sales/${doc?.id}/edit`)"
        />
        <UButton
          :label="isSalesOrder && (showAssigneePrompt || orderHasAssignee) && effectiveConfirmationAssigneeId && effectiveConfirmationAssigneeId !== doc?.assigned_to ? 'Asignar y confirmar' : (isSalesOrder && stockAvailability?.summary?.with_shortage ? 'Confirmar OV con faltante' : (isSalesOrder && !orderHasAssignee ? 'Confirmar sin asignar' : 'Confirmar'))"
          color="success"
          :loading="processing || stockAvailabilityLoading"
          :disabled="stockAvailabilityLoading || assignmentContextLoading || stockAvailability?.policy?.blocks_confirmation || (isSalesOrder && requiredOrderDeliveryAddressMissing) || (isSalesOrder && assignmentSettings.require_order_assignee_on_confirmation && !orderHasAssignee && !effectiveConfirmationAssigneeId)"
          @click="confirmWithAvailability"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="emptyDeliveryConfirmOpen"
    title="¿Confirmar la OV sin datos de entrega?"
    description="La sección de entrega está vacía. Confirmá si querés continuar."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="No se cargó información de entrega"
          description="Podés volver a la OV para completar dirección, contacto, teléfono, fecha, horario, transporte e instrucciones, o confirmar igualmente."
        />
        <div class="flex justify-end gap-2">
          <UButton label="Completar datos" variant="ghost" @click="editOrderDelivery" />
          <UButton label="Confirmar igualmente" icon="i-lucide-check" @click="confirmWithoutDeliveryData" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="stockAvailabilityOpen" title="Disponibilidad de la Orden de Venta" description="Stock físico, reservas y mercadería en tránsito para los productos de esta OV." :ui="{ content: 'sm:max-w-5xl' }">
    <template #body>
      <OrderStockAvailability :availability="stockAvailability" :loading="stockAvailabilityLoading" />
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton label="Cerrar" variant="outline" @click="() => { stockAvailabilityOpen = false }" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="cancelModalOpen" title="Anular documento">
    <template #body>
      <p>¿Anular el documento <strong>#{{ doc?.number }}</strong>?</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { cancelModalOpen = false }" />
        <UButton label="Anular" color="error" :loading="processing" @click="handleCancel" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deleteModalOpen" :title="canTrashOrphanNote ? 'Anular y enviar nota a la papelera' : 'Enviar factura a la papelera'">
    <template #body>
      <template v-if="canTrashOrphanNote">
        <p>La nota <strong>#{{ doc?.number }}</strong> se anulará y dejará de aparecer en el circuito habitual.</p>
        <p class="text-sm text-muted mt-2">Su movimiento activo se quitará de la cuenta corriente. El comprobante y su historial quedarán conservados en la papelera y podrán restaurarse.</p>
      </template>
      <template v-else>
        <p>La factura anulada <strong>#{{ doc?.number }}</strong> dejará de aparecer en el circuito habitual.</p>
        <p class="text-sm text-muted mt-2">Se conserva su historial y podrá restaurarse desde la papelera.</p>
      </template>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { deleteModalOpen = false }" />
        <UButton :label="canTrashOrphanNote ? 'Anular y enviar a papelera' : 'Enviar a papelera'" color="error" :loading="processing" @click="handleRemove" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="statusModalOpen" title="Cambiar estado">
    <template #body>
      <div class="space-y-2">
        <UButton v-for="t in validTransitions" :key="t.status" :label="t.label" :color="t.color" variant="outline" class="w-full justify-start" :loading="processing" @click="handleStatus(t.status)" />
      </div>
      <div class="flex justify-end pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { statusModalOpen = false }" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="acceptModalOpen" title="Aceptar presupuesto">
    <template #body>
      <p>¿Aceptar y crear Orden de Venta?</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { acceptModalOpen = false }" />
        <UButton label="Aceptar y crear OV" color="success" :loading="processing" @click="handleAccept" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deliverModalOpen" title="Crear remito desde la orden">
    <template #body>
      <p>Se copiarán el cliente y todos los productos pendientes de esta Orden de Venta.</p>
      <p class="text-sm text-muted mt-2">El remito se creará en borrador para que puedas revisarlo antes de confirmarlo.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { deliverModalOpen = false }" />
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
