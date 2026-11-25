<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaView from '~/modulos/erp/facturas/components/FacturaView.vue'
import DocumentRelatedPayments from '~/modulos/erp/documents/shared/DocumentRelatedPayments.vue'
import DocumentPaymentStatusBadge from '~/modulos/erp/documents/shared/DocumentPaymentStatusBadge.vue'
import DocumentAssignment from '~/modulos/erp/documents/shared/DocumentAssignment.vue'
import DocumentChain from '~/modulos/erp/documents/shared/DocumentChain.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import DocumentActionButton from '~/modulos/erp/documents/shared/DocumentActionButton.vue'
import { useDocumentDetailShortcuts } from '~/modulos/erp/documents/composables/useDocumentDetailShortcuts'
import { getCancelledDocumentStatus } from '~/modulos/erp/documents/types/document-statuses'
import { usePrint } from '~/composables/usePrint'
import { usePaymentsService } from '~/modulos/erp/payments/service/payments.service'

const documentsPurchasesStore = useDocumentsPurchasesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const route = useRoute()
const router = useRouter()
const { printElement } = usePrint()
const paymentsService = usePaymentsService()
const toast = useToast()

const loading = ref(true)
const factura = computed(() => documentsPurchasesStore.current)
const company = computed(() => companiesStore.current)
const category = computed(() => factura.value?.document_types?.category)
const canCreatePayment = computed(() => auth.selectedCompany?.role === 'OWNER' || hasPermission('payments.create'))
const canUpdatePayments = computed(() => auth.selectedCompany?.role === 'OWNER' || hasPermission('payments.update'))
const canApplyOpeningBalanceCredit = computed(() => Boolean(
  category.value === 'OPENING_BALANCE'
  && Number(factura.value?.document_types?.direction) === -1
  && Number(factura.value?.total) < 0
  && Number(factura.value?.status) === 2
  && factura.value?.party_id
  && canCreatePayment.value
  && canUpdatePayments.value,
))
const creatingOpeningBalanceCredit = ref(false)
const confirmationDocumentLabel = computed(() => category.value === 'CREDIT_NOTE'
  ? 'nota de crédito'
  : category.value === 'DEBIT_NOTE'
    ? 'nota de débito'
    : category.value === 'QUOTE'
      ? 'presupuesto'
    : 'factura')
const quoteOperationAssociation = computed(() => factura.value?.international_operation_quotes?.[0] ?? null)
const quoteIsCancelled = computed(() => category.value === 'QUOTE'
  && Number(factura.value?.status) === getCancelledDocumentStatus('QUOTE', -1))
useBreadcrumbEntityLabel(
  computed(() => `/erp/purchases/purchases-documents/${route.params.id as string}`),
  computed(() => formatDocumentBreadcrumbLabel(factura.value))
)

// Custom status flow: Draft(0) → Pending(1) or Confirm(2) or Cancel(3)
const customTransitions = computed(() => {
  if (!factura.value) return []
  if (factura.value.status === 0) {
    return [
      { label: 'Pendiente', status: 1, color: 'warning' as const },
      { label: 'Confirmado', status: 2, color: 'success' as const },
    ]
  }
  return []
})

onMounted(async () => {
  try {
    const companyId = auth.selectedCompany?.id
    void fetchMyPermissionsIfNeeded(companyId, auth.user?.id).catch(() => undefined)
    await Promise.all([
      documentsPurchasesStore.fetchOne(route.params.id as string),
      companyId && companiesStore.fetchOne(companyId),
    ])
  } finally {
    loading.value = false
  }
})

const applyOpeningBalanceCredit = async () => {
  if (!factura.value || creatingOpeningBalanceCredit.value) return
  try {
    creatingOpeningBalanceCredit.value = true
    const payment = await paymentsService.createOpeningBalanceAdvance(factura.value.id)
    toast.add({ title: 'Saldo a favor disponible', description: 'Ya podés aplicarlo a una o varias facturas del mismo proveedor.', color: 'success' })
    await router.push(`/erp/treasury/payments/${payment.id}`)
  } catch (error: any) {
    const message = error?.data?.message ?? error?.response?._data?.message
    toast.add({ title: 'No se pudo habilitar el saldo a favor', description: typeof message === 'string' ? message : 'Revisá que el saldo inicial esté confirmado y siga disponible.', color: 'error' })
  } finally {
    creatingOpeningBalanceCredit.value = false
  }
}

const {
  primaryActions,
  secondaryActions,
  confirmModalOpen,
  cancelModalOpen,
  deleteModalOpen,
  statusModalOpen,
  processing,
  isDraft,
  isConfirmed,
  canTrashCancelledNote,
  handleConfirm,
  handleCancel,
  handleRemove,
  handleStatus,
  validTransitions,
} = useDocumentActions({
  doc: factura as any,
  category,
  router,
  routeId: computed(() => route.params.id as string),
  module: 'purchases',
  printElement,
  customTransitions: customTransitions.value,
  store: {
    confirm: (id) => documentsPurchasesStore.confirm(id),
    cancel: (id) => documentsPurchasesStore.cancel(id),
    changeStatus: (id, status) => documentsPurchasesStore.update(id, { status }),
    fetchOne: (id) => documentsPurchasesStore.fetchOne(id),
    remove: (id) => documentsPurchasesStore.remove(id),
  },
})

const { shortcutKeys } = useDocumentDetailShortcuts(primaryActions, [
  confirmModalOpen, cancelModalOpen, deleteModalOpen, statusModalOpen,
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="factura ? `${factura.document_types?.description} #${factura.number}` : 'Documento'" :toggle="false">
        <template #leading>
          <AppSidebarToggle />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPage>
        <UPageHeader
          :title="factura ? `${factura.document_types?.description} #${factura.number}` : ''"
          :description="factura?.descrip?.trim() ? `Referencia: ${factura.descrip.trim()}` : factura?.ref?.trim() ? `Referencia: ${factura.ref.trim()}` : undefined"
        >
          <template #headline>
            <div class="flex gap-2 items-center flex-wrap">
              <DocumentPaymentStatusBadge v-if="factura" :document="factura" />
              <UButton
                v-if="canApplyOpeningBalanceCredit"
                label="Aplicar saldo a favor"
                icon="i-lucide-hand-coins"
                color="info"
                variant="outline"
                :loading="creatingOpeningBalanceCredit"
                @click="applyOpeningBalanceCredit"
              />
              <DocumentActionButton
                v-for="action in primaryActions"
                :key="action.label"
                :action="action"
                :shortcut-keys="shortcutKeys(action.label)"
              />
              <ShortcutDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions" />
            </div>
          </template>
        </UPageHeader>

        <UPageBody>
          <UAlert
            v-if="category === 'QUOTE' && quoteOperationAssociation"
            class="mb-4"
            color="warning"
            variant="subtle"
            :title="quoteIsCancelled ? 'El presupuesto está anulado y sigue asociado' : 'El presupuesto está asociado a una operación internacional'"
            :description="quoteIsCancelled
              ? `Abrí la operación ${quoteOperationAssociation.operation?.number ?? ''} y desasocialo cuando la OC o factura generada ya esté anulada y desvinculada.`
              : `Para anularlo, abrí la operación ${quoteOperationAssociation.operation?.number ?? ''} y usá «Anular y desasociar presupuesto» después de anular y desasociar la OC o factura generada.`"
          >
            <template #actions>
              <UButton
                :to="`/operaciones-internacionales/${quoteOperationAssociation.operation_id}`"
                label="Abrir operación"
                icon="i-lucide-arrow-up-right"
                color="warning"
                variant="soft"
                size="xs"
              />
            </template>
          </UAlert>
          <UAlert
            v-if="factura && category === 'INVOICE' && Number(factura.status) === 3 && Number(factura._count?.child_documents ?? factura.child_documents?.length ?? 0) > 0"
            class="mb-4"
            color="warning"
            variant="subtle"
            title="La factura conserva comprobantes relacionados"
            description="La factura sigue protegida mientras tenga comprobantes relacionados, incluso si ya están en la papelera. Resolvé cada nota o remito por separado; no se borra la cadena en bloque y los documentos fiscales deben conservarse."
          />
          <DocumentChain v-if="factura" :document="factura" class="mb-4" />
          <div v-if="factura" id="printable-document">
            <DocumentAssignment :key="factura.id" :document-id="factura.id" />
            <FacturaView :document="factura" mode="purchase" />
            <DocumentRelatedPayments
              v-if="category === 'INVOICE' || category === 'OPENING_BALANCE'"
              :key="factura.id"
              :document-id="factura.id"
              :document-label="category === 'OPENING_BALANCE' ? 'este saldo inicial' : 'esta factura'"
              :show-when-empty="category === 'OPENING_BALANCE'"
            />
          </div>
          <UiAttachmentManager
            v-if="factura"
            class="mt-4"
            entity-type="document"
            :entity-id="factura.id"
            :readonly="!isDraft"
          />
          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="statusModalOpen" title="Cambiar estado">
    <template #body>
      <p class="mb-4">Seleccioná el nuevo estado para la factura <strong>#{{ factura?.number }}</strong>:</p>
      <div class="flex flex-col gap-2">
        <UButton v-for="t in validTransitions" :key="t.status" :label="t.label" :color="t.color" variant="outline" class="justify-start" :loading="processing" @click="handleStatus(t.status)" />
      </div>
      <div class="flex justify-end pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { statusModalOpen = false }" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="confirmModalOpen" :title="`Confirmar ${confirmationDocumentLabel}`">
    <template #body>
      <p>¿Estás seguro de que deseas confirmar {{ confirmationDocumentLabel }} <strong>#{{ factura?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Una vez confirmada, no podrá ser editada.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { confirmModalOpen = false }" />
        <UButton label="Confirmar" color="success" :loading="processing" @click="handleConfirm" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="cancelModalOpen" :title="category === 'QUOTE' ? 'Anular presupuesto' : ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category ?? '') ? 'Anular nota de crédito/débito' : 'Anular factura'">
    <template #body>
      <template v-if="category === 'QUOTE'">
        <p>¿Anular el presupuesto <strong>#{{ factura?.number }}</strong>?</p>
        <p class="text-sm text-muted mt-2">La anulación cancela el presupuesto. Si pertenece a una operación internacional, primero tenés que desasociarlo desde esa operación.</p>
      </template>
      <template v-else-if="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category ?? '')">
        <p>¿Anular la nota <strong>#{{ factura?.number }}</strong>?</p>
        <p class="text-sm text-muted mt-2">Una nota confirmada no se edita: si el importe es incorrecto, anulala y creá otra. La anulación revierte su efecto en la cuenta corriente y conserva la relación documental; si tiene pagos activos, primero hay que anularlos.</p>
      </template>
      <template v-else>
        <p>¿Estás seguro de que deseas anular la factura <strong>#{{ factura?.number }}</strong>?</p>
        <p class="text-sm text-muted mt-2">Esta acción no se puede deshacer.</p>
      </template>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { cancelModalOpen = false }" />
        <UButton label="Anular" color="error" :loading="processing" @click="handleCancel" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="deleteModalOpen" :title="canTrashCancelledNote ? 'Enviar nota anulada a la papelera' : 'Enviar factura a la papelera'">
    <template #body>
      <template v-if="canTrashCancelledNote">
        <p>La nota anulada <strong>#{{ factura?.number }}</strong> dejará de aparecer en la cadena activa de la factura.</p>
        <p class="text-sm text-muted mt-2">Se conserva en la papelera y puede restaurarse. La eliminación definitiva solo estará disponible si es una nota manual sin autorización fiscal, pagos ni efectos activos.</p>
      </template>
      <template v-else>
        <p>La factura anulada <strong>#{{ factura?.number }}</strong> dejará de aparecer en el circuito habitual.</p>
        <p class="text-sm text-muted mt-2">Se conserva su historial y podrá restaurarse desde la papelera.</p>
      </template>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="() => { deleteModalOpen = false }" />
        <UButton :label="canTrashCancelledNote ? 'Enviar nota a papelera' : 'Enviar a papelera'" color="error" :loading="processing" @click="handleRemove" />
      </div>
    </template>
  </UModal>
</template>
