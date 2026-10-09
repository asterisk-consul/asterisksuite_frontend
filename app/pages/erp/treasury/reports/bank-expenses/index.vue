<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useTreasuryReportsService } from '~/modulos/erp/treasury-reports/service/treasury-reports.service'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCompanyRole } from '~/composables/useCompanyRole'

const service = useTreasuryReportsService()
const { selectItems: bankAccountItems, init: initBankAccounts } = useBankAccounts()
const { isOwnerOrAdmin } = useCompanyRole()

const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<any>(null)

const filters = reactive({
  date_from: '',
  date_to: '',
  account_id: '',
  concept_type: '',
  nature: '',
  source: ''
})

const conceptTypeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Comisión', value: 'COMMISSION' },
  { label: 'Impuesto', value: 'TAX' },
  { label: 'Retención', value: 'RETENTION' },
  { label: 'Gasto', value: 'EXPENSE' },
  { label: 'Interés', value: 'INTEREST' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
  { label: 'Otro', value: 'OTHER' }
]
const natureOptions = [
  { label: 'Todas', value: '' },
  { label: 'Débito', value: 'DEBIT' },
  { label: 'Crédito', value: 'CREDIT' }
]
const sourceOptions = [
  { label: 'Todos', value: '' },
  { label: 'Manual', value: 'manual' },
  { label: 'Pago/Cobro', value: 'payment' },
  { label: 'Liquidación tarjeta', value: 'credit_card_settlement' }
]

const fmt = (amount: number | string, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0)
const fmtDate = (date: string) =>
  new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))

const summary = computed(() => data.value?.summary ?? {
  total_expenses: 0, commissions: 0, taxes: 0, iva: 0, retentions: 0,
  total_collections: 0, expense_ratio: 0, count: 0
})

const monthlyData = computed(() => data.value?.monthly ?? [])
const maxMonthly = computed(() => Math.max(1, ...monthlyData.value.map((m: any) => Number(m.total) || 0)))

async function load() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, any> = {}
    for (const [k, v] of Object.entries(filters)) if (v) params[k] = v
    data.value = await service.bankExpenses(params)
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al cargar el reporte'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await initBankAccounts()
  await load()
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Gastos bancarios"
      description="Comisiones, impuestos, retenciones, intereses y ajustes por cuenta bancaria"
    />

    <UAlert v-if="error" icon="i-lucide-alert-triangle" color="error" variant="subtle" :title="error" />

    <!-- FILTROS -->
    <UPageCard variant="subtle">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" /></UFormField>
        <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" /></UFormField>
        <UFormField label="Cuenta">
          <USelectMenu v-model="filters.account_id" :items="[{ label: 'Todas', value: '' }, ...bankAccountItems]" value-key="value" />
        </UFormField>
        <UFormField label="Categoría">
          <USelectMenu v-model="filters.concept_type" :items="conceptTypeOptions" value-key="value" />
        </UFormField>
        <UFormField label="Naturaleza">
          <USelectMenu v-model="filters.nature" :items="natureOptions" value-key="value" />
        </UFormField>
        <UButton label="Aplicar" icon="i-lucide-search" :loading="loading" @click="load" />
      </div>
    </UPageCard>

    <!-- INDICADORES -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Total gastos</p>
        <p class="text-2xl font-bold mt-1 text-error">{{ fmt(summary.total_expenses) }}</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Comisiones</p>
        <p class="text-2xl font-bold mt-1">{{ fmt(summary.commissions) }}</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Impuestos</p>
        <p class="text-2xl font-bold mt-1">{{ fmt(summary.taxes) }}</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">IVA</p>
        <p class="text-2xl font-bold mt-1">{{ fmt(summary.iva) }}</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Retenciones</p>
        <p class="text-2xl font-bold mt-1 text-warning">{{ fmt(summary.retentions) }}</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Cobros del período</p>
        <p class="text-2xl font-bold mt-1 text-success">{{ fmt(summary.total_collections) }}</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Gastos / cobros</p>
        <p class="text-2xl font-bold mt-1">{{ (Number(summary.expense_ratio) || 0).toFixed(2) }}%</p>
      </UPageCard>
      <UPageCard variant="subtle">
        <p class="text-xs text-muted font-medium uppercase">Movimientos</p>
        <p class="text-2xl font-bold mt-1">{{ summary.count }}</p>
      </UPageCard>
    </div>

    <!-- EVOLUCIÓN MENSUAL -->
    <UPageCard variant="subtle">
      <template #header><h3 class="text-sm font-semibold">Evolución mensual</h3></template>
      <div v-if="!monthlyData.length" class="text-center py-8 text-muted text-sm">Sin datos</div>
      <div v-else class="space-y-2">
        <div v-for="m in monthlyData" :key="m.month" class="flex items-center gap-3">
          <span class="text-xs w-16 text-muted">{{ m.month }}</span>
          <div class="flex-1 bg-elevated rounded h-4 overflow-hidden">
            <div class="h-full bg-primary" :style="{ width: `${(Number(m.total) / maxMonthly) * 100}%` }" />
          </div>
          <span class="text-xs w-28 text-right">{{ fmt(m.total) }}</span>
        </div>
      </div>
    </UPageCard>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- POR CONCEPTO -->
      <UPageCard variant="subtle">
        <template #header><h3 class="text-sm font-semibold">Por concepto</h3></template>
        <div v-if="!data?.by_concept?.length" class="text-center py-6 text-muted text-sm">Sin datos</div>
        <div v-else class="space-y-2">
          <div v-for="c in data.by_concept" :key="c.code" class="flex justify-between text-sm">
            <span><span class="font-mono text-xs text-muted">{{ c.code }}</span> {{ c.concept }}</span>
            <span class="font-medium">{{ fmt(c.total) }}</span>
          </div>
        </div>
      </UPageCard>

      <!-- POR CATEGORÍA -->
      <UPageCard variant="subtle">
        <template #header><h3 class="text-sm font-semibold">Por categoría</h3></template>
        <div v-if="!data?.by_category?.length" class="text-center py-6 text-muted text-sm">Sin datos</div>
        <div v-else class="space-y-2">
          <div v-for="c in data.by_category" :key="c.category" class="flex justify-between text-sm">
            <span>{{ conceptTypeOptions.find(o => o.value === c.category)?.label ?? c.category }}</span>
            <span class="font-medium">{{ fmt(c.total) }}</span>
          </div>
        </div>
      </UPageCard>

      <!-- POR BANCO -->
      <UPageCard variant="subtle">
        <template #header><h3 class="text-sm font-semibold">Por banco</h3></template>
        <div v-if="!data?.by_bank?.length" class="text-center py-6 text-muted text-sm">Sin datos</div>
        <div v-else class="space-y-2">
          <div v-for="b in data.by_bank" :key="b.bank_account_id" class="flex justify-between text-sm">
            <span>{{ b.name }}</span>
            <span class="font-medium">{{ fmt(b.total) }}</span>
          </div>
        </div>
      </UPageCard>
    </div>

    <!-- DETALLE -->
    <UPageCard variant="subtle">
      <template #header><h3 class="text-sm font-semibold">Detalle de movimientos</h3></template>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted border-b border-default">
              <th class="py-2 pr-4">Fecha</th>
              <th class="py-2 pr-4">Concepto</th>
              <th class="py-2 pr-4">Tipo</th>
              <th class="py-2 pr-4">Banco</th>
              <th class="py-2 pr-4 text-right">Base</th>
              <th class="py-2 pr-4 text-right">IVA</th>
              <th class="py-2 pl-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in data?.movements ?? []" :key="m.id" class="border-b border-default/50">
              <td class="py-2 pr-4 whitespace-nowrap">{{ fmtDate(m.date) }}</td>
              <td class="py-2 pr-4">{{ m.concept_name ?? '—' }}</td>
              <td class="py-2 pr-4">
                <UBadge :label="m.type" variant="subtle" size="xs" :color="m.amount < 0 ? 'error' : 'success'" />
              </td>
              <td class="py-2 pr-4">{{ m.bank_account_name ?? '—' }}</td>
              <td class="py-2 pr-4 text-right">{{ m.base_amount != null ? fmt(m.base_amount, m.currency_code) : '—' }}</td>
              <td class="py-2 pr-4 text-right">{{ m.tax_amount != null ? fmt(m.tax_amount, m.currency_code) : '—' }}</td>
              <td class="py-2 pl-4 text-right font-medium" :class="m.amount < 0 ? 'text-error' : 'text-success'">
                {{ fmt(m.amount, m.currency_code) }}
              </td>
            </tr>
            <tr v-if="!data?.movements?.length">
              <td colspan="7" class="text-center py-8 text-muted">Sin movimientos para los filtros seleccionados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>
  </UPage>
</template>
