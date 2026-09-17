<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import {
  HR_VALE_TYPE_LABELS,
  HR_VALE_TYPE_COLORS,
  HR_VALE_STATUS_LABELS,
  HR_VALE_STATUS_COLORS
} from '~/modulos/erp/hr/types/hr.types'
import CreateValeModal from '~/modulos/erp/hr/components/CreateValeModal.vue'

definePageMeta({ middleware: ['auth'] })

const hrStore = useHrStore()
const vales = computed(() => hrStore.vales)
const loading = computed(() => hrStore.loading)
const toast = useToast()

const filterType = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const showCreateModal = ref(false)
const showCancelModal = ref(false)
const showCommissionModal = ref(false)
const selectedVale = ref<any>(null)
const cancellingVale = ref<any>(null)
const cancelConfirmText = ref('')
const showTreasuryModal = ref(false)
const confirmingVale = ref<any>(null)
const treasuryTargetType = ref<'CASH_BOX' | 'BANK_ACCOUNT'>('CASH_BOX')
const treasuryTargetId = ref('')
const treasuryTargets = ref<any[]>([])

async function loadVales() {
  await hrStore.fetchVales({
    ...(filterType.value ? { type: filterType.value } : {}),
    ...(filterStatus.value ? { status: filterStatus.value } : {})
  })
}

onMounted(() => loadVales())

watch([filterType, filterStatus], () => loadVales())

// =========================
// FILTROS TABLA
// =========================

const filterTypeOptions = [
  { label: 'Sueldo', value: 'SUELDO' },
  { label: 'Adelanto', value: 'ADELANTO' },
  { label: 'Extras', value: 'EXTRAS' },
  { label: 'Retiro', value: 'RETIRO' },
  { label: 'Aporte', value: 'APORTE' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'PrÃ©stamo', value: 'PRESTAMO' }
]

const statusOptions = [
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Confirmado', value: 'CONFIRMED' },
  { label: 'Pagado', value: 'PAID' },
  { label: 'Anulado', value: 'CANCELLED' }
]

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

// =========================
// ACCIONES
// =========================

const availableTreasuryTargets = computed(() => treasuryTargets.value
  .filter(item => item.currency_code === confirmingVale.value?.currency_code && item.active !== false && (treasuryTargetType.value !== 'CASH_BOX' || item.current_session_id))
  .map(item => ({ label: `${item.name}${item.bank_name ? ` Â· ${item.bank_name}` : ' Â· caja abierta'}`, value: item.id })))

async function handleConfirm(id: string) {
  const vale = vales.value.find(v => v.id === id)
  if (vale?.party_type === 'PARTNER') {
    confirmingVale.value = vale
    treasuryTargetType.value = 'CASH_BOX'
    treasuryTargetId.value = ''
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
  if (!confirmingVale.value || !treasuryTargetId.value) return
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
  cancellingVale.value = vales.value.find(v => v.id === id)
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
  } catch (e) {
    toast.add({ title: 'Error al anular vale', color: 'error' })
  }
}

// =========================
// TABLA
// =========================

const columns = [
  { id: 'number', header: 'NÂº' },
  { id: 'person', header: 'Persona' },
  { id: 'type', header: 'Tipo' },
  { id: 'amount', header: 'Monto' },
  { id: 'date', header: 'Fecha' },
  { id: 'status', header: 'Estado' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Vales RRHH" description="Comprobantes internos de empleados y socios">
      <template #links>
        <UButton label="Nuevo vale" icon="i-lucide-plus" @click="showCreateModal = true" />
      </template>
    </AppPageHeader>

    <!-- Filtros -->
    <div class="flex gap-2 flex-wrap py-4">
      <USelect v-model="filterType" :items="filterTypeOptions" placeholder="Tipo" class="w-40" />
      <USelect v-model="filterStatus" :items="statusOptions" placeholder="Estado" class="w-40" />
    </div>

    <!-- Tabla -->
    <UPageCard variant="subtle">
      <UTable :data="vales" :columns="columns" :loading="loading">
        <template #number-cell="{ row }">
          <span class="font-mono font-medium">#{{ row.original.number }}</span>
        </template>

        <template #person-cell="{ row }">
          {{ row.original.party?.name ?? '-' }}
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="HR_VALE_TYPE_LABELS[row.original.type as keyof typeof HR_VALE_TYPE_LABELS] ?? row.original.type"
            :color="HR_VALE_TYPE_COLORS[row.original.type as keyof typeof HR_VALE_TYPE_COLORS] as any ?? 'neutral'"
            variant="subtle"
          />
        </template>

        <template #amount-cell="{ row }">
          <div>
            <span class="font-medium">{{ fmtCurrency(Number(row.original.amount), row.original.currency_code) }}</span>
            <p v-if="row.original.converted_amount" class="text-xs text-muted">
              â‰ˆ {{ fmtCurrency(Number(row.original.converted_amount), row.original.currency_code === 'USD' ? 'ARS' : 'USD') }}
            </p>
          </div>
        </template>

        <template #date-cell="{ row }">
          {{ fmtDate(row.original.date) }}
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :label="HR_VALE_STATUS_LABELS[row.original.status as keyof typeof HR_VALE_STATUS_LABELS]"
            :color="HR_VALE_STATUS_COLORS[row.original.status as keyof typeof HR_VALE_STATUS_COLORS] as any"
            variant="subtle"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              v-if="row.original.type === 'EXTRAS' && row.original.commission_details?.length"
              icon="i-lucide-list"
              variant="ghost"
              color="info"
              size="sm"
              @click="selectedVale = row.original; showCommissionModal = true"
            />
            <UButton
              v-if="row.original.status === 'DRAFT'"
              icon="i-lucide-check"
              variant="ghost"
              color="success"
              size="sm"
              @click="handleConfirm(row.original.id)"
            />
            <UButton
              v-if="row.original.status !== 'CANCELLED'"
              icon="i-lucide-x"
              variant="ghost"
              color="error"
              size="sm"
              @click="handleCancel(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UPageCard>

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
            :title="['RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(confirmingVale?.type) ? 'El dinero saldrÃ¡ de TesorerÃ­a' : 'El dinero ingresarÃ¡ en TesorerÃ­a'"
            :description="`Vale #${confirmingVale?.number ?? ''} Â· ${fmtCurrency(Number(confirmingVale?.amount ?? 0), confirmingVale?.currency_code)}`"
            :color="['RETIRO', 'REEMBOLSO', 'PRESTAMO'].includes(confirmingVale?.type) ? 'error' : 'success'"
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
          <UButton label="Cancelar" variant="ghost" @click="showTreasuryModal = false" />
          <UButton label="Confirmar y registrar" color="success" :loading="loading" :disabled="!treasuryTargetId" @click="confirmPartnerVale" />
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
            <p class="text-sm text-muted mt-1">Esta acciÃ³n no se puede deshacer.</p>
          </div>

          <p class="text-sm text-muted">
            Â¿EstÃ¡s seguro que querÃ©s anular el vale
            <span class="font-medium text-highlighted">#{{ cancellingVale?.number }}</span>
            de <span class="font-medium text-highlighted">{{ cancellingVale?.party?.name }}</span>
            por <span class="font-medium text-highlighted">{{ fmtCurrency(Number(cancellingVale?.amount ?? 0), cancellingVale?.currency_code) }}</span>?
          </p>

          <p class="text-sm text-muted">
            Para confirmar, escribÃ­
            <span class="font-medium text-highlighted font-mono">anular</span>
            en el campo de abajo.
          </p>

          <UInput v-model="cancelConfirmText" placeholder="anular" />

          <div class="flex justify-end gap-2 pt-3 border-t border-default">
            <UButton label="Cancelar" variant="ghost" color="neutral" @click="showCancelModal = false; cancellingVale = null; cancelConfirmText = ''" />
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
                Vale #{{ selectedVale?.number }} â€” {{ selectedVale?.party?.name }}
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
                  <th class="text-right px-4 py-2 font-medium">ComisiÃ³n %</th>
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
            <UButton label="Cerrar" variant="ghost" color="neutral" @click="showCommissionModal = false; selectedVale = null" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
