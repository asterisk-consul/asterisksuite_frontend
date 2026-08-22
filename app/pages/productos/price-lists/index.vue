<script setup lang="ts">
import { storeToRefs } from 'pinia'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { usePriceListsStore } from '~/modulos/erp/pricing/stores/price-lists.store'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const toast = useToast()
const store = usePriceListsStore()
const unitsStore = useUnitsStore()

const { items: priceLists, loading } = storeToRefs(store)
const { items: currencies } = storeToRefs(unitsStore)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingRow = ref<any>(null)

const filterType = ref('')

const typeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Venta', value: 'SALE' },
  { label: 'Compra', value: 'PURCHASE' }
]

const filteredLists = computed(() => {
  if (!filterType.value) return priceLists.value
  return priceLists.value.filter((l) => l.type === filterType.value)
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name)
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.original.type
      const label = type === 'SALE' ? 'Venta' : 'Compra'
      const color = type === 'SALE' ? 'success' : 'info'
      return h(UBadge, { label, color, variant: 'subtle', size: 'xs' })
    }
  },
  {
    accessorKey: 'currencies',
    header: 'Moneda',
    cell: ({ row }) => row.original.currencies?.code || '—'
  },
  {
    accessorKey: '_count',
    header: 'Productos',
    cell: ({ row }) => row.original._count?.product_list_prices ?? 0
  },
  {
    accessorKey: 'active',
    header: 'Estado',
    cell: ({ row }) => {
      const active = row.original.active
      return h(UBadge, {
        label: active ? 'Activa' : 'Inactiva',
        color: active ? 'success' : 'neutral',
        variant: 'subtle',
        size: 'xs'
      })
    }
  }
]

function openCreate() {
  modalMode.value = 'create'
  editingRow.value = null
  modalOpen.value = true
}

function openEdit(row: any) {
  modalMode.value = 'edit'
  editingRow.value = { ...row }
  modalOpen.value = true
}

async function handleSubmit(data: any) {
  try {
    if (modalMode.value === 'create') {
      await store.create({
        name: data.name,
        type: data.type,
        currency_id: data.currency_id,
        description: data.description
      })
      toast.add({ title: 'Lista creada', color: 'success' })
    } else {
      await store.update(editingRow.value.id, {
        name: data.name,
        type: data.type,
        currency_id: data.currency_id,
        description: data.description
      })
      toast.add({ title: 'Lista actualizada', color: 'success' })
    }
    modalOpen.value = false
  } catch (err: any) {
    toast.add({
      title: 'Error',
      color: 'error',
      description: err?.data?.message || err?.message || 'Error desconocido'
    })
  }
}

async function handleDelete(row: any) {
  try {
    await store.remove(row.id)
    toast.add({ title: 'Lista eliminada', color: 'success' })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      color: 'error',
      description: err?.data?.message || 'Error'
    })
  }
}

onMounted(async () => {
  await store.fetchAll()
})

const links = ref([
  {
    label: 'Nueva Lista',
    icon: 'i-heroicons-plus',
    onClick: openCreate,
    color: 'primary' as const,
    variant: 'solid' as const
  }
])
</script>

<template>
  <UPage class="space-y-4">
    <UPageHeader
      title="Listas de Precio"
      description="Gestionar listas de precios de venta y compra"
      :links="links"
    />

    <div class="flex items-center gap-3">
      <USelect
        v-model="filterType"
        :items="typeOptions"
        placeholder="Filtrar por tipo"
        class="w-48"
      />
    </div>

    <LogisticaTable
      :loading="loading"
      :data="filteredLists"
      :columns="columns"
    />
  </UPage>

  <ModalForm
    v-model:open="modalOpen"
    :title="modalMode === 'create' ? 'Nueva Lista de Precio' : 'Editar Lista de Precio'"
    :initial-values="editingRow"
    :fields="[
      { name: 'name', label: 'Nombre', type: 'text', placeholder: 'Lista Minorista', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: [{ label: 'Venta', value: 'SALE' }, { label: 'Compra', value: 'PURCHASE' }], required: true },
      { name: 'currency_id', label: 'Moneda', type: 'select', options: currencies.map((c: any) => ({ label: `${c.code} - ${c.name}`, value: c.id })), required: true },
      { name: 'description', label: 'Descripción', type: 'text', placeholder: 'Descripción opcional' }
    ]"
    @submit="handleSubmit"
  />
</template>
