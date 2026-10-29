<script setup lang="ts">
import { UButton } from '#components'
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import {
  HR_VALE_TYPE_LABELS,
  HR_VALE_TYPE_COLORS,
  HR_VALE_STATUS_LABELS,
  HR_VALE_STATUS_COLORS
} from '~/modulos/erp/hr/types/hr.types'
import type { HrVale } from '~/modulos/erp/hr/types/hr.types'
import CreateValeModal from '~/modulos/erp/hr/components/CreateValeModal.vue'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import { createTableBuilder } from '~/composables/table/createColumns'
import { useRrhhTotals } from '~/modulos/erp/rrhh/composables/useRrhhTotals'
import RrhhTotalsCards from '~/components/rrhh/RrhhTotalsCards.vue'

definePageMeta({ middleware: ['auth'] })

const hrStore = useHrStore()
const vales = computed(() => hrStore.vales)
const loading = computed(() => hrStore.loading)
const toast = useToast()
const router = useRouter()

// Rango de fechas (vacío = sin límite)
const dateFrom = ref('')
const dateTo = ref('')

const showCreateModal = ref(false)
const showCancelModal = ref(false)
const showCommissionModal = ref(false)
const selectedVale = ref<HrVale | null>(null)
const cancellingVale = ref<HrVale | null>(null)
const cancelConfirmText = ref('')
const showTreasuryModal = ref(false)
const confirmingVale = ref<HrVale | null>(null)
const treasuryTargetType = ref<'CASH_BOX' | 'BANK_ACCOUNT'>('CASH_BOX')
const treasuryTargetId = ref('')
const treasuryTargets = ref<any[]>([])
const confirmingFunds = ref<{ available: number; balance: number } | null>(null)
const confirmingWithdrawalBlocked = computed(() => confirmingVale.value?.type === 'RETIRO' && (!confirmingFunds.value || Number(confirmingVale.value.amount) > confirmingFunds.value.available))

async function loadVales() {
  await hrStore.fetchVales()
}

onMounted(() => loadVales())

// =========================
// FILTRO POR PERÍODO + TOTALES
// =========================

const filteredVales = computed(() =>
  vales.value.filter((v) => {
    const d = v.date?.split('T')[0] ?? v.date
    if (dateFrom.value && d < dateFrom.value) return false
    if (dateTo.value && d > dateTo.value) return false
    return true
  })
)

const totals = useRrhhTotals(() => filteredVales.value)

// =========================
// HELPERS
// =========================

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtCurrency(n: number, currencyCode: string = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(n ?? 0)
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '-'
}

const OUTFLOW_TYPES = ['RETIRO', 'REEMBOLSO', 'PRESTAMO']

function isOutflowVale(vale: HrVale | null) {
  return !!vale && OUTFLOW_TYPES.includes(vale.type)
}

// =========================
// ACCIONES
// =========================

const availableTreasuryTargets = computed(() => treasuryTargets.value
  .filter(item => item.currency_code === confirmingVale.value?.currency_code && item.active !== false && (treasuryTargetType.value !== 'CASH_BOX' || item.current_session_id))
  .map(item => ({ label: `${item.name}${item.bank_name ? ` · ${item.bank_name}` : ' · caja abierta'}`, value: item.id })))

async function handleConfirm(id: string) {
  const vale = vales.value.find(v => v.id === id)
  if (vale?.party_type === 'PARTNER' && !['SUELDO', 'ADELANTO', 'EXTRAS', 'COMISION'].includes(vale.type)) {
    confirmingVale.value = vale
    treasuryTargetType.value = 'CASH_BOX'
    treasuryTargetId.value = ''
    confirmingFunds.value = null
    if (vale.type === 'RETIRO') {
      try {
        confirmingFunds.value = await $fetch(`/api/backend/hr/partners/${vale.party_id}/funds`, { query: { currency_code: vale.currency_code } })
      } catch (e: any) {
        toast.add({ title: 'No se pudo consultar el disponible del socio', description: e?.data?.message, color: 'error' })
        return
      }
    }
    treasuryTargets.value = await $fetch<any[]>('/api/backend/cash-boxes')
    showTreasuryModal.value = true
    return
  }
  try {
    await hrStore.confirmVale(id)
    await loadVales()
    toast.add({ title: 'Vale confirmado', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Error al confirmar vale', color: 'error' })
  }
}

async function confirmPartnerVale() {
  if (!confirmingVale.value || !treasuryTargetId.value || confirmingWithdrawalBlocked.value) return
  try {
    await hrStore.confirmVale(confirmingVale.value.id, {
      treasury_target_type: treasuryTargetType.value,
      treasury_target_id: treasuryTargetId.value
    })
    showTreasuryModal.value = false
    await loadVales()
    toast.add({ title: 'Vale confirmado y movimiento registrado', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Error al confirmar vale', description: e?.data?.message || e?.message, color: 'error' })
  }
}

watch(treasuryTargetType, async type => {
  treasuryTargetId.value = ''
  if (!showTreasuryModal.value) return
  treasuryTargets.value = type === 'CASH_BOX'
    ? await $fetch<any[]>('/api/backend/cash-boxes')
    : await $fetch<any[]>('/api/backend/bank-accounts')
})

function handleCancel(id: string) {
  cancellingVale.value = vales.value.find(v => v.id === id) ?? null
  cancelConfirmText.value = ''
  showCancelModal.value = true
}

async function confirmCancel() {
  if (!cancellingVale.value || cancelConfirmText.value !== 'anular') return
  try {
    await hrStore.cancelVale(cancellingVale.value.id)
    showCancelModal.value = false
    cancellingVale.value = null
    cancelConfirmText.value = ''
    await loadVales()
    toast.add({ title: 'Vale anulado', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Error al anular vale', description: e?.data?.message || e?.message, color: 'error' })
  }
}

function openCommissionDetails(vale: HrVale) {
  selectedVale.value = vale
  showCommissionModal.value = true
}

function closeCancelModal() {
  showCancelModal.value = false
  cancellingVale.value = null
  cancelConfirmText.value = ''
}

function closeCommissionModal() {
  showCommissionModal.value = false
  selectedVale.value = null
}

function closeTreasuryModal() {
  showTreasuryModal.value = false
}

function openCreateModal() {
  showCreateModal.value = true
}

function payVale(vale: HrVale) {
  const documentId = vale.payment_document?.id
  if (!documentId) return
  router.push({
    path: '/erp/treasury/payments/create',
    query: { party_id: vale.party_id, document_id: documentId, type: 'PAYMENT' }
  })
}

// =========================
// TABLA
// =========================

const build = createTableBuilder<HrVale>({ locale: 'es-AR' })

const typeFilterOptions = Object.entries(HR_VALE_TYPE_LABELS).map(([value, label]) => ({ label: value === 'SUELDO' ? 'Sueldo / remuneración' : label, value }))
const statusFilterOptions = Object.entries(HR_VALE_STATUS_LABELS).map(([value, label]) => ({ label, value }))

const columns = build([
  {
    key: 'number',
    label: 'Nº',
    sortable: true,
    meta: { filter: { type: 'number', operators: ['equals'] } }
  },
  {
    id: 'person',
    label: 'Persona',
    accessorFn: (vale) => vale.party?.name ?? '-',
    meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
    cell: ({ row }) => {
      const vale = row.original
      const partyType = vale.party_type === 'PARTNER' ? 'Socio' : 'Empleado'
      return h('div', { class: 'min-w-36' }, [
        h('div', { class: 'font-medium' }, vale.party?.name ?? '-'),
        h('div', { class: 'text-xs text-muted' }, [partyType, vale.party?.tax_id ? ` · CUIT ${vale.party.tax_id}` : ''].join(''))
      ])
    }
  },
  {
    key: 'description',
    label: 'Descripción',
    accessorFn: (vale) => vale.description ?? '',
    meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
    cell: ({ row }) => h('div', {
      class: 'max-w-72 whitespace-normal text-sm text-muted line-clamp-2',
      title: row.original.description ?? undefined
    }, row.original.description || 'Sin descripción')
  },
  {
    id: 'treasury_target',
    label: 'Caja / banco',
    accessorFn: (vale) => vale.treasury_target?.label ?? '',
    meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
    cell: ({ row }) => {
      const vale = row.original
      const targetLabel = vale.treasury_target?.label
        ?? (vale.payment_document ? 'Pago en Tesorería' : vale.party_type !== 'PARTNER' ? 'Sin movimiento directo' : vale.status === 'DRAFT' ? 'Al confirmar' : 'Sin movimiento asociado')
      return h('span', {
        class: vale.treasury_target ? 'text-sm' : 'text-sm text-muted'
      }, targetLabel)
    }
  },
  {
    key: 'created_by_name',
    label: 'Registrado por',
    accessorFn: (vale) => vale.created_by_name ?? '',
    meta: { filter: { type: 'text', operators: ['contains', 'equals', 'startsWith'] } },
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.original.created_by_name || '—')
  },
  {
    key: 'type',
    label: 'Tipo',
    badge: {
      resolve: (vale) => ({
        label: vale.party_type === 'PARTNER'
          ? ({ SUELDO: 'Remuneración por trabajo', APORTE: 'Aporte de fondos', RETIRO: 'Retiro de aportes', PRESTAMO: 'Préstamo al socio' } as Record<string, string>)[vale.type] ?? HR_VALE_TYPE_LABELS[vale.type] ?? vale.type
          : HR_VALE_TYPE_LABELS[vale.type] ?? vale.type,
        color: HR_VALE_TYPE_COLORS[vale.type] as any
      })
    },
    meta: {
      filter: {
        type: 'select',
        operators: ['equals'],
        options: typeFilterOptions
      }
    }
  },
  {
    key: 'amount',
    label: 'Monto',
    sortable: true,
    accessorFn: (vale) => Number(vale.amount),
    meta: { filter: { type: 'number', operators: ['equals', 'gt', 'lt'] } },
    cell: ({ row }) => {
      const vale = row.original
      return h('div', {}, [
        h('span', { class: 'font-medium' }, fmtCurrency(Number(vale.amount), vale.currency_code)),
        vale.converted_amount
          ? h('p', { class: 'text-xs text-muted' },
              `≈ ${fmtCurrency(Number(vale.converted_amount), vale.currency_code === 'USD' ? 'ARS' : 'USD')}`)
          : null
      ])
    }
  },
  {
    key: 'date',
    label: 'Fecha',
    sortable: true,
    date: true
  },
  {
    key: 'status',
    label: 'Estado',
    badge: {
      resolve: (vale) => ({
        label: HR_VALE_STATUS_LABELS[vale.status] ?? vale.status,
        color: HR_VALE_STATUS_COLORS[vale.status] as any
      })
    },
    meta: {
      filter: {
        type: 'select',
        operators: ['equals'],
        options: statusFilterOptions
      }
    }
  },
  {
    id: 'actions',
    label: '',
    header: '',
    meta: { filter: false },
    cell: ({ row }) => {
      const vale = row.original
      return h('div', { class: 'flex gap-1' }, [
        vale.commission_details?.length
          ? h(UButton, {
              icon: 'i-lucide-list',
              variant: 'ghost',
              color: 'info',
              size: 'sm',
              onClick: () => openCommissionDetails(vale)
            })
          : null,
        vale.status === 'DRAFT'
          ? h(UButton, {
              icon: 'i-lucide-check',
              variant: 'ghost',
              color: 'success',
              size: 'sm',
              onClick: () => handleConfirm(vale.id)
            })
          : null,
        ['CONFIRMED', 'PAID'].includes(vale.status) && (vale.payment_document?.pending ?? 0) > 0.01
          ? h(UButton, {
              label: 'Pagar',
              icon: 'i-lucide-wallet-cards',
              variant: 'soft',
              color: 'success',
              size: 'xs',
              onClick: () => payVale(vale)
            })
          : null,
        vale.status !== 'CANCELLED'
          ? h(UButton, {
              icon: 'i-lucide-x',
              variant: 'ghost',
              color: 'error',
              size: 'sm',
              onClick: () => handleCancel(vale.id)
            })
          : null
      ])
    }
  }
])

const filterFields = [
  { id: 'number', label: 'Buscar por Nº...' },
  { id: 'person', label: 'Buscar por persona...' }
]

const sortFields = [
  { label: 'Nº', value: 'number' },
  { label: 'Monto', value: 'amount' },
  { label: 'Fecha', value: 'date' }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Vales RRHH" description="Comprobantes internos de empleados y socios">
      <template #links>
        <UButton label="Nuevo vale" icon="i-lucide-plus" @click="openCreateModal" />
      </template>
    </AppPageHeader>

    <!-- Filtros de período + totales -->
    <div class="space-y-4 py-2">
      <div class="flex gap-3 flex-wrap items-end">
        <div class="space-y-1">
          <label class="text-xs text-muted">Desde</label>
          <UInput v-model="dateFrom" type="date" clearable />
        </div>
        <div class="space-y-1">
          <label class="text-xs text-muted">Hasta</label>
          <UInput v-model="dateTo" type="date" clearable />
        </div>
      </div>
      <RrhhTotalsCards
        :total-debit="totals.totalDebit.value"
        :total-credit="totals.totalCredit.value"
      />
    </div>

    <!-- Tabla -->
    <AsteriskTable
      :data="filteredVales"
      :columns="columns"
      :loading="loading"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      storage-key="rrhh-vales"
      search-placeholder="Buscar vale..."
    />

    <!-- ========================= -->
    <!-- MODAL CREAR VALE          -->
    <!-- ========================= -->
    <CreateValeModal
      v-model:open="showCreateModal"
      @success="loadVales"
    />

    <UModal v-model:open="showTreasuryModal" title="Confirmar movimiento del socio">
      <template #body>
        <div class="space-y-4">
          <UAlert
            :title="isOutflowVale(confirmingVale) ? 'El dinero saldrá de Tesorería' : 'El dinero ingresará en Tesorería'"
            :description="`Vale #${confirmingVale?.number ?? ''} · ${fmtCurrency(Number(confirmingVale?.amount ?? 0), confirmingVale?.currency_code)}`"
            :color="isOutflowVale(confirmingVale) ? 'error' : 'success'"
            variant="subtle"
          />
          <UAlert
            v-if="confirmingVale?.type === 'RETIRO' && confirmingFunds"
            :title="`Aportes disponibles: ${fmtCurrency(confirmingFunds.available, confirmingVale.currency_code)}`"
            :description="confirmingWithdrawalBlocked ? 'Este retiro supera los aportes disponibles y no se puede confirmar.' : `Saldo después del retiro: ${fmtCurrency(confirmingFunds.balance - Number(confirmingVale.amount), confirmingVale.currency_code)}`"
            :color="confirmingWithdrawalBlocked ? 'error' : 'info'"
            variant="subtle"
          />
          <UFormField label="Medio" required>
            <USelect v-model="treasuryTargetType" :items="[{ label: 'Caja', value: 'CASH_BOX' }, { label: 'Cuenta bancaria', value: 'BANK_ACCOUNT' }]" />
          </UFormField>
          <UFormField :label="treasuryTargetType === 'CASH_BOX' ? 'Caja' : 'Cuenta bancaria'" required>
            <USelect v-model="treasuryTargetId" :items="availableTreasuryTargets" :placeholder="availableTreasuryTargets.length ? 'Seleccionar...' : `No hay opciones disponibles en ${confirmingVale?.currency_code}`" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="closeTreasuryModal" />
          <UButton label="Confirmar y registrar" color="success" :loading="loading" :disabled="!treasuryTargetId || confirmingWithdrawalBlocked" @click="confirmPartnerVale" />
        </div>
      </template>
    </UModal>

    <!-- ========================= -->
    <!-- MODAL ANULAR VALE         -->
    <!-- ========================= -->
    <UModal v-model:open="showCancelModal">
      <template #content>
        <div class="p-6 space-y-4">
          <div>
            <h2 class="text-lg font-semibold">Anular vale</h2>
            <p class="text-sm text-muted mt-1">El vale quedará marcado como anulado y conservará su historial.</p>
          </div>

          <UAlert
            v-if="cancellingVale?.party_type === 'PARTNER' && ['APORTE', 'RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(cancellingVale.type) && ['PAID', 'CONFIRMED'].includes(cancellingVale.status)"
            title="Se revertirá el movimiento del socio"
            description="Se registrará un movimiento inverso en la misma caja o cuenta bancaria usada al confirmarlo y se ajustarán los saldos del socio. El movimiento original quedará visible en Tesorería para conservar la trazabilidad."
            color="warning"
            variant="subtle"
          />

          <p class="text-sm text-muted">
            ¿Estás seguro que querés anular el vale
            <span class="font-medium text-highlighted">#{{ cancellingVale?.number }}</span>
            de <span class="font-medium text-highlighted">{{ cancellingVale?.party?.name }}</span>
            por <span class="font-medium text-highlighted">{{ fmtCurrency(Number(cancellingVale?.amount ?? 0), cancellingVale?.currency_code) }}</span>?
          </p>

          <p class="text-sm text-muted">
            Para confirmar, escribí
            <span class="font-medium text-highlighted font-mono">anular</span>
            en el campo de abajo.
          </p>

          <UInput v-model="cancelConfirmText" placeholder="anular" />

          <div class="flex justify-end gap-2 pt-3 border-t border-default">
            <UButton label="Cancelar" variant="ghost" color="neutral" @click="closeCancelModal" />
            <UButton
              label="Anular"
              color="error"
              :loading="loading"
              :disabled="cancelConfirmText !== 'anular'"
              @click="confirmCancel"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ========================= -->
    <!-- MODAL DETALLE COMISIONES  -->
    <!-- ========================= -->
    <UModal v-model:open="showCommissionModal" :ui="{ content: 'max-w-3xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">Detalle de comisiones</h2>
              <p class="text-sm text-muted mt-1">
                Vale #{{ selectedVale?.number }} — {{ selectedVale?.party?.name }}
              </p>
            </div>
            <UBadge
              :label="`${selectedVale?.commission_details?.length ?? 0} OV`"
              color="primary"
              variant="subtle"
            />
          </div>

          <div v-if="selectedVale?.commission_details?.length" class="border border-default rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-muted/30">
                  <th class="text-left px-4 py-2 font-medium">OV #</th>
                  <th class="text-left px-4 py-2 font-medium">Fecha</th>
                  <th class="text-right px-4 py-2 font-medium">Subtotal</th>
                  <th class="text-right px-4 py-2 font-medium">Comisión %</th>
                  <th class="text-right px-4 py-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detail in selectedVale.commission_details" :key="detail.id" class="border-t border-default">
                  <td class="px-4 py-2 font-mono">OV-{{ String(detail.document?.number ?? 0).padStart(8, '0') }}</td>
                  <td class="px-4 py-2">{{ fmtDate(detail.date) }}</td>
                  <td class="px-4 py-2 text-right">{{ fmt(Number(detail.subtotal)) }}</td>
                  <td class="px-4 py-2 text-right">{{ detail.commission_rate }}%</td>
                  <td class="px-4 py-2 text-right font-semibold">{{ fmt(Number(detail.commission_amount)) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-muted/20 font-semibold">
                  <td colspan="3" class="px-4 py-2">Total</td>
                  <td class="px-4 py-2 text-right"></td>
                  <td class="px-4 py-2 text-right text-primary">{{ fmt(Number(selectedVale?.amount ?? 0)) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-else class="text-center py-8 text-muted">
            Este vale no tiene detalles de comisiones.
          </div>

          <div class="flex justify-end pt-3 border-t border-default">
            <UButton label="Cerrar" variant="ghost" color="neutral" @click="closeCommissionModal" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
