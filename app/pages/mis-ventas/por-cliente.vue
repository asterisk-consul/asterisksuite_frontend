<script setup lang="ts">
import { h } from 'vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useMySalesStore } from '~/modulos/erp/sales/my-sales/my-sales.store'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const store = useMySalesStore()
const { byClient, loading } = storeToRefs(store)

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

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'client_name',
    header: 'Cliente',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.client_name)
  },
  {
    accessorKey: 'ordenes',
    header: 'Órdenes',
    cell: ({ row }) => row.original.ordenes
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
      return val > 0 ? h('span', { class: 'text-red-600 font-semibold' }, formatCurrency(val)) : '—'
    }
  }
]

watch(currentPeriod, async () => {
  await store.fetchByClient(currentPeriod.value)
})

onMounted(async () => {
  await store.fetchByClient(currentPeriod.value)
})
</script>

<template>
  <UPage class="space-y-4 px-4">
    <div class="flex items-center justify-between">
      <AppPageHeader title="Mis Ventas por Cliente" />
      <USelect
        v-model="currentPeriod"
        :items="periodOptions"
        class="w-48"
      />
    </div>

    <LogisticaTable :loading="loading" :data="byClient" :columns="columns" />
  </UPage>
</template>
