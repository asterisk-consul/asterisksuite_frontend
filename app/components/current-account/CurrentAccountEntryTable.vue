<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { currentAccountEntryColumns, ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const props = defineProps<{
  entries: any[]
  loading?: boolean
  partyType?: string
  currencyCode?: string
}>()

const sorting = ref<SortingState>([])

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = computed(() => currentAccountEntryColumns({
  onSortFieldSelect,
  partyType: props.partyType
}))

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
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">Movimientos</p>
        <UBadge :label="`${entries.length} movimientos`" variant="soft" size="sm" />
      </div>
    </template>

    <LogisticaTable
      :loading="loading"
      :data="entries"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPageCard>
</template>
