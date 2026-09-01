<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useAccountsStore } from '~/modulos/contabilidad/store/accounts.store'

const toast = useToast()
const accountsStore = useAccountsStore()

const dateFrom = ref('')
const dateTo = ref('')
const accountFilter = ref<string | undefined>(undefined)
const typeFilter = ref<'ALL' | 'PAYMENT' | 'COLLECTION'>('ALL')
const loading = ref(false)

interface AccountPayment {
  id: string
  number: number
  date: string
  party_name: string | null
  payment_method: string
  amount: number
  currency_code: string
  converted_amount: number | null
}

interface AccountGroup {
  account_id: string
  code: string
  name: string
  account_type: string
  count: number
  total_base: number
  by_currency: Record<string, number>
  payments: AccountPayment[]
}

const data = ref<{
  accounts: AccountGroup[]
  unassigned: { count: number; total_base: number; payments: AccountPayment[] }
  total_base: number
} | null>(null)

const expanded = ref<Set<string>>(new Set())

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ASSET: { label: 'Activo', color: 'info' },
  LIABILITY: { label: 'Pasivo', color: 'warning' },
  EQUITY: { label: 'Patrimonio', color: 'secondary' },
  REVENUE: { label: 'Ingresos', color: 'success' },
  EXPENSE: { label: 'Gastos', color: 'error' },
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CHECK: 'Cheque',
  BANK_TRANSFER: 'Transferencia',
  CREDIT_CARD: 'Tarjeta crédito',
  DEBIT_CARD: 'Tarjeta débito',
  VIRTUAL_WALLET: 'Billetera virtual',
}

function fmtMoney(amount?: number | null, currency = 'ARS') {
  if (!amount) return '$0'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toggleExpand(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
  } else {
    expanded.value.add(id)
  }
}

async function loadData() {
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value
    if (accountFilter.value) params.account_id = accountFilter.value
    if (typeFilter.value !== 'ALL') params.type = typeFilter.value
    data.value = await $fetch<any>('/api/erp/treasury/expenses-by-account', { params })
  } catch (e: any) {
    toast.add({ title: 'Error al cargar reporte', description: e?.data?.message || e.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loading.value = false
  }
}

const accountOptions = computed(() => [
  { label: 'Todas las cuentas', value: '' },
  ...(accountsStore.items ?? []).map(a => ({ label: `${a.code} - ${a.name}`, value: a.id }))
])

const top5 = computed(() => (data.value?.accounts ?? []).slice(0, 5))

watch([dateFrom, dateTo, accountFilter, typeFilter], () => {
  loadData()
})

onMounted(async () => {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  dateFrom.value = first.toISOString().slice(0, 10)
  dateTo.value = now.toISOString().slice(0, 10)
  accountsStore.fetchAll().catch(() => {})
  await loadData()
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Gastos por Cuenta Contable"
      description="Pagos confirmados agrupados por cuenta contable del plan de cuentas"
    >
      <template #links>
        <UButton label="Volver" icon="i-lucide-arrow-left" variant="ghost" @click="navigateTo('/erp/treasury/reports')" />
      </template>
    </AppPageHeader>

    <!-- Filtros -->
    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="Desde">
        <UInput v-model="dateFrom" type="date" class="w-40" />
      </UFormField>
      <UFormField label="Hasta">
        <UInput v-model="dateTo" type="date" class="w-40" />
      </UFormField>
      <UFormField label="Cuenta contable">
        <USelectMenu
          v-model="accountFilter"
          :items="accountOptions"
          value-key="value"
          placeholder="Todas las cuentas"
          searchable
          clear
          class="w-64"
        />
      </UFormField>
      <UFormField label="Tipo">
        <USelect
          v-model="typeFilter"
          :items="[
            { label: 'Todos', value: 'ALL' },
            { label: 'Pagos', value: 'PAYMENT' },
            { label: 'Cobros', value: 'COLLECTION' }
          ]"
          class="w-32"
        />
      </UFormField>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 rounded-lg bg-muted animate-pulse" />
    </div>

    <template v-else-if="data">
      <!-- Cards resumen -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Total del período</p>
            <p class="text-2xl font-bold text-primary">{{ fmtMoney(data.total_base) }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Cuentas con movimientos</p>
            <p class="text-2xl font-bold">{{ data.accounts.length }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Pagos sin cuenta</p>
            <p class="text-2xl font-bold" :class="data.unassigned.count > 0 ? 'text-warning' : 'text-success'">
              {{ data.unassigned.count }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Total sin cuenta</p>
            <p class="text-2xl font-bold text-warning">{{ fmtMoney(data.unassigned.total_base) }}</p>
          </div>
        </UCard>
      </div>

      <!-- Top 5 -->
      <UCard v-if="top5.length > 0">
        <template #header>
          <h3 class="text-sm font-semibold">Top 5 cuentas por gasto</h3>
        </template>
        <div class="space-y-2">
          <div v-for="acc in top5" :key="acc.account_id" class="flex items-center gap-3">
            <span class="text-xs font-mono text-muted w-14 shrink-0">{{ acc.code }}</span>
            <span class="text-sm flex-1 truncate">{{ acc.name }}</span>
            <div class="w-40 h-2 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full bg-primary rounded-full"
                :style="{ width: `${data && data.total_base > 0 ? (acc.total_base / data.total_base) * 100 : 0}%` }"
              />
            </div>
            <span class="text-sm font-semibold w-36 text-right">{{ fmtMoney(acc.total_base) }}</span>
          </div>
        </div>
      </UCard>

      <!-- Tabla por cuenta -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Detalle por cuenta</h3>
            <UBadge :label="`${data.accounts.length} cuentas`" variant="soft" size="sm" />
          </div>
        </template>

        <div v-if="data.accounts.length === 0" class="py-8 text-center text-sm text-muted">
          <UIcon name="i-lucide-bar-chart-3" class="mx-auto mb-2 text-2xl opacity-30" />
          <p>Sin pagos con cuenta contable en el período seleccionado</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="acc in data.accounts"
            :key="acc.account_id"
            class="border border-default rounded-lg overflow-hidden"
          >
            <!-- Fila de cuenta -->
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-elevated/50 transition-colors"
              @click="toggleExpand(acc.account_id)"
            >
              <UIcon
                :name="expanded.has(acc.account_id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="text-muted shrink-0"
              />
              <span class="text-xs font-mono text-muted w-16 shrink-0">{{ acc.code }}</span>
              <span class="text-sm font-medium flex-1 truncate">{{ acc.name }}</span>
              <UBadge
                :label="TYPE_LABELS[acc.account_type]?.label ?? acc.account_type"
                :color="(TYPE_LABELS[acc.account_type]?.color ?? 'neutral') as any"
                variant="subtle"
                size="xs"
              />
              <UBadge :label="`${acc.count} pagos`" variant="soft" size="xs" />
              <span class="text-sm font-semibold w-36 text-right">{{ fmtMoney(acc.total_base) }}</span>
            </div>

            <!-- Pagos expandidos -->
            <div v-if="expanded.has(acc.account_id)" class="border-t border-default bg-muted/20">
              <div
                v-for="p in acc.payments"
                :key="p.id"
                class="flex items-center gap-3 px-4 py-2 text-sm border-b border-default last:border-b-0"
              >
                <NuxtLink
                  :to="`/erp/treasury/payments/${p.id}`"
                  class="text-primary hover:underline font-mono text-xs w-24 shrink-0"
                >
                  #{{ String(p.number).padStart(8, '0') }}
                </NuxtLink>
                <span class="text-xs text-muted w-24 shrink-0">{{ fmtDate(p.date) }}</span>
                <span class="flex-1 truncate">{{ p.party_name ?? '—' }}</span>
                <span class="text-xs text-muted w-28 shrink-0">{{ METHOD_LABELS[p.payment_method] ?? p.payment_method }}</span>
                <span class="w-32 text-right font-medium">
                  {{ fmtMoney(p.converted_amount ?? p.amount) }}
                </span>
                <UBadge
                  v-if="p.currency_code !== 'ARS'"
                  :label="p.currency_code"
                  variant="outline"
                  size="xs"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Sin asignar -->
        <div v-if="data.unassigned.count > 0" class="mt-4 border border-warning/40 rounded-lg overflow-hidden">
          <div
            class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-elevated/50 transition-colors"
            @click="toggleExpand('unassigned')"
          >
            <UIcon
              :name="expanded.has('unassigned') ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="text-muted shrink-0"
            />
            <UIcon name="i-lucide-alert-triangle" class="text-warning shrink-0" />
            <span class="text-sm font-medium flex-1">Sin cuenta contable asignada</span>
            <UBadge :label="`${data.unassigned.count} pagos`" color="warning" variant="subtle" size="xs" />
            <span class="text-sm font-semibold w-36 text-right">{{ fmtMoney(data.unassigned.total_base) }}</span>
          </div>
          <div v-if="expanded.has('unassigned')" class="border-t border-default bg-muted/20">
            <div
              v-for="p in data.unassigned.payments"
              :key="p.id"
              class="flex items-center gap-3 px-4 py-2 text-sm border-b border-default last:border-b-0"
            >
              <NuxtLink
                :to="`/erp/treasury/payments/${p.id}`"
                class="text-primary hover:underline font-mono text-xs w-24 shrink-0"
              >
                #{{ String(p.number).padStart(8, '0') }}
              </NuxtLink>
              <span class="text-xs text-muted w-24 shrink-0">{{ fmtDate(p.date) }}</span>
              <span class="flex-1 truncate">{{ p.party_name ?? '—' }}</span>
              <span class="text-xs text-muted w-28 shrink-0">{{ METHOD_LABELS[p.payment_method] ?? p.payment_method }}</span>
              <span class="w-32 text-right font-medium">
                {{ fmtMoney(p.converted_amount ?? p.amount) }}
              </span>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UPage>
</template>
