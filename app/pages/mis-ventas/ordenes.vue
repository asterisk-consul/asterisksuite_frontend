<script setup lang="ts">
import { h } from 'vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useMySalesStore } from '~/modulos/erp/sales/my-sales/my-sales.store'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const store = useMySalesStore()
const { orders, loading } = storeToRefs(store)

const currentPeriod = ref(new Date().toISOString().slice(0, 7))

const periodOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    options.push({ label, value })
  }
  return options
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(value)
}

const statusColors: Record<string, string> = {
  'Sin facturar': 'warning',
  'Pendiente': 'error',
  'Parcial': 'info',
  'Cobrada': 'success',
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'date',
    header: 'Fecha',
    cell: ({ row }) => {
      const d = new Date(row.original.date)
      return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    }
  },
  {
    accessorKey: 'number',
    header: 'OV',
    cell: ({ row }) => h(NuxtLink, {
      to: `/erp/sales/${row.original.id}`,
      class: 'font-medium text-primary hover:underline'
    }, () => `OV-${row.original.number}`)
  },
  {
    accessorKey: 'client_name',
    header: 'Cliente',
    cell: ({ row }) => row.original.client_name
  },
  {
    accessorKey: 'total',
    header: 'Total OV',
    cell: ({ row }) => h('span', { class: 'font-semibold' }, formatCurrency(row.original.total))
  },
  {
    accessorKey: 'facturado',
    header: 'Facturado',
    cell: ({ row }) => formatCurrency(row.original.facturado)
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
      return val > 0 ? h('span', { class: 'text-red-600 font-medium' }, formatCurrency(val)) : '—'
    }
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.status
      return h(UBadge, {
        label: status,
        color: (statusColors[status] || 'neutral') as any,
        variant: 'subtle',
        size: 'xs'
      })
    }
  }
]

watch(currentPeriod, async () => {
  await store.fetchOrders(currentPeriod.value)
})

onMounted(async () => {
  await store.fetchOrders(currentPeriod.value)
})
</script>

<template>
  <UPage class="space-y-4 px-4">
    <div class="flex items-center justify-between">
      <AppPageHeader title="Mis Órdenes de Venta" />
      <USelect
        v-model="currentPeriod"
        :items="periodOptions"
        class="w-48"
      />
    </div>

    <LogisticaTable :loading="loading" :data="orders" :columns="columns" />
  </UPage>
</template>
