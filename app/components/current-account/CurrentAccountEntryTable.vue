<script setup lang="ts">
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'
import { currentAccountEntryColumns, ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const props = defineProps<{
  entries: any[]
  loading?: boolean
  partyType?: string
}>()

const sorting = ref<SortingState>([])

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const columns = computed(() => currentAccountEntryColumns({
  onSortFieldSelect,
  partyType: props.partyType,
  baseCurrency: 'ARS'
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
  <UPageCard variant="subtle" class="overflow-hidden">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-list-ordered" class="size-4" />
          </div>
          <div>
            <p class="font-semibold">Historial de movimientos</p>
            <p class="text-xs text-muted">Comprobantes, pagos y ajustes registrados</p>
          </div>
        </div>
        <UBadge :label="`${entries.length} movimientos`" variant="soft" size="sm" />
      </div>
    </template>

    <div class="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
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
</template>
