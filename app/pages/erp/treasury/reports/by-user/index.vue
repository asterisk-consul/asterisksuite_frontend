<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { usePaymentReports } from '~/modulos/erp/payment-reports/composables/usePaymentReports'
import { paymentByUserColumns } from '~/modulos/erp/payment-reports/columns'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const { byUser, loading, fetchByUser } = usePaymentReports()

const users = computed(() => byUser.value?.users ?? [])

const sorting = ref<SortingState>([])
const error = ref<string | null>(null)

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

onMounted(async () => {
  try {
    await fetchByUser()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Error al cargar reporte'
  }
})

const columns = paymentByUserColumns({
  onSortFieldSelect
})

const filterFields: FilterField[] = [
  { id: 'user_name', label: 'Filtrar por usuario...', class: 'w-48' }
]

const sortFields: SortField[] = [
  { label: 'Usuario', value: 'user_name' },
  { label: 'Moneda', value: 'currency_code' },
  { label: 'Cantidad', value: 'count' },
  { label: 'Total', value: 'total_amount' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Pagos por usuario"
      description="Reporte de pagos y cobros agrupados por usuario"
    />

    <UAlert
      v-if="error"
      icon="i-lucide-alert-triangle"
      color="error"
      variant="subtle"
      :title="error"
    />

    <LogisticaTable
      :loading="loading"
      :data="users"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />
  </UPage>
</template>
