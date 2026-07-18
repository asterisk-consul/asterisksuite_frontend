<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaView from '~/modulos/erp/facturas/components/FacturaView.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { STATUS_LABELS, STATUS_COLORS } from '~/modulos/erp/sales/types/sales.types'
import type { ButtonProps } from '@nuxt/ui'
import { usePrint } from '~/composables/usePrint'

const documentsPurchasesStore = useDocumentsPurchasesStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { mainCollapsed } = useSidebarState()
const { printElement } = usePrint()

const loading = ref(true)
const confirmModalOpen = ref(false)
const cancelModalOpen = ref(false)
const statusModalOpen = ref(false)
const pendingStatus = ref<number>(0)

const factura = computed(() => documentsPurchasesStore.current)

onMounted(async () => {
  try {
    await documentsPurchasesStore.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
})

const statusLabel = computed(() => {
  if (!factura.value) return ''
  return STATUS_LABELS[factura.value.status] ?? `Status ${factura.value.status}`
})

const statusColor = computed(() => {
  if (!factura.value) return 'neutral'
  return STATUS_COLORS[factura.value.status] ?? 'neutral'
})

const isDraft = computed(() => factura.value?.status === 0)
const isPending = computed(() => factura.value?.status === 1)

const links = computed(() => {
  const items: ButtonProps[] = [
    {
      label: 'Imprimir',
      icon: 'i-lucide-printer',
      variant: 'outline',
      onClick: () => printElement('printable-document')
    },
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onClick: () => router.push(`/erp/purchases/purchases-documents/${route.params.id}/edit`)
    }
  ]

  if (isDraft.value) {
    items.push({
      label: 'Cambiar estado',
      icon: 'i-lucide-arrow-right-circle',
      color: 'primary',
      onClick: () => { pendingStatus.value = 1; statusModalOpen.value = true }
    })
  }

  if (isPending.value) {
    items.push({
      label: 'Confirmar',
      icon: 'i-lucide-check-circle',
      color: 'success',
      onClick: () => { confirmModalOpen.value = true }
    })
  }

  if (isDraft.value || isPending.value) {
    items.push({
      label: 'Anular',
      icon: 'i-lucide-x-circle',
      color: 'error',
      onClick: () => { cancelModalOpen.value = true }
    })
  }

  return items
})

const statusOptions = computed(() => {
  const options: { label: string; value: number; color: string }[] = []
  if (isDraft.value) {
    options.push({ label: 'Pendiente', value: 1, color: 'warning' })
    options.push({ label: 'Confirmado', value: 2, color: 'success' })
  }
  return options
})

const handleStatusChange = async () => {
  try {
    await documentsPurchasesStore.update(route.params.id as string, { status: pendingStatus.value })
    const label = STATUS_LABELS[pendingStatus.value] ?? `Status ${pendingStatus.value}`
    toast.add({ title: `Estado cambiado a "${label}"`, color: 'success' })
    statusModalOpen.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al cambiar estado',
      description: e?.data?.message || e?.message,
      color: 'error'
    })
  }
}

const handleConfirm = async () => {
  try {
    await documentsPurchasesStore.confirm(route.params.id as string)
    toast.add({ title: 'Factura confirmada', color: 'success' })
    confirmModalOpen.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al confirmar',
      description: e?.data?.message || e?.message,
      color: 'error'
    })
  }
}

const handleCancel = async () => {
  try {
    await documentsPurchasesStore.cancel(route.params.id as string)
    toast.add({ title: 'Factura anulada', color: 'success' })
    cancelModalOpen.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error al anular',
      description: e?.data?.message || e?.message,
      color: 'error'
    })
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="factura ? `Factura #${factura.number}` : 'Factura'">
        <template #leading>
          <UButton
            icon="i-lucide-panel-left-close"
            variant="ghost"
            color="neutral"
            @click="mainCollapsed = !mainCollapsed"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPage>
        <UPageHeader
          :title="factura ? `Factura #${factura.number}` : ''"
          :description="statusLabel"
          :links="links"
        >
          <template #headline>
            <UBadge
              :label="statusLabel"
              :color="statusColor"
              variant="subtle"
              size="lg"
            />
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

  <!-- STATUS CHANGE MODAL -->
  <UModal v-model:open="statusModalOpen" title="Cambiar estado">
    <template #body>
      <p class="mb-4">Seleccioná el nuevo estado para la factura <strong>#{{ factura?.number }}</strong>:</p>
      <div class="flex flex-col gap-2">
        <UButton
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :color="opt.color as any"
          variant="outline"
          class="justify-start"
          @click="pendingStatus = opt.value; handleStatusChange()"
        />
      </div>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="statusModalOpen = false" />
      </div>
    </template>
  </UModal>

  <!-- CONFIRM MODAL -->
  <UModal v-model:open="confirmModalOpen" title="Confirmar factura">
    <template #body>
      <p>¿Estás seguro de que deseas confirmar la factura <strong>#{{ factura?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Una vez confirmada, no podrá ser editada.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="confirmModalOpen = false" />
        <UButton label="Confirmar" color="success" @click="handleConfirm" />
      </div>
    </template>
  </UModal>

  <!-- CANCEL MODAL -->
  <UModal v-model:open="cancelModalOpen" title="Anular factura">
    <template #body>
      <p>¿Estás seguro de que deseas anular la factura <strong>#{{ factura?.number }}</strong>?</p>
      <p class="text-sm text-muted mt-2">Esta acción no se puede deshacer.</p>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="cancelModalOpen = false" />
        <UButton label="Anular" color="error" @click="handleCancel" />
      </div>
    </template>
  </UModal>
</template>
