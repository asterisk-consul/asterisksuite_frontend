<script setup lang="ts">
import type { DateRange } from '~/components/compras/FiltroDateCompras.vue'
import DateRangePicker from '~/components/compras/FiltroDateCompras.vue'
import { useExcelExport } from '~/composables/useExcelExport'
import type { DropdownMenuItem } from '@nuxt/ui'

const { exportToExcel } = useExcelExport()

definePageMeta({ middleware: ['auth'] })

const loading = ref(false)
const accounts = ref<any[]>([])
const movements = ref<any[]>([])

const dateRange = ref<DateRange>({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  end: new Date()
})

const fetchData = async () => {
  loading.value = true
  try {
    // Fetch accounts and movements in parallel
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

// Build account tree with movement totals (only accounts with movements)
const accountTree = computed(() => {
  const map = new Map<string, any>()
  const roots: any[] = []

  // Calculate totals per account from movements
  const movementTotals = new Map<string, number>()
  for (const mov of movements.value) {
    const accountId = mov.account_id || mov.current_account_id
    if (accountId) {
      const current = movementTotals.get(accountId) || 0
      movementTotals.set(accountId, current + (Number(mov.amount) || 0))
    }
  }

  // Only include accounts that have movements
  for (const acc of accounts.value) {
    const total = movementTotals.get(acc.id) || 0
    if (total !== 0) {
      map.set(acc.id, { ...acc, children: [], movement_total: total })
    }
  }

  // Build hierarchy only for accounts with movements
  for (const acc of accounts.value) {
    if (map.has(acc.id)) {
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(map.get(acc.id)!)
      } else if (!acc.parent_id) {
        roots.push(map.get(acc.id)!)
      }
    }
  }

  return roots
})

const handleExportExcel = () => {
  exportToExcel({
    filename: 'reportes_contables',
    sheetName: 'Plan de Cuentas',
    columns: [
      { key: 'code', label: 'Código', width: 12 },
      { key: 'name', label: 'Nombre', width: 30 },
      { key: 'account_type', label: 'Tipo', width: 15 },
      { key: 'movement_total', label: 'Total Movimientos', width: 20 }
    ],
    data: accountTree.value.flatMap(account => [
      account,
      ...(account.children ?? [])
    ])
  })
}

const dataActions: DropdownMenuItem[] = [
  { label: 'Exportar Excel', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel }
]

const accountTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  ASSET: { label: 'Activo', color: 'success', icon: 'i-lucide-trending-up' },
  LIABILITY: { label: 'Pasivo', color: 'error', icon: 'i-lucide-trending-down' },
  EQUITY: { label: 'Patrimonio', color: 'primary', icon: 'i-lucide-scale' },
  REVENUE: { label: 'Ingreso', color: 'info', icon: 'i-lucide-arrow-up-right' },
  EXPENSE: { label: 'Gasto', color: 'warning', icon: 'i-lucide-arrow-down-right' }
}

const formatCurrency = (amount: number | string | null | undefined) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Reportes Contables"
      description="Estados contables y reportes financieros"
    >
      <template #links>
        <UFieldGroup>
          <UButton color="neutral" variant="subtle" label="Datos" icon="i-lucide-database" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
      </template>
    </AppPageHeader>

    <!-- DATE FILTER -->
    <div class="flex items-center gap-3">
      <DateRangePicker v-model="dateRange" />
      <UButton label="Buscar" icon="i-lucide-search" @click="fetchData" />
    </div>

    <!-- SUMMARY CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div v-for="(config, type) in accountTypeConfig" :key="type" class="p-4 rounded-xl border border-default bg-default">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg flex items-center justify-center" :class="`bg-${config.color}/10`">
            <UIcon :name="config.icon" class="size-5" :class="`text-${config.color}`" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">{{ config.label }}</p>
            <p class="text-lg font-bold">{{ accountTree.filter(a => a.account_type === type).length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ACCOUNT TREE -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">Plan de Cuentas</h3>
          <NuxtLink to="/erp/contabilidad/accounts">
            <UButton label="Ver plan completo" variant="ghost" size="xs" icon="i-lucide-external-link" />
          </NuxtLink>
        </div>
      </template>

      <div v-if="loading" class="flex justify-center py-8"><ULoader /></div>

      <div v-else-if="accountTree.length === 0" class="text-center py-8 text-muted text-sm">
        No hay cuentas configuradas
      </div>

      <div v-else class="space-y-2">
        <template v-for="account in accountTree" :key="account.id">
          <!-- Level 1 -->
          <div class="flex items-center gap-3 p-3 rounded-lg border border-default bg-default">
            <div class="size-8 rounded-lg flex items-center justify-center" :class="`bg-${accountTypeConfig[account.account_type]?.color || 'neutral'}/10`">
              <UIcon :name="accountTypeConfig[account.account_type]?.icon || 'i-lucide-circle'" class="size-4" :class="`text-${accountTypeConfig[account.account_type]?.color || 'neutral'}`" />
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold">{{ account.code }} - {{ account.name }}</p>
              <p class="text-xs text-muted">{{ accountTypeConfig[account.account_type]?.label }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold" :class="account.movement_total >= 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(account.movement_total) }}
              </p>
              <UBadge :label="`${account.children?.length || 0} subcuentas`" color="neutral" variant="soft" size="xs" />
            </div>
          </div>

          <!-- Level 2 -->
          <template v-if="account.children && account.children.length">
            <template v-for="child in account.children" :key="child?.id || Math.random()">
              <div v-if="child" class="ml-8 flex items-center gap-3 p-2 rounded border border-default">
                <div class="size-6 rounded flex items-center justify-center" :class="`bg-${accountTypeConfig[child.account_type]?.color || 'neutral'}/10`">
                  <UIcon :name="accountTypeConfig[child.account_type]?.icon || 'i-lucide-circle'" class="size-3" :class="`text-${accountTypeConfig[child.account_type]?.color || 'neutral'}`" />
                </div>
                <div class="flex-1">
                  <p class="text-xs font-medium">{{ child.code }} - {{ child.name }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs font-bold" :class="(child.movement_total || 0) >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(child.movement_total) }}
                  </p>
                </div>
              </div>

              <!-- Level 3 -->
              <template v-if="child.children && child.children.length">
                <div v-for="grandchild in child.children" :key="grandchild?.id || Math.random()" class="ml-16 flex items-center gap-2 p-1.5 rounded border border-default">
                  <span class="text-xs text-muted font-mono w-16">{{ grandchild?.code }}</span>
                  <span class="text-xs flex-1">{{ grandchild?.name }}</span>
                  <span class="text-xs font-bold" :class="(grandchild?.movement_total || 0) >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(grandchild?.movement_total) }}
                  </span>
                </div>
              </template>
            </template>
          </template>
        </template>
      </div>
    </UPageCard>
  </UPage>
</template>
