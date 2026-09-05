<script setup lang="ts">
import { useProductPriceService } from '~/modulos/logistica/master-data/product-price/service/product-price.service'
import { useVariantCostsService } from '~/modulos/logistica/master-data/variant-cost/service/variant-cost.service'
import { useVariantPriceService } from '~/modulos/logistica/master-data/product-variants/service/variant-price.service'

const props = withDefaults(defineProps<{
  open: boolean
  priceId: string | null
  productName: string
  entityName?: string
}>(), {
  entityName: 'product_price'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const productPriceService = useProductPriceService()
const variantCostsService = useVariantCostsService()
const variantPriceService = useVariantPriceService()

const history = ref<any[]>([])
const loading = ref(false)

const getHistory = async (id: string): Promise<any[]> => {
  switch (props.entityName) {
    case 'product_variant_costs':
      return await variantCostsService.getHistory(id)
    case 'product_variant_prices':
      return await variantPriceService.getHistory(id)
    default:
      return await productPriceService.getHistory(id)
  }
}

watch([() => props.priceId, () => props.open], async ([id, isOpen]) => {
  if (!id || !isOpen) return
  loading.value = true
  try {
    history.value = await getHistory(id)
  } catch {
    history.value = []
  } finally {
    loading.value = false
  }
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    CREATE: 'Creó',
    UPDATE: 'Modificó',
    DELETE: 'Eliminó'
  }
  return labels[action] ?? action
}

const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    CREATE: 'success',
    UPDATE: 'warning',
    DELETE: 'error'
  }
  return colors[action] ?? 'neutral'
}

const formatPrice = (data: any) => {
  if (!data) return '—'
  if (data.price !== undefined) return `$ ${Number(data.price).toLocaleString('es-AR')}`
  if (data.cost !== undefined) return `$ ${Number(data.cost).toLocaleString('es-AR')}`
  return '—'
}

const calcVariation = (oldData: any, newData: any) => {
  const oldVal = Number(oldData?.price ?? oldData?.cost)
  const newVal = Number(newData?.price ?? newData?.cost)
  if (!oldVal || !newVal) return null
  return ((newVal - oldVal) / oldVal) * 100
}

const getVariationColor = (pct: number) => {
  if (pct > 0) return 'text-emerald-600'
  if (pct < 0) return 'text-red-500'
  return 'text-muted'
}
</script>

<template>
  <UModal
    :open="open"
    title="Historial de cambios"
    :ui="{ content: 'max-w-6xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <p class="text-sm text-muted mb-4">
        Cambios registrados para
        <strong>{{ productName }}</strong>
      </p>

      <div v-if="loading" class="flex justify-center py-8">
        <ULoader />
      </div>

      <div v-else-if="history.length === 0" class="text-center py-8 text-muted">No hay cambios registrados</div>

      <UTable
        v-else
        :data="history"
        :columns="[
          { accessorKey: 'changed_at', header: 'Fecha' },
          { accessorKey: 'action', header: 'Acción' },
          { accessorKey: 'old_data', header: 'Anterior' },
          { accessorKey: 'new_data', header: 'Nuevo' },
          { accessorKey: 'variation', header: 'Variación' },
          { accessorKey: 'user', header: 'Usuario' }
        ]"
      >
        <template #changed_at-cell="{ row }">
          <span class="text-sm">{{ formatDate(row.original.changed_at) }}</span>
        </template>

        <template #action-cell="{ row }">
          <UBadge
            :label="getActionLabel(row.original.action)"
            :color="getActionColor(row.original.action) as any"
            variant="soft"
            size="xs"
          />
        </template>

        <template #old_data-cell="{ row }">
          <span class="text-sm font-mono">
            {{ formatPrice(row.original.old_data) }}
          </span>
        </template>

        <template #new_data-cell="{ row }">
          <span class="text-sm font-mono font-semibold">
            {{ formatPrice(row.original.new_data) }}
          </span>
        </template>

        <template #variation-cell="{ row }">
          <template v-if="row.original.action === 'UPDATE'">
            <span
              v-if="calcVariation(row.original.old_data, row.original.new_data) !== null"
              class="text-sm font-medium"
              :class="getVariationColor(calcVariation(row.original.old_data, row.original.new_data))"
            >
              {{ calcVariation(row.original.old_data, row.original.new_data) > 0 ? '+' : ''
              }}{{ calcVariation(row.original.old_data, row.original.new_data)?.toFixed(1) }}%
            </span>
            <span v-else class="text-sm text-muted">—</span>
          </template>
          <span v-else class="text-sm text-muted">—</span>
        </template>

        <template #user-cell="{ row }">
          <span class="text-sm">
            {{ row.original.user?.name ?? 'Sistema' }}
          </span>
        </template>
      </UTable>
    </template>
  </UModal>
</template>
