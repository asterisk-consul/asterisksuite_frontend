<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaView from '~/modulos/erp/facturas/components/FacturaView.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useDocumentActions } from '~/modulos/erp/documents/composables/useDocumentActions'
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

// Custom status flow: Draft(0) → Pending(1) or Confirm(2) or Cancel(3)
const customTransitions = computed(() => {
  if (!factura.value) return []
  if (factura.value.status === 0) {
    return [
      { label: 'Pendiente', status: 1, color: 'warning' },
      { label: 'Confirmado', status: 2, color: 'success' },
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
  statusModalOpen,
  processing,
  isDraft,
  isConfirmed,
  handleConfirm,
  handleCancel,
  handleStatus,
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
  },
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="factura ? `${factura.document_types?.description} #${factura.number}` : 'Documento'">
        <template #leading>
          <UButton icon="i-lucide-panel-left-close" variant="ghost" color="neutral" @click="mainCollapsed = !mainCollapsed" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPage>
        <UPageHeader :title="factura ? `${factura.document_types?.description} #${factura.number}` : ''">
          <template #headline>
            <div class="flex gap-2 items-center flex-wrap">
              <UButton v-for="action in primaryActions" :key="action.label" v-bind="action" size="sm" />
              <UDropdownMenu v-if="secondaryActions.length > 0" :items="secondaryActions">
                <UButton label="Más" icon="i-lucide-ellipsis" variant="ghost" size="sm" trailingIcon="i-lucide-chevron-down" />
              </UDropdownMenu>
            </div>
          </template>
        </UPageHeader>

        <UPageBody>
          <div v-if="factura" id="printable-document">
            <FacturaView :document="factura" mode="purchase" />
          </div>
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
        <UButton label="Cancelar" variant="ghost" @click="statusModalOpen = false" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="confirmModalOpen" title="Confirmar factura">
    <template #body>
      <p>¿Estás seguro de que deseas confirmar la factura <strong>#{{ factura?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Una vez confirmada, no podrá ser editada.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
        <UButton label="Confirmar" color="success" :loading="processing" @click="handleConfirm" />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="cancelModalOpen" title="Anular factura">
    <template #body>
      <p>¿Estás seguro de que deseas anular la factura <strong>#{{ factura?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Esta acción no se puede deshacer.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="cancelModalOpen = false" />
        <UButton label="Anular" color="error" :loading="processing" @click="handleCancel" />
      </div>
    </template>
  </UModal>
</template>
