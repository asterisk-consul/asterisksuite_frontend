<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { currentAccountEntryColumns, ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import type {
  CurrentAccount,
  CreateCurrentAccountEntryInput
} from '~/modulos/erp/current-accounts/types/current-accounts.types'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { statement, entries: storeEntries, loading, fetchStatement, fetchEntries, addEntry } = useCurrentAccounts()

const partyId = route.params.partyId as string
const currencyCode = (route.query.currency as string) || 'ARS'

const account = ref<CurrentAccount | null>(null)
const sorting = ref<SortingState>([])
const modalOpen = ref(false)
const saving = ref(false)

const form = reactive<CreateCurrentAccountEntryInput>({
  party_id: partyId,
  party_type: 'customer',
  currency_code: currencyCode,
  type: 'PAYMENT',
  amount: 0,
  description: ''
})

const entries = computed(() => {
  const fromStatement = statement.value?.entries ?? []
  const fromStore = storeEntries.value ?? []
  const list = fromStatement.length > 0 ? fromStatement : fromStore
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const balance = computed(() => Number(statement.value?.balance ?? 0))

const totalDebit = computed(() =>
  entries.value
    .filter((e) => ENTRY_TYPE_CONFIG[e.type]?.side === 'debit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const totalCredit = computed(() =>
  entries.value
    .filter((e) => ENTRY_TYPE_CONFIG[e.type]?.side === 'credit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

onMounted(async () => {
  try {
    await Promise.all([fetchStatement(partyId, currencyCode), fetchEntries(partyId, currencyCode)])
    if (statement.value?.account) {
      account.value = statement.value.account
      form.party_type = account.value.party_type
    }
  } catch (e: any) {
    toast.add({ title: 'Error al cargar cuenta', color: 'error', icon: 'i-lucide-alert-circle' })
    router.push('/erp/treasury/current-accounts')
  }
})

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = currentAccountEntryColumns({ onSortFieldSelect })

const filterFields: FilterField[] = [
  { id: 'type', label: 'Filtrar por tipo...', class: 'w-40' },
  { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'date' },
  { label: 'Tipo', value: 'type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Saldo', value: 'balance_after' }
]

const formatCurrency = (amount: number | string | null | undefined, currency?: string) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || currencyCode,
    maximumFractionDigits: 2
  }).format(num)
}

const balanceColor = computed(() => {
  if (balance.value > 0) return 'text-success'
  if (balance.value < 0) return 'text-error'
  return 'text-muted'
})

const balanceLabel = computed(() => {
  if (!account.value) return ''
  if (balance.value > 0) return account.value.party_type === 'CUSTOMER' ? 'Nos deben' : 'Debemos'
  if (balance.value < 0) return account.value.party_type === 'CUSTOMER' ? 'Debemos' : 'Nos deben'
  return 'Saldo 0'
})

const partyTypeLabel = computed(() => (account.value?.party_type === 'CUSTOMER' ? 'Cliente' : 'Proveedor'))

const openCreateEntry = () => {
  Object.assign(form, {
    party_id: partyId,
    party_type: account.value?.party_type ?? 'customer',
    currency_code: currencyCode,
    type: 'PAYMENT',
    amount: 0,
    description: ''
  })
  modalOpen.value = true
}

const handleCreateEntry = async () => {
  saving.value = true
  try {
    await addEntry({ ...form })
    toast.add({ title: 'Movimiento creado', color: 'success' })
    modalOpen.value = false
    await fetchStatement(partyId, currencyCode)
  } catch (e: any) {
    toast.add({
      title: 'Error al crear movimiento',
      description: e?.data?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

const balanceChartData = computed(() => {
  const sorted = [...entries.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${p.axisValue}<br/>Saldo: ${formatCurrency(p.value)}`
      }
    },
    grid: { left: 60, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: sorted.map((e) => e.date.split('T')[0]),
      axisLabel: { fontSize: 10, rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: (v: number) => formatCurrency(v) }
    },
    series: [
      {
        type: 'line',
        data: sorted.map((e) => Number(e.balance_after)),
        smooth: true,
        lineStyle: { width: 2, color: balance.value >= 0 ? '#22c55e' : '#ef4444' },
        areaStyle: { color: balance.value >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' },
        itemStyle: { color: balance.value >= 0 ? '#22c55e' : '#ef4444' }
      }
    ]
  }
})

const entryTypeSummary = computed(() => {
  const map = new Map<string, { count: number; total: number; side: string }>()
  for (const e of entries.value) {
    const config = ENTRY_TYPE_CONFIG[e.type]
    const label = config?.label ?? e.type
    const side = config?.side ?? 'debit'
    const existing = map.get(label) || { count: 0, total: 0, side }
    existing.count++
    existing.total += Number(e.amount) || 0
    map.set(label, existing)
  }
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
})

const entryTypePieData = computed(() => {
  const colors = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: entryTypeSummary.value.map((d, i) => ({
          value: d.total,
          name: d.name,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }
    ]
  }
})

const entryTypes = [
  { label: 'Pago', value: 'PAYMENT' },
  { label: 'Cobro', value: 'COLLECTION' },
  { label: 'Anticipo', value: 'ADVANCE' },
  { label: 'Préstamo', value: 'LOAN' },
  { label: 'Pago préstamo', value: 'LOAN_PAYMENT' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
  { label: 'Transferencia', value: 'TRANSFER' },
  { label: 'Cheque emitido', value: 'CHECK_ISSUED' },
  { label: 'Cheque recibido', value: 'CHECK_RECEIVED' },
  { label: 'Factura', value: 'INVOICE' },
  { label: 'Nota de crédito', value: 'CREDIT_NOTE' },
  { label: 'Nota de débito', value: 'DEBIT_NOTE' }
]

const goBack = () => {
  router.push('/erp/treasury/current-accounts')
}
const closeModal = () => {
  modalOpen.value = false
}

const links = computed(() => [
  {
    label: 'Volver',
    icon: 'i-lucide-arrow-left',
    variant: 'ghost' as const,
    onClick: goBack
  },
  {
    label: 'Nuevo movimiento',
    icon: 'i-heroicons-plus',
    color: 'primary' as const,
    variant: 'solid' as const,
    onClick: openCreateEntry
  }
])

const selectedType = computed({
  get: () => entryTypes.find((t) => t.value === form.type) ?? entryTypes[0],
  set: (val) => {
    form.type = (val?.value as any) ?? 'PAYMENT'
  }
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      :title="account?.party?.name ?? 'Cuenta corriente'"
      :description="`${partyTypeLabel} · ${currencyCode}`"
      :links="links"
    />

    <!-- BALANCE SUMMARY -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 py-4">
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Saldo actual</p>
          <p class="text-2xl font-bold mt-1" :class="balanceColor">
            {{ formatCurrency(balance) }}
          </p>
          <p class="text-xs text-muted mt-1">{{ balanceLabel }}</p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total débitos</p>
          <p class="text-xl font-bold mt-1 text-error">{{ formatCurrency(totalDebit) }}</p>
          <p class="text-xs text-muted mt-1">Pagos y salidas</p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Total créditos</p>
          <p class="text-xl font-bold mt-1 text-success">{{ formatCurrency(totalCredit) }}</p>
          <p class="text-xs text-muted mt-1">Cobros y entradas</p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="text-center">
          <p class="text-xs text-muted font-medium uppercase">Movimientos</p>
          <p class="text-xl font-bold mt-1">{{ entries.length }}</p>
          <p class="text-xs text-muted mt-1">Transacciones totales</p>
        </div>
      </UPageCard>
    </div>

    <!-- CHARTS -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
      <!-- BALANCE EVOLUTION -->
      <UPageCard variant="subtle" class="lg:col-span-2">
        <template #header>
          <h3 class="text-sm font-semibold">Evolución del saldo</h3>
        </template>
        <div v-if="entries.length === 0" class="text-center py-8 text-muted text-sm">
          No hay movimientos para graficar
        </div>
        <ClientOnly v-else>
          <VChart :option="balanceChartData" :style="{ height: '280px', width: '100%' }" autoresize />
        </ClientOnly>
      </UPageCard>

      <!-- ENTRY TYPE DISTRIBUTION -->
      <UPageCard variant="subtle">
        <template #header>
          <h3 class="text-sm font-semibold">Por tipo de movimiento</h3>
        </template>
        <div v-if="entryTypeSummary.length === 0" class="text-center py-8 text-muted text-sm">No hay datos</div>
        <ClientOnly v-else>
          <VChart :option="entryTypePieData" :style="{ height: '280px', width: '100%' }" autoresize />
        </ClientOnly>
      </UPageCard>
    </div>

    <!-- TYPE SUMMARY TABLE -->
    <UPageCard variant="subtle" class="mb-4">
      <template #header>
        <h3 class="text-sm font-semibold">Resumen por tipo</h3>
      </template>
      <div v-if="entryTypeSummary.length === 0" class="text-center py-6 text-muted text-sm">No hay movimientos</div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-4">
        <div v-for="item in entryTypeSummary" :key="item.name" class="p-3 rounded-lg border border-default">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">{{ item.name }}</span>
            <UBadge
              :label="item.side === 'credit' ? 'Haber' : 'Debe'"
              :color="item.side === 'credit' ? 'success' : 'error'"
              variant="soft"
              size="xs"
            />
          </div>
          <p class="text-sm font-semibold mt-1" :class="item.side === 'credit' ? 'text-success' : 'text-error'">
            {{ formatCurrency(item.total) }}
          </p>
          <p class="text-xs text-muted">{{ item.count }} movimientos</p>
        </div>
      </div>
    </UPageCard>

    <!-- ENTRIES TABLE -->
    <UPageCard variant="subtle">
      <template #header>
        <h3 class="text-sm font-semibold">Detalle de movimientos</h3>
      </template>
      <div class="overflow-x-auto">
        <LogisticaTable
          :loading="loading"
          :data="entries"
          :columns="columns"
          :filter-fields="filterFields"
          :sort-fields="sortFields"
          v-model:sorting="sorting"
        />
      </div>
    </UPageCard>

    <!-- CREATE ENTRY MODAL -->
    <UModal v-model:open="modalOpen" title="Nuevo movimiento">
      <template #body>
        <UForm :state="form" class="space-y-4" @submit="handleCreateEntry">
          <UFormField label="Tipo" name="type" required>
            <USelectMenu v-model="selectedType" :items="entryTypes" />
          </UFormField>
          <UFormField label="Monto" name="amount" required>
            <UInput v-model.number="form.amount" type="number" />
          </UFormField>
          <UFormField label="Descripción" name="description">
            <UInput v-model="form.description" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="closeModal" />
            <UButton label="Crear" type="submit" :loading="saving" />
          </div>
        </UForm>
      </template>
    </UModal>
  </UPage>
</template>
