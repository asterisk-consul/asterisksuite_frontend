<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { ButtonProps } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { usePayments } from '~/modulos/erp/payments/composables/usePayments'
import { useDataTransferPermissions } from '~/modulos/access-control/composables/useDataTransferPermissions'
import { paymentColumns } from '~/modulos/erp/payments/columns'
import type { Payment } from '~/modulos/erp/payments/types/payments.types'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'

import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'

const { payments, loading, init, confirm: confirmPayment, markAsPaid, reject, reverse, remove } = usePayments()
const authStore = useAuthStore()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const toast = useToast()
const { canImport, canExport } = useDataTransferPermissions()
const allowImport = computed(() => canImport('treasury.payments.import'))
const allowExport = computed(() => canExport('treasury.payments.export'))
const showCreator = computed(() => {
  const role = authStore.selectedCompany?.role
  return role === 'OWNER' || role === 'ADMIN'
})
const can = (permission: string) => authStore.selectedCompany?.role === 'OWNER' || hasPermission(permission)
const canCreatePayment = computed(() => can('payments.create'))

const router = useRouter()
const sorting = ref<SortingState>([])
const importOpen = ref(false)

// Modals
const actionModalOpen = ref(false)
const actionType = ref<'confirm' | 'pay' | 'reject' | 'reverse' | 'delete'>('confirm')
const actionPayment = ref<Payment | null>(null)
const partnerValeDetailOpen = ref(false)
const partnerValeDetail = ref<Payment | null>(null)
const checkAction = ref<'RETURN_TO_PORTFOLIO' | 'CANCEL'>('RETURN_TO_PORTFOLIO')

const actionLabels: Record<string, { title: string; button: string; color: string; description: string }> = {
  confirm: { title: 'Confirmar pago', button: 'Confirmar', color: 'info', description: 'Se aplicarán los efectos: documentos, caja/banco y cuenta corriente.' },
  pay: { title: 'Marcar como pagado', button: 'Marcar pagado', color: 'success', description: 'El pago pasará a estado Pagado.' },
  reject: { title: 'Rechazar pago', button: 'Rechazar', color: 'warning', description: 'Se revertirán todos los efectos (documentos, caja/banco, cuenta corriente).' },
  reverse: { title: 'Anular pago', button: 'Anular', color: 'error', description: 'Se revertirán todos los efectos y el pago quedará anulado.' },
  delete: { title: 'Enviar pago a la papelera', button: 'Enviar a papelera', color: 'error', description: 'El registro dejará de verse, pero conservará sus relaciones y podrá restaurarse.' }
}

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const openDetail = (row: Payment) => {
  if (row.source_kind === 'PARTNER_VALE') {
    partnerValeDetail.value = row
    partnerValeDetailOpen.value = true
    return
  }
  router.push(`/erp/treasury/payments/${row.id}`)
}

const openAction = (type: typeof actionType.value, payment: Payment) => {
  actionType.value = type
  actionPayment.value = payment
  checkAction.value = 'RETURN_TO_PORTFOLIO'
  actionModalOpen.value = true
}

const handleAction = async () => {
  if (!actionPayment.value) return

  try {
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
        await reverse(actionPayment.value.id, actionPayment.value.payment_method === 'CHECK' ? checkAction.value : undefined)
        break
      case 'delete':
        await remove(actionPayment.value.id)
        break
    }

    actionModalOpen.value = false

    toast.add({
      title: actionLabels[actionType.value]?.title ?? 'Acción completada',
      color: actionType.value === 'delete' ? 'warning' : 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

onMounted(() => {
  void init()
  void fetchMyPermissionsIfNeeded(authStore.selectedCompany?.id, authStore.user?.id).catch(() => undefined)
  window.addEventListener('keydown', handleCreatePaymentShortcut)
})

onBeforeUnmount(() => window.removeEventListener('keydown', handleCreatePaymentShortcut))

const modeFilter = ref<'ALL' | 'NORMAL' | 'ADVANCE'>('ALL')
const showCancelled = ref(false)

const filteredPayments = computed(() => {
  let rows = payments.value
  if (!showCancelled.value) rows = rows.filter(payment => !['CANCELLED', 'REVERSED'].includes(payment.status))
  if (modeFilter.value !== 'ALL') rows = rows.filter(payment => payment.payment_mode === modeFilter.value)
  return rows
})

const columns = computed(() => paymentColumns({
  onDetail: openDetail,
  onSortFieldSelect,
  showCreator: showCreator.value,
  onConfirm: can('payments.confirm') ? (row) => openAction('confirm', row) : undefined,
  onMarkAsPaid: can('payments.mark_as_paid') ? (row) => openAction('pay', row) : undefined,
  onReject: can('payments.reject') ? (row) => openAction('reject', row) : undefined,
  onReverse: can('payments.reverse') ? (row) => openAction('reverse', row) : undefined,
  onDelete: can('payments.delete') ? (row) => openAction('delete', row) : undefined
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

function goToCreatePayment() {
  return router.push('/erp/treasury/payments/create')
}

function handleCreatePaymentShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.repeat || !canCreatePayment.value) return
  const target = event.target
  const isTyping = target instanceof HTMLElement && (
    target.isContentEditable
    || Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
  )
  if (event.key.toLowerCase() !== 'n' || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTyping) return

  event.preventDefault()
  event.stopPropagation()
  void goToCreatePayment()
}

const filterFields: FilterField[] = [
  { id: 'number', label: 'Filtrar por N°...', class: 'w-32' },
  { id: 'party_name', label: 'Filtrar por tercero...', class: 'w-48' },
  { id: 'document_reference', label: 'Filtrar por documento o concepto...', class: 'w-64' }
]

const sortFields: SortField[] = [
  { label: 'N°', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Tercero', value: 'party_name' },
  { label: 'Documento / concepto', value: 'document_reference' },
  { label: 'Método', value: 'payment_method' },
  { label: 'Monto', value: 'amount' },
  { label: 'Cuenta', value: 'account' },
  { label: 'Estado', value: 'status' },
  { label: 'Fecha Creación', value: 'created_at' }
]

const handleExport = (format: string) => {
  window.open(`/api/backend/payments/export?format=${format}`, '_blank')
}

const handleDownloadTemplate = () => {
  window.open('/api/backend/payments/export/template', '_blank')
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

const dataActions = computed(() => [
  ...(allowExport.value ? [
    { label: 'Exportar Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: () => handleExport('xlsx') },
    { label: 'Exportar CSV', icon: 'i-lucide-file-text', onSelect: () => handleExport('csv') }
  ] : []),
  ...(allowImport.value ? [
    { label: 'Descargar plantilla', icon: 'i-lucide-file-down', onSelect: handleDownloadTemplate },
    { label: 'Importar datos', icon: 'i-lucide-upload', onSelect: () => { importOpen.value = true } }
  ] : [])
])
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Pagos y Cobros"
      description="Gestión de pagos realizados y cobros recibidos"
    >
      <template #links>
        <UFieldGroup v-if="dataActions.length">
          <UButton color="neutral" variant="subtle" label="Exportar" icon="i-lucide-download" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
        <UButton
          v-if="canCreatePayment"
          label="Nuevo pago/cobro"
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          aria-keyshortcuts="Alt+N"
          title="Nuevo pago/cobro (Alt + N)"
          @click="goToCreatePayment"
        >
          <template #trailing>
            <KeyboardShortcutHint :keys="['Alt', 'N']" size="2xs" />
          </template>
        </UButton>
      </template>
    </AppPageHeader>

    <!-- FILTRO DE MODO -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted">Filtrar:</span>
      <UButton
        label="Todos"
        size="xs"
        :color="modeFilter === 'ALL' ? 'primary' : 'neutral'"
        :variant="modeFilter === 'ALL' ? 'solid' : 'ghost'"
        @click="modeFilter = 'ALL'"
      />
      <UButton
        label="Normales"
        size="xs"
        :color="modeFilter === 'NORMAL' ? 'primary' : 'neutral'"
        :variant="modeFilter === 'NORMAL' ? 'solid' : 'ghost'"
        @click="modeFilter = 'NORMAL'"
      />
      <UButton
        label="Anticipos"
        size="xs"
        :color="modeFilter === 'ADVANCE' ? 'warning' : 'neutral'"
        :variant="modeFilter === 'ADVANCE' ? 'solid' : 'ghost'"
        @click="modeFilter = 'ADVANCE'"
      />
      <div class="ml-auto flex items-center gap-3 rounded-lg border border-default px-3 py-1.5">
        <span class="text-sm text-muted">Mostrar anulados</span>
        <USwitch v-model="showCancelled" />
      </div>
    </div>

    <AsteriskTable
      :loading="loading"
      :data="filteredPayments"
      :columns="columns"
      :on-row-click="openDetail"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      storage-key="treasury-payments"
      v-model:sorting="sorting"
    />

    <UModal v-model:open="partnerValeDetailOpen" title="Movimiento de vale de socio">
      <template #body>
        <div v-if="partnerValeDetail" class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-muted/20 p-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-muted">Vale de socio</p>
              <p class="mt-1 text-lg font-semibold">N° {{ partnerValeDetail.number }} · {{ partnerValeDetail.party?.name }}</p>
            </div>
            <UBadge
              :label="partnerValeDetail.status === 'CANCELLED' ? 'Anulado' : partnerValeDetail.type === 'PAYMENT' ? 'Pago' : 'Cobro'"
              :color="partnerValeDetail.status === 'CANCELLED' ? 'error' : partnerValeDetail.type === 'PAYMENT' ? 'error' : 'success'"
              variant="subtle"
            />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="text-sm text-muted">Fecha</p>
              <p class="font-medium">{{ new Date(partnerValeDetail.date).toLocaleDateString('es-AR') }}</p>
            </div>
            <div>
              <p class="text-sm text-muted">Medio</p>
              <p class="font-medium">{{ partnerValeDetail.payment_method === 'CASH' ? 'Caja' : 'Cuenta bancaria' }}</p>
            </div>
            <div>
              <p class="text-sm text-muted">Cuenta de origen</p>
              <p class="font-medium">{{ partnerValeDetail.cash_box?.name ?? partnerValeDetail.bank_account?.name ?? '—' }}</p>
            </div>
            <div>
              <p class="text-sm text-muted">Importe</p>
              <p class="font-semibold">{{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: partnerValeDetail.currency_code || 'ARS', maximumFractionDigits: 2 }).format(Number(partnerValeDetail.amount) || 0) }}</p>
            </div>
          </div>
          <UAlert
            v-if="partnerValeDetail.status === 'CANCELLED'"
            color="warning"
            variant="subtle"
            icon="i-lucide-undo-2"
            title="Vale anulado"
            description="El movimiento original se conserva para trazabilidad y su efecto en Tesorería fue revertido."
          />
          <p v-if="partnerValeDetail.description" class="rounded-lg border border-default p-3 text-sm text-muted">
            {{ partnerValeDetail.description }}
          </p>
        </div>
      </template>
    </UModal>

    <!-- GENERIC ACTION MODAL -->
    <UModal v-model:open="actionModalOpen" :title="actionLabels[actionType]?.title">
      <template #body>
        <p>{{ actionLabels[actionType]?.description }}</p>
        <p class="mt-2">Pago N° <strong>{{ actionPayment?.number }}</strong></p>
        <div v-if="actionType === 'reverse' && actionPayment?.payment_method === 'CHECK'" class="mt-4 space-y-2">
          <p class="text-sm font-medium">¿Qué debe ocurrir con el cheque?</p>
          <URadioGroup
            v-model="checkAction"
            :items="[
              { label: 'Devolverlo a cartera', description: 'El cheque vuelve a quedar pendiente y disponible para utilizarse.', value: 'RETURN_TO_PORTFOLIO' },
              { label: 'Cancelar también el cheque', description: 'El cheque queda cancelado y no podrá volver a utilizarse.', value: 'CANCEL' }
            ]"
            variant="card"
          />
        </div>
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
      v-if="allowImport"
      v-model:open="importOpen"
      title="Importar Pagos y Cobros"
      description="Selecciona un archivo Excel con los pagos a importar"
      :columns="importColumns"
      endpoint="/api/backend/payments/import"
      @success="init"
    />
  </UPage>
</template>
