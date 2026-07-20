<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()

const totalEmployees = ref(0)
const totalPartners = ref(0)
const totalVales = ref(0)
const pendingVales = ref(0)
const totalBalance = ref(0)

async function loadDashboard() {
  try {
    const [employees, partners, vales, accounts] = await Promise.all([
      $fetch<any[]>('/api/erp/employees'),
      $fetch<any[]>('/api/erp/partners'),
      hrStore.fetchVales(),
      hrStore.fetchAccounts(),
    ])

    totalEmployees.value = employees.length
    totalPartners.value = partners.length
    totalVales.value = vales.length
    pendingVales.value = vales.filter((v: any) => v.status === 'DRAFT').length
    totalBalance.value = accounts.reduce((sum: number, a: any) => sum + Number(a.balance), 0)
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => loadDashboard())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}
</script>

<template>
  <UPage>
    <AppPageHeader title="RRHH" description="Gestión de recursos humanos" />

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink to="/erp/rrhh/employees">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="space-y-1">
            <p class="text-xs text-muted">Empleados</p>
            <p class="text-2xl font-semibold text-info-500">{{ totalEmployees }}</p>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/partners">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="space-y-1">
            <p class="text-xs text-muted">Socios</p>
            <p class="text-2xl font-semibold text-warning-500">{{ totalPartners }}</p>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/vales">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="space-y-1">
            <p class="text-xs text-muted">Vales pendientes</p>
            <p class="text-2xl font-semibold text-primary">{{ pendingVales }}</p>
            <p class="text-xs text-muted">de {{ totalVales }} total</p>
          </div>
        </UPageCard>
      </NuxtLink>

      <NuxtLink to="/erp/rrhh/current-accounts">
        <UPageCard variant="subtle" class="hover:bg-muted/50 transition-colors cursor-pointer">
          <div class="space-y-1">
            <p class="text-xs text-muted">Saldo total CC</p>
            <p class="text-2xl font-semibold" :class="totalBalance >= 0 ? 'text-success' : 'text-error'">
              {{ fmt(totalBalance) }}
            </p>
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
