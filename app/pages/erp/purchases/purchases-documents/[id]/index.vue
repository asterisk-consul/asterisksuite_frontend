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
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
import DocumentActionButton from '~/modulos/erp/documents/shared/DocumentActionButton.vue'
import { useDocumentDetailShortcuts } from '~/modulos/erp/documents/composables/useDocumentDetailShortcuts'
import { usePrint } from '~/composables/usePrint'

const documentsPurchasesStore = useDocumentsPurchasesStore()
const companiesStore = useCompaniesStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { mainCollapsed } = useSidebarState()
const { printElement } = usePrint()

const loading = ref(true)
const factura = computed(() => documentsPurchasesStore.current)
const company = computed(() => companiesStore.current)
const category = computed(() => factura.value?.document_types?.category)
const confirmationDocumentLabel = computed(() => category.value === 'CREDIT_NOTE'
  ? 'nota de crédito'
  : category.value === 'DEBIT_NOTE'
    ? 'nota de débito'
    : 'factura')
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
    await Promise.all([
      documentsPurchasesStore.fetchOne(route.params.id as string),
      companyId && companiesStore.fetchOne(companyId),
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
      <UDashboardNavbar :title="factura ? `${factura.document_types?.description} #${factura.number}` : 'Documento'">
        <template #leading>
          <UButton icon="i-lucide-panel-left-close" variant="ghost" color="neutral" @click="() => { mainCollapsed = !mainCollapsed }" />
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
            <DocumentRelatedPayments v-if="category === 'INVOICE'" :key="factura.id" :document-id="factura.id" />
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

  <UModal v-model:open="cancelModalOpen" :title="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category ?? '') ? 'Anular nota de crédito/débito' : 'Anular factura'">
    <template #body>
      <template v-if="['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category ?? '')">
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
