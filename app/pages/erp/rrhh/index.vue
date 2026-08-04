<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { useRrhhTotals } from '~/modulos/erp/rrhh/composables/useRrhhTotals'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()
const { allAccounts, fetchAll } = useCurrentAccounts()

const totalEmployees = ref(0)
const activeEmployees = ref(0)
const totalPartners = ref(0)
const activePartners = ref(0)
const totalVales = ref(0)
const pendingVales = ref(0)

interface CurrencyBalance {
  balance: number
  count: number
}
const balanceByCurrency = ref<Record<string, CurrencyBalance>>({})

async function loadDashboard() {
  try {
    const [employees, partners, vales] = await Promise.all([
      $fetch<any[]>('/api/erp/employees'),
      $fetch<any[]>('/api/erp/partners'),
      hrStore.fetchVales(),
    ])

    // Cargar cuentas corrientes de RRHH
    await fetchAll({ party_type: 'EMPLOYEE,PARTNER' })
    await nextTick()

    // Empleados
    totalEmployees.value = employees.length
    activeEmployees.value = employees.filter((e: any) => e.is_active !== false).length

    // Socios
    totalPartners.value = partners.length
    activePartners.value = partners.filter((p: any) => p.is_active !== false).length

    // Vales
    totalVales.value = vales.length
    pendingVales.value = vales.filter((v: any) => v.status === 'DRAFT').length

    // Saldo desde current_accounts (una sola fuente de verdad)
    const map: Record<string, CurrencyBalance> = {}
    const rrhhAccounts = allAccounts.value.filter(a => a.party_type === 'EMPLOYEE' || a.party_type === 'PARTNER')
    for (const a of rrhhAccounts) {
      const code = a.currency_code || 'ARS'
      if (!map[code]) map[code] = { balance: 0, count: 0 }
      map[code].balance -= Number(a.balance)
      map[code].count++
    }
    balanceByCurrency.value = map
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => loadDashboard())

function fmt(n: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n ?? 0)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="RRHH" description="Gestión de recursos humanos" />

    <!-- Resumen principal -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4">
      <NuxtLink to="/erp/rrhh/employees" class="h-full">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <div class="space-y-1">
            <p class="text-xs text-muted">Empleados</p>
            <p class="text-2xl font-semibold text-info-500">{{ totalEmployees }}</p>
            <p class="text-xs text-muted">{{ activeEmployees }} activos</p>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/partners" class="h-full">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <div class="space-y-1">
            <p class="text-xs text-muted">Socios</p>
            <p class="text-2xl font-semibold text-warning-500">{{ totalPartners }}</p>
            <p class="text-xs text-muted">{{ activePartners }} activos</p>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/vales" class="h-full">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <div class="space-y-1">
            <p class="text-xs text-muted">Vales pendientes</p>
            <p class="text-2xl font-semibold text-primary">{{ pendingVales }}</p>
            <p class="text-xs text-muted">de {{ totalVales }} total</p>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/current-accounts" class="h-full">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <div class="space-y-1">
            <p class="text-xs text-muted">Saldo total CC</p>
            <template v-if="Object.keys(balanceByCurrency).length > 0">
              <div v-for="(data, currency) in balanceByCurrency" :key="currency" class="flex items-baseline gap-2">
                <p class="text-lg font-semibold" :class="data.balance <= 0 ? 'text-error' : 'text-success'">
                  {{ currency }} {{ fmt(Math.abs(data.balance), currency) }}
                </p>
              </div>
            </template>
            <p v-else class="text-2xl font-semibold text-muted">$0.00</p>
            <p class="text-xs text-muted">{{ Object.keys(balanceByCurrency).length > 0 ? Object.values(balanceByCurrency).reduce((s, d) => s + d.count, 0) : 0 }} cuentas</p>
          </div>
        </UPageCard>
      </NuxtLink>
    </div>

    <!-- Vales recientes -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">Vales recientes</h3>
          <UButton label="Ver todos" variant="ghost" color="neutral" size="sm" to="/erp/rrhh/vales" />
        </div>
      </template>
      <div v-if="hrStore.vales.length === 0" class="text-center py-8 text-muted text-sm">
        No hay vales registrados.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="vale in hrStore.vales.slice(0, 5)"
          :key="vale.id"
          class="flex items-center justify-between py-2 border-b border-default last:border-0"
        >
          <div>
            <span class="font-mono text-xs text-muted">#{{ vale.number }}</span>
            <span class="ml-2 font-medium">{{ vale.party?.name }}</span>
          </div>
          <div class="text-right">
            <UBadge
              :label="vale.type"
              :color="vale.type === 'RETIRO' || vale.type === 'ADELANTO' ? 'error' : 'success'"
              variant="subtle"
              size="sm"
            />
            <span class="ml-2 font-medium">{{ fmt(Number(vale.amount)) }}</span>
          </div>
        </div>
      </div>
    </UPageCard>
  </UPage>
</template>
