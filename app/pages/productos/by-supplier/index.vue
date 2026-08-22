<script setup lang="ts">
import { h } from 'vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const toast = useToast()

// Data
const suppliers = ref<any[]>([])
const allSuppliers = ref<any[]>([])
const loading = ref(false)
const selectedSupplierId = ref('')

// Fetch suppliers list
onMounted(async () => {
  const data = await $fetch<any[]>('/api/logistica/master-data/business-parties')
  allSuppliers.value = data.filter((s: any) => s.type === 'SUPPLIER')
})

const supplierOptions = computed(() =>
  allSuppliers.value.map((s: any) => ({
    label: `${s.name}${s.tax_id ? ` (${s.tax_id})` : ''}`,
    value: s.id
  }))
)

// Fetch products by supplier
async function fetchBySupplier() {
  if (!selectedSupplierId.value) {
    suppliers.value = []
    return
  }

  loading.value = true
  try {
    const data = await $fetch<any[]>('/api/pricing/product-suppliers', {
      query: { product_id: undefined }
    })
    suppliers.value = data.filter((s: any) => s.supplier_id === selectedSupplierId.value)
  } catch (err: any) {
    toast.add({
      title: 'Error',
      color: 'error',
      description: err?.data?.message || 'Error al cargar datos'
    })
  } finally {
    loading.value = false
  }
}

watch(selectedSupplierId, () => {
  fetchBySupplier()
})

// Table columns
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'products',
    header: 'Producto',
    accessorFn: (row) => row.products?.name ?? '',
    cell: ({ row }) => {
      const product = row.original.products
      if (!product) return '—'
      return h(NuxtLink, {
        to: `/productos/${product.id}`,
        class: 'font-medium hover:text-primary hover:underline'
      }, () => product.name)
    }
  },
  {
    accessorKey: 'products.sku',
    header: 'SKU',
    accessorFn: (row) => row.products?.sku ?? '',
    cell: ({ row }) => {
      const sku = row.original.products?.sku
      return h('span', { class: 'text-sm text-muted' }, sku || '—')
    }
  },
  {
    accessorKey: 'purchase_price',
    header: 'Precio de compra',
    cell: ({ row }) => {
      const price = parseFloat(row.original.purchase_price)
      const symbol = row.original.currencies?.symbol || '$'
      return h('span', { class: 'font-semibold' }, `${symbol} ${price.toFixed(2)}`)
    }
  },
  {
    accessorKey: 'currencies',
    header: 'Moneda',
    accessorFn: (row) => row.currencies?.code ?? '',
    cell: ({ row }) => row.original.currencies?.code || '—'
  },
  {
    accessorKey: 'is_primary',
    header: 'Principal',
    cell: ({ row }) => {
      if (row.original.is_primary) {
        return h(UBadge, { label: 'Principal', color: 'amber', variant: 'subtle', size: 'xs' })
      }
      return '—'
    }
  },
  {
    accessorKey: 'lead_time_days',
    header: 'Entrega',
    cell: ({ row }) => {
      const days = row.original.lead_time_days
      return days ? `${days} días` : '—'
    }
  }
]
</script>

<template>
  <UPage class="space-y-4">
    <UPageHeader
      title="Productos por Proveedor"
      description="Ver productos asociados a cada proveedor"
    />

    <!-- Filtro de proveedor -->
    <UCard>
      <div class="flex items-center gap-4">
        <UFormField label="Proveedor" class="flex-1">
          <USelect
            v-model="selectedSupplierId"
            :items="supplierOptions"
            placeholder="Seleccionar proveedor"
            searchable
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Results -->
    <UCard v-if="selectedSupplierId">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">
            {{ suppliers.length }} producto{{ suppliers.length !== 1 ? 's' : '' }}
          </h3>
        </div>
      </template>

      <div v-if="loading" class="flex justify-center py-8">
        <UProgress />
      </div>

      <div v-else-if="suppliers.length === 0" class="text-center py-8 text-muted">
        <p>No hay productos asociados a este proveedor.</p>
      </div>

      <LogisticaTable
        v-else
        :data="suppliers"
        :columns="columns"
      />
    </UCard>

    <!-- Empty state -->
    <UCard v-else>
      <div class="text-center py-8 text-muted">
        <UIcon name="i-lucide-search" class="size-8 mx-auto mb-2 opacity-50" />
        <p>Seleccioná un proveedor para ver sus productos.</p>
      </div>
    </UCard>
  </UPage>
</template>
