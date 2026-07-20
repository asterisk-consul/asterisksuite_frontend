<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { ButtonProps } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import { paymentColumns } from '~/modulos/erp/payments/columns'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'
import { useAuthStore } from '~/modulos/auth/auth.store'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'

const { payments, loading, init, confirm: confirmPayment, markAsPaid, reject, reverse, remove } = usePayments()
const authStore = useAuthStore()
const showCreator = computed(() => {
  const role = authStore.selectedCompany?.role
  return role === 'OWNER' || role === 'ADMIN'
})

const router = useRouter()
const sorting = ref<SortingState>([])
const importOpen = ref(false)

// Modals
const actionModalOpen = ref(false)
const actionType = ref<'confirm' | 'pay' | 'reject' | 'reverse' | 'delete'>('confirm')
const actionPayment = ref<Payment | null>(null)

const actionLabels: Record<string, { title: string; button: string; color: string; description: string }> = {
  confirm: { title: 'Confirmar pago', button: 'Confirmar', color: 'info', description: 'Se aplicarán los efectos: documentos, caja/banco y cuenta corriente.' },
  pay: { title: 'Marcar como pagado', button: 'Marcar pagado', color: 'success', description: 'El pago pasará a estado Pagado.' },
  reject: { title: 'Rechazar pago', button: 'Rechazar', color: 'warning', description: 'Se revertirán todos los efectos (documentos, caja/banco, cuenta corriente).' },
  reverse: { title: 'Anular pago', button: 'Anular', color: 'error', description: 'Se revertirán todos los efectos y el pago quedará anulado.' },
  delete: { title: 'Eliminar pago', button: 'Eliminar', color: 'error', description: 'Se eliminará permanentemente el registro.' }
}

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const openDetail = (row: Payment) => {
  router.push(`/erp/treasury/payments/${row.id}`)
}

const openAction = (type: typeof actionType.value, payment: Payment) => {
  actionType.value = type
  actionPayment.value = payment
  actionModalOpen.value = true
}

const handleAction = async () => {
  if (!actionPayment.value) return

  switch (actionType.value) {
    case 'confirm':
      await confirmPayment(actionPayment.value.id)
      break
    case 'pay':
      await markAsPaid(actionPayment.value.id)
      break
    case 'reject':
      await reject(actionPayment.value.id)
      break
    case 'reverse':
      await reverse(actionPayment.value.id)
      break
    case 'delete':
      await remove(actionPayment.value.id)
      break
  }

  actionModalOpen.value = false
}

onMounted(() => init())

const columns = computed(() => paymentColumns({
  onDetail: openDetail,
  onSortFieldSelect,
  showCreator: showCreator.value,
  onConfirm: (row) => openAction('confirm', row),
  onMarkAsPaid: (row) => openAction('pay', row),
  onReject: (row) => openAction('reject', row),
  onReverse: (row) => openAction('reverse', row),
  onDelete: (row) => openAction('delete', row)
}))

const links: ButtonProps[] = [
  {
    label: 'Nuevo pago/cobro',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: () => router.push('/erp/treasury/payments/create')
  }
]

const filterFields: FilterField[] = [
  { id: 'number', label: 'Filtrar por N°...', class: 'w-32' },
  { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Método', value: 'payment_method' },
  { label: 'Monto', value: 'amount' },
  { label: 'Estado', value: 'status' },
  { label: 'Fecha Creación', value: 'created_at' }
]

const handleExport = (format: string) => {
  window.open(`/api/erp/payments/export?format=${format}`, '_blank')
}

const handleDownloadTemplate = () => {
  window.open('/api/erp/payments/export/template', '_blank')
}

const importColumns = [
  { key: 'fecha', label: 'fecha', required: true },
  { key: 'tipo', label: 'tipo', required: true },
  { key: 'tercero_nombre', label: 'tercero_nombre', required: false },
  { key: 'tercero_cuit', label: 'tercero_cuit', required: false },
  { key: 'metodo', label: 'metodo', required: true },
  { key: 'monto', label: 'monto', required: true },
  { key: 'moneda', label: 'moneda', required: false },
  { key: 'descripcion', label: 'descripcion', required: false }
]

const dataActions = [
  { label: 'Exportar Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: () => handleExport('xlsx') },
  { label: 'Exportar CSV', icon: 'i-lucide-file-text', onSelect: () => handleExport('csv') },
  { label: 'Descargar plantilla', icon: 'i-lucide-file-down', onSelect: handleDownloadTemplate },
  { label: 'Importar datos', icon: 'i-lucide-upload', onSelect: () => { importOpen.value = true } }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Pagos y Cobros"
      description="Gestión de pagos realizados y cobros recibidos"
    >
      <template #links>
        <UFieldGroup>
          <UButton color="neutral" variant="subtle" label="Exportar" icon="i-lucide-download" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
        <UButton
          label="Nuevo pago/cobro"
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          @click="router.push('/erp/treasury/payments/create')"
        />
      </template>
    </AppPageHeader>

    <LogisticaTable
      :loading="loading"
      :data="payments"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />

    <!-- GENERIC ACTION MODAL -->
    <UModal v-model:open="actionModalOpen" :title="actionLabels[actionType]?.title">
      <template #body>
        <p>{{ actionLabels[actionType]?.description }}</p>
        <p class="mt-2">Pago N° <strong>{{ actionPayment?.number }}</strong></p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="actionModalOpen = false" />
          <UButton
            :label="actionLabels[actionType]?.button"
            :color="(actionLabels[actionType]?.color as any)"
            @click="handleAction"
          />
        </div>
      </template>
    </UModal>

    <ExcelImportDialog
      v-model:open="importOpen"
      title="Importar Pagos y Cobros"
      description="Selecciona un archivo Excel con los pagos a importar"
      :columns="importColumns"
      endpoint="/api/erp/payments/import"
      @success="init"
    />
  </UPage>
</template>
