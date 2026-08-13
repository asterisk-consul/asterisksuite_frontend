<script setup lang="ts">
import type { DateRange } from '~/components/compras/FiltroDateCompras.vue'
import DateRangePicker from '~/components/compras/FiltroDateCompras.vue'
import { useExcelExport } from '~/composables/useExcelExport'

definePageMeta({ middleware: ['auth'] })

const { exportToExcel } = useExcelExport()
const loading = ref(false)
const accounts = ref<any[]>([])
const movements = ref<any[]>([])

const dateRange = ref<DateRange>({
  start: new Date(new Date().getFullYear(), 0, 1),
  end: new Date()
})

const fetchData = async () => {
  loading.value = true
  try {
    const [accountsData, movementsData] = await Promise.all([
      $fetch<any[]>('/api/contabilidad/accounts'),
      $fetch<any[]>('/api/erp/treasury/movements', {
        query: {
          date_from: dateRange.value.start.toISOString().split('T')[0],
          date_to: dateRange.value.end.toISOString().split('T')[0]
        }
      })
    ])
    accounts.value = accountsData
    movements.value = movementsData
  } catch (e: any) {
    console.error('Error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

const formatCurrency = (amount: number | string | null | undefined) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 2
  }).format(num)
}

// Calculate account totals from movements
const accountTotals = computed(() => {
  const totals = new Map<string, number>()
  for (const mov of movements.value) {
    const accountId = mov.account_id || mov.current_account_id
    if (accountId) {
      const current = totals.get(accountId) || 0
      totals.set(accountId, current + (Number(mov.amount) || 0))
    }
  }
  return totals
})

// Get total for a specific account code prefix
const getTotalByCodePrefix = (prefix: string) => {
  let total = 0
  for (const acc of accounts.value) {
    if (acc.code.startsWith(prefix)) {
      total += accountTotals.value.get(acc.id) || 0
    }
  }
  return total
}

// Balance General
const activos = computed(() => getTotalByCodePrefix('1'))
const pasivos = computed(() => getTotalByCodePrefix('2'))
const patrimonio = computed(() => getTotalByCodePrefix('3'))

// Estado de Resultados
const ingresos = computed(() => getTotalByCodePrefix('4'))
const costos = computed(() => getTotalByCodePrefix('5'))
const gastos = computed(() => getTotalByCodePrefix('6'))
const resultadoNeto = computed(() => ingresos.value - costos.value - gastos.value)

// IVA
const ivaDebito = computed(() => {
  let total = 0
  for (const mov of movements.value) {
    if (mov.type === 'INVOICE' || mov.type === 'DEBIT_NOTE') {
      total += Number(mov.total_taxes) || 0
    }
  }
  return total
})

const ivaCredito = computed(() => {
  let total = 0
  for (const mov of movements.value) {
    if (mov.type === 'COLLECTION' || mov.type === 'CREDIT_NOTE') {
      total += Number(mov.total_taxes) || 0
    }
  }
  return total
})

const saldoIVA = computed(() => ivaDebito.value - ivaCredito.value)

const handleExportExcel = () => {
  exportToExcel({
    filename: 'informe_contable_consolidado',
    sheetName: 'Resumen',
    columns: [
      { key: 'concept', label: 'Concepto', width: 30 },
      { key: 'amount', label: 'Monto', width: 20 }
    ],
    data: [
      { concept: 'ACTIVOS', amount: activos.value },
      { concept: 'PASIVOS', amount: pasivos.value },
      { concept: 'PATRIMONIO NETO', amount: patrimonio.value },
      { concept: 'INGRESOS', amount: ingresos.value },
      { concept: 'COSTOS', amount: costos.value },
      { concept: 'GASTOS', amount: gastos.value },
      { concept: 'RESULTADO NETO', amount: resultadoNeto.value },
      { concept: 'IVA DÉBITO FISCAL', amount: ivaDebito.value },
      { concept: 'IVA CRÉDITO FISCAL', amount: ivaCredito.value },
      { concept: 'SALDO IVA A PAGAR', amount: saldoIVA.value }
    ]
  })
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Informe Contable Consolidado"
      description="Estado de situación patrimonial y resultados"
    >
      <template #links>
        <UButton label="Exportar" icon="i-lucide-download" variant="outline" @click="handleExportExcel" />
      </template>
    </AppPageHeader>

    <!-- DATE FILTER -->
    <div class="flex items-center gap-3">
      <DateRangePicker v-model="dateRange" />
      <UButton label="Buscar" icon="i-lucide-search" @click="fetchData" :loading="loading" />
    </div>

    <!-- 1. ESTADO DE SITUACIÓN PATRIMONIAL -->
    <div>
      <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-scale" class="size-4 text-primary" />
        Estado de Situación Patrimonial
      </h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- ACTIVOS -->
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-success">Activos</h4>
              <span class="text-lg font-bold text-success">{{ formatCurrency(activos) }}</span>
            </div>
          </template>
          <div class="space-y-2">
            <div v-for="acc in accounts.filter(a => a.code.startsWith('1') && !a.parent_id)" :key="acc.id"
              class="flex items-center justify-between py-1 text-sm">
              <span class="text-muted">{{ acc.name }}</span>
              <span class="font-medium">{{ formatCurrency(accountTotals.get(acc.id) || 0) }}</span>
            </div>
          </div>
        </UPageCard>

        <!-- PASIVOS -->
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-error">Pasivos</h4>
              <span class="text-lg font-bold text-error">{{ formatCurrency(pasivos) }}</span>
            </div>
          </template>
          <div class="space-y-2">
            <div v-for="acc in accounts.filter(a => a.code.startsWith('2') && !a.parent_id)" :key="acc.id"
              class="flex items-center justify-between py-1 text-sm">
              <span class="text-muted">{{ acc.name }}</span>
              <span class="font-medium">{{ formatCurrency(accountTotals.get(acc.id) || 0) }}</span>
            </div>
          </div>
        </UPageCard>

        <!-- PATRIMONIO NETO -->
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-primary">Patrimonio Neto</h4>
              <span class="text-lg font-bold text-primary">{{ formatCurrency(patrimonio) }}</span>
            </div>
          </template>
          <div class="space-y-2">
            <div v-for="acc in accounts.filter(a => a.code.startsWith('3') && !a.parent_id)" :key="acc.id"
              class="flex items-center justify-between py-1 text-sm">
              <span class="text-muted">{{ acc.name }}</span>
              <span class="font-medium">{{ formatCurrency(accountTotals.get(acc.id) || 0) }}</span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-default">
            <div class="flex items-center justify-between text-sm font-semibold">
              <span>Verificación</span>
              <span :class="activos === (pasivos + patrimonio) ? 'text-success' : 'text-error'">
                {{ activos === (pasivos + patrimonio) ? '✅' : '❌' }}
                {{ formatCurrency(activos) }} = {{ formatCurrency(pasivos + patrimonio) }}
              </span>
            </div>
          </div>
        </UPageCard>
      </div>
    </div>

    <!-- 2. ESTADO DE RESULTADOS -->
    <div>
      <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-trending-up" class="size-4 text-info" />
        Estado de Resultados
      </h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- INGRESOS -->
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-success">Ingresos</h4>
              <span class="text-lg font-bold text-success">+{{ formatCurrency(ingresos) }}</span>
            </div>
          </template>
          <div class="space-y-2">
            <div v-for="acc in accounts.filter(a => a.code.startsWith('4') && !a.parent_id)" :key="acc.id"
              class="flex items-center justify-between py-1 text-sm">
              <span class="text-muted">{{ acc.name }}</span>
              <span class="font-medium text-success">+{{ formatCurrency(accountTotals.get(acc.id) || 0) }}</span>
            </div>
          </div>
        </UPageCard>

        <!-- COSTOS -->
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-error">Costos y Gastos</h4>
              <span class="text-lg font-bold text-error">-{{ formatCurrency(costos + gastos) }}</span>
            </div>
          </template>
          <div class="space-y-2">
            <div v-for="acc in accounts.filter(a => (a.code.startsWith('5') || a.code.startsWith('6')) && !a.parent_id)" :key="acc.id"
              class="flex items-center justify-between py-1 text-sm">
              <span class="text-muted">{{ acc.name }}</span>
              <span class="font-medium text-error">-{{ formatCurrency(accountTotals.get(acc.id) || 0) }}</span>
            </div>
          </div>
        </UPageCard>

        <!-- RESULTADO NETO -->
        <UPageCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold">Resultado Neto</h4>
              <span class="text-xl font-bold" :class="resultadoNeto >= 0 ? 'text-success' : 'text-error'">
                {{ resultadoNeto >= 0 ? '+' : '' }}{{ formatCurrency(resultadoNeto) }}
              </span>
            </div>
          </template>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Ingresos</span>
              <span class="text-success">+{{ formatCurrency(ingresos) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Costos</span>
              <span class="text-error">-{{ formatCurrency(costos) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Gastos</span>
              <span class="text-error">-{{ formatCurrency(gastos) }}</span>
            </div>
            <hr class="my-2">
            <div class="flex justify-between font-bold">
              <span>Resultado Neto</span>
              <span :class="resultadoNeto >= 0 ? 'text-success' : 'text-error'">
                {{ resultadoNeto >= 0 ? '+' : '' }}{{ formatCurrency(resultadoNeto) }}
              </span>
            </div>
          </div>
        </UPageCard>
      </div>
    </div>

    <!-- 3. RESUMEN DE IMPUESTOS -->
    <div>
      <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-receipt" class="size-4 text-warning" />
        Resumen de Impuestos
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UPageCard variant="subtle">
          <div class="text-center">
            <p class="text-xs text-muted font-medium uppercase">IVA Débito Fiscal</p>
            <p class="text-xl font-bold text-success">{{ formatCurrency(ivaDebito) }}</p>
            <p class="text-xs text-muted">Lo que cobrás</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="text-center">
            <p class="text-xs text-muted font-medium uppercase">IVA Crédito Fiscal</p>
            <p class="text-xl font-bold text-error">{{ formatCurrency(ivaCredito) }}</p>
            <p class="text-xs text-muted">Lo que pagás</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="text-center">
            <p class="text-xs text-muted font-medium uppercase">Saldo IVA a Pagar</p>
            <p class="text-xl font-bold" :class="saldoIVA >= 0 ? 'text-error' : 'text-success'">
              {{ formatCurrency(saldoIVA) }}
            </p>
            <p class="text-xs text-muted">A depositar en AFIP</p>
          </div>
        </UPageCard>
      </div>
    </div>
  </UPage>
</template>
