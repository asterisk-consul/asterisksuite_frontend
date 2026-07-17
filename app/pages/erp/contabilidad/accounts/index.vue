<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { useAccountsService } from '~/modulos/contabilidad/service/accounts.service'
import type { Account, AccountType } from '~/modulos/contabilidad/types/accounts.types'

const service = useAccountsService()

const accounts = ref<Account[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')

onMounted(async () => {
  try {
    accounts.value = await service.findAll()
  } catch (e: any) {
    error.value = e?.data?.message || 'Error al cargar cuentas'
  } finally {
    loading.value = false
  }
})

const accountTypeLabels: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  REVENUE: 'Ingresos',
  EXPENSE: 'Gastos'
}

const accountTypeColors: Record<AccountType, string> = {
  ASSET: 'success',
  LIABILITY: 'error',
  EQUITY: 'primary',
  REVENUE: 'info',
  EXPENSE: 'warning'
}

const filteredAccounts = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return accounts.value
  return accounts.value.filter(a =>
    a.code.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q)
  )
})

const rootAccounts = computed(() =>
  filteredAccounts.value.filter(a => !a.parent_id)
)

const getChildren = (parentId: string) =>
  filteredAccounts.value.filter(a => a.parent_id === parentId)
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Plan de Cuentas"
      description="Plan contable de la empresa"
    />

    <UAlert
      v-if="error"
      icon="i-lucide-alert-triangle"
      color="error"
      variant="subtle"
      :title="error"
    />

    <UInput
      v-model="searchQuery"
      placeholder="Buscar por código o nombre..."
      icon="i-lucide-search"
      class="max-w-sm"
    />

    <UPageCard variant="subtle">
      <template #header>
        <h3 class="text-sm font-semibold">Cuentas</h3>
      </template>

      <div v-if="loading" class="flex justify-center py-8">
        <ULoader />
      </div>

      <div v-else-if="rootAccounts.length === 0" class="text-center py-8 text-muted text-sm">
        No hay cuentas registradas
      </div>

      <div v-else class="space-y-1">
        <template v-for="account in rootAccounts" :key="account.id">
          <!-- Root account -->
          <div class="flex items-center gap-3 py-2 px-3 rounded hover:bg-muted/50">
            <UBadge
              :label="accountTypeLabels[account.account_type]"
              :color="accountTypeColors[account.account_type] as any"
              variant="soft"
              size="xs"
            />
            <span class="text-sm font-mono font-semibold text-muted w-20">{{ account.code }}</span>
            <span class="text-sm font-medium">{{ account.name }}</span>
          </div>

          <!-- Children -->
          <template v-for="child in getChildren(account.id)" :key="child.id">
            <div class="flex items-center gap-3 py-1.5 px-3 pl-10 rounded hover:bg-muted/50">
              <span class="text-xs font-mono text-muted w-20">{{ child.code }}</span>
              <span class="text-sm">{{ child.name }}</span>
            </div>

            <!-- Grandchildren -->
            <template v-for="grandchild in getChildren(child.id)" :key="grandchild.id">
              <div class="flex items-center gap-3 py-1 px-3 pl-16 rounded hover:bg-muted/50">
                <span class="text-xs font-mono text-muted w-20">{{ grandchild.code }}</span>
                <span class="text-xs text-muted">{{ grandchild.name }}</span>
              </div>
            </template>
          </template>
        </template>
      </div>
    </UPageCard>
  </UPage>
</template>
