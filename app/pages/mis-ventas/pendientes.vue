<script setup lang="ts">
import { h } from 'vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useMySalesStore } from '~/modulos/erp/sales/my-sales/my-sales.store'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const store = useMySalesStore()
const { pending, loading } = storeToRefs(store)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(value)
}

const totalPendiente = computed(() =>
  pending.value.reduce((sum, p) => sum + p.pendiente, 0)
)

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'client_name',
    header: 'Cliente',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.client_name)
  },
  {
    accessorKey: 'facturas',
    header: 'Facturas',
    cell: ({ row }) => row.original.facturas
  },
  {
    accessorKey: 'total_facturado',
    header: 'Total facturado',
    cell: ({ row }) => formatCurrency(row.original.total_facturado)
  },
  {
    accessorKey: 'cobrado',
    header: 'Cobrado',
    cell: ({ row }) => h('span', { class: 'text-green-600' }, formatCurrency(row.original.cobrado))
  },
  {
    accessorKey: 'pendiente',
    header: 'Pendiente',
    cell: ({ row }) => {
      const val = row.original.pendiente
      return val > 0 ? h('span', { class: 'text-red-600 font-semibold' }, formatCurrency(val)) : '—'
    }
  }
]

onMounted(async () => {
  await store.fetchPending()
})
</script>

<template>
  <UPage class="space-y-4 px-4">
    <AppPageHeader title="Pendientes de Cobro" />

    <!-- Total pendiente -->
    <UCard v-if="!loading && pending.length > 0">
      <div class="text-center">
        <div class="text-sm text-muted">Pendiente total de cobro</div>
        <div class="text-3xl font-bold text-red-600">{{ formatCurrency(totalPendiente) }}</div>
      </div>
    </UCard>

    <LogisticaTable :loading="loading" :data="pending" :columns="columns" />
  </UPage>
</template>
