<script setup lang="ts">
import { useProductStock } from '../composables/useProductStock'
import AddStockModal from './AddStockModal.vue'
import TransferStockModal from './TransferStockModal.vue'
import RemoveStockModal from './RemoveStockModal.vue'

const props = defineProps<{
  productId: string
}>()

const productStock = useProductStock(props.productId)

const showAddModal = ref(false)
const showTransferModal = ref(false)
const showRemoveModal = ref(false)
const selectedWarehouse = ref<any>(null)

// Filtro por depósito
const selectedWarehouseIds = ref<string[]>([])

const warehouseFilterOptions = computed(() =>
  productStock.warehousesWithStock.value.map((item) => ({
    label: item.warehouse?.name || 'Depósito',
    value: item.warehouse_id
  }))
)

const filteredStock = computed(() => {
  if (selectedWarehouseIds.value.length === 0) {
    return productStock.warehousesWithStock.value
  }
  return productStock.warehousesWithStock.value.filter((item) =>
    selectedWarehouseIds.value.includes(item.warehouse_id)
  )
})

// Totales filtrados
const filteredTotalStock = computed(() =>
  filteredStock.value.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
)

const filteredTotalReserved = computed(() =>
  filteredStock.value.reduce((sum, item) => sum + parseFloat(item.reserved_quantity), 0)
)

const filteredTotalAvailable = computed(() => filteredTotalStock.value - filteredTotalReserved.value)

onMounted(async () => {
  await productStock.init()
})

const handleAdd = async (warehouseId: string, quantity: string) => {
  await productStock.addStock(warehouseId, quantity)
  showAddModal.value = false
}

const handleTransfer = async (data: { from_warehouse_id: string; to_warehouse_id: string; quantity: string }) => {
  await productStock.transferStock(data)
  showTransferModal.value = false
  selectedWarehouse.value = null
}

const handleRemove = async () => {
  if (selectedWarehouse.value) {
    await productStock.removeStock(selectedWarehouse.value.warehouse_id)
  }
  showRemoveModal.value = false
  selectedWarehouse.value = null
}

const openTransfer = (item: any) => {
  selectedWarehouse.value = item
  showTransferModal.value = true
}

const openRemove = (item: any) => {
  selectedWarehouse.value = item
  showRemoveModal.value = true
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary -->
    <div class="grid grid-cols-3 gap-4">
      <UCard>
        <div class="text-sm text-muted">Stock Total</div>
        <div class="text-2xl font-bold">
          {{ (selectedWarehouseIds.length > 0 ? filteredTotalStock : productStock.totalStock.value).toFixed(2) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Reservado</div>
        <div class="text-2xl font-bold text-amber-600">
          {{ (selectedWarehouseIds.length > 0 ? filteredTotalReserved : productStock.totalReserved.value).toFixed(2) }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-muted">Disponible</div>
        <div class="text-2xl font-bold text-green-600">
          {{ (selectedWarehouseIds.length > 0 ? filteredTotalAvailable : productStock.totalAvailable.value).toFixed(2) }}
        </div>
      </UCard>
    </div>

    <!-- Header + Filtro -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1">
        <h3 class="text-sm font-semibold">Stock por depósito</h3>
        <USelectMenu
          v-model="selectedWarehouseIds"
          :items="warehouseFilterOptions"
          placeholder="Filtrar por depósito"
          multiple
          searchable
          class="w-64"
        />
      </div>
      <UButton
        size="sm"
        variant="outline"
        icon="i-heroicons-plus"
        @click="showAddModal = true"
      >
        Agregar a depósito
      </UButton>
    </div>

    <!-- Stock table -->
    <div v-if="productStock.loading.value" class="flex justify-center py-8">
      <UProgress />
    </div>

    <div v-else-if="productStock.warehousesWithStock.value.length === 0" class="text-center py-8 text-muted">
      <p>Este producto no tiene stock en ningún depósito.</p>
      <UButton
        size="sm"
        variant="outline"
        icon="i-heroicons-plus"
        class="mt-4"
        @click="showAddModal = true"
      >
        Agregar a depósito
      </UButton>
    </div>

    <div v-else-if="filteredStock.length === 0" class="text-center py-8 text-muted">
      <p>No hay stock en los depósitos seleccionados.</p>
    </div>

    <div v-else class="space-y-2">
      <UCard
        v-for="item in filteredStock"
        :key="item.id"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div>
              <NuxtLink
                :to="`/productos/warehouses/${item.warehouse_id}`"
                class="font-medium hover:text-primary hover:underline"
              >
                {{ item.warehouse?.name || 'Depósito' }}
              </NuxtLink>
              <div class="text-sm text-muted">
                {{ item.warehouse?.code || '—' }}
                <span v-if="item.warehouse?.units">
                  · {{ item.warehouse.units.symbol }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="text-right">
              <div class="text-sm text-muted">Stock</div>
              <div class="font-semibold">{{ parseFloat(item.quantity).toFixed(2) }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-muted">Reservado</div>
              <div class="font-semibold text-amber-600">{{ parseFloat(item.reserved_quantity).toFixed(2) }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-muted">Disponible</div>
              <div class="font-semibold text-green-600">
                {{ (parseFloat(item.quantity) - parseFloat(item.reserved_quantity)).toFixed(2) }}
              </div>
            </div>

            <div class="flex gap-1">
              <UButton
                icon="i-lucide-arrow-right-left"
                variant="ghost"
                size="sm"
                color="neutral"
                @click="openTransfer(item)"
              />
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                size="sm"
                color="error"
                @click="openRemove(item)"
              />
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Modals -->
    <AddStockModal
      v-model:open="showAddModal"
      :product-id="productId"
      :available-warehouses="productStock.availableWarehouses.value"
      @submit="handleAdd"
    />

    <TransferStockModal
      v-model:open="showTransferModal"
      :product-id="productId"
      :source-warehouse="selectedWarehouse"
      :warehouses="productStock.warehouses.value"
      @submit="handleTransfer"
    />

    <RemoveStockModal
      v-model:open="showRemoveModal"
      :stock-item="selectedWarehouse"
      @confirm="handleRemove"
    />
  </div>
</template>
