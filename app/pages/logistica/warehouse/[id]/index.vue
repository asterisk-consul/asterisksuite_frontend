<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useStockStore } from '~/modulos/logistica/warehouses/stock/stock.store'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'
import { useLocationsStore } from '~/modulos/logistica/master-data/locations/store/locations.store'
import { warehouseFormFields } from '~/modulos/logistica/warehouses/warehouse/warehouseFormFields'
import ModalForm from '~/components/ModalForm.vue'
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const warehouseId = computed(() => route.params.id as string)

const depositosStore = useDepositosStore()
const stockStore = useStockStore()
const unitsStore = useUnitsStore()
const locationsStore = useLocationsStore()

const { current: warehouse, loading: warehouseLoading } = storeToRefs(depositosStore)
const { stock, loading: stockLoading } = storeToRefs(stockStore)
const { items: units } = storeToRefs(unitsStore)
const { items: locations } = storeToRefs(locationsStore)

const { items: locationItems } = useLocations(locations)

// Edit modal
const editModalOpen = ref(false)
const editRow = ref<any>(null)

const unitOptions = computed(() =>
  units.value
    .filter((u) => u.active)
    .map((u) => ({
      label: `${u.name} (${u.symbol})`,
      value: u.id
    }))
)

const fields = computed(() =>
  warehouseFormFields.map((field) => {
    if (field.name === 'locationId') {
      return { ...field, options: locationItems.value, disabled: locationItems.value.length === 0 }
    }
    if (field.name === 'unitId') {
      return { ...field, options: unitOptions.value, disabled: unitOptions.value.length === 0 }
    }
    return field
  })
)

function openEdit() {
  if (!warehouse.value) return
  editRow.value = {
    ...warehouse.value,
    locationId: warehouse.value.locationId ?? (warehouse.value as any).locations?.id ?? null,
    unitId: warehouse.value.unitId ?? (warehouse.value as any).units?.id ?? null
  }
  editModalOpen.value = true
}

async function handleEditSubmit(data: any) {
  await depositosStore.updateWarehouse(warehouseId.value, {
    name: data.name,
    code: data.code,
    locationId: data.locationId,
    unitId: data.unitId,
    active: data.active
  })
  await depositosStore.fetchById(warehouseId.value)
  editModalOpen.value = false
}

// Stock summary
const totalStock = computed(() =>
  stock.value.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
)

const totalReserved = computed(() =>
  stock.value.reduce((sum, item) => sum + parseFloat(item.reserved_quantity), 0)
)

const totalAvailable = computed(() => totalStock.value - totalReserved.value)

const unitSymbol = computed(() => warehouse.value?.units?.symbol ?? '')

onMounted(async () => {
  await Promise.all([
    depositosStore.fetchById(warehouseId.value),
    stockStore.fetchStock(warehouseId.value),
    unitsStore.fetchAll(),
    locationsStore.fetchAll()
  ])
})

const links = ref<ButtonProps[]>([
  {
    label: 'Editar',
    icon: 'i-heroicons-pencil',
    onClick: openEdit,
    color: 'neutral',
    variant: 'outline'
  }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/logistica/warehouse"
          size="sm"
        />
        <div v-if="warehouse">
          <h1 class="text-xl font-bold">{{ warehouse.name }}</h1>
          <p class="text-sm text-muted">
            {{ warehouse.code || 'Sin código' }}
            <span v-if="(warehouse as any).units"> · {{ (warehouse as any).units.symbol }}</span>
            <span v-if="(warehouse as any).locations">
              · {{ (warehouse as any).locations.address || '' }} {{ (warehouse as any).locations.city || '' }}
            </span>
          </p>
        </div>
        <div v-else-if="warehouseLoading">
          <USkeleton class="h-6 w-48" />
        </div>
      </div>

      <div v-if="warehouse">
        <UPageHeader
          :title="''"
          :links="links"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="stockLoading" class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
        <USkeleton class="h-24" />
      </div>
      <USkeleton class="h-64" />
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-3 gap-4">
        <UCard>
          <div class="text-sm text-muted">Stock Total</div>
          <div class="text-2xl font-bold">
            {{ totalStock.toFixed(2) }}
            <span v-if="unitSymbol" class="text-sm font-normal text-muted">{{ unitSymbol }}</span>
          </div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Reservado</div>
          <div class="text-2xl font-bold text-amber-600">
            {{ totalReserved.toFixed(2) }}
            <span v-if="unitSymbol" class="text-sm font-normal text-muted">{{ unitSymbol }}</span>
          </div>
        </UCard>
        <UCard>
          <div class="text-sm text-muted">Disponible</div>
          <div class="text-2xl font-bold text-green-600">
            {{ totalAvailable.toFixed(2) }}
            <span v-if="unitSymbol" class="text-sm font-normal text-muted">{{ unitSymbol }}</span>
          </div>
        </UCard>
      </div>

      <!-- Stock Table -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Productos en este depósito</h3>
            <span class="text-sm text-muted">{{ stock.length }} producto{{ stock.length !== 1 ? 's' : '' }}</span>
          </div>
        </template>

        <div v-if="stock.length === 0" class="text-center py-8 text-muted">
          <p>Este depósito no tiene stock registrado.</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="item in stock"
            :key="item.id"
            class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          >
            <div class="flex-1">
              <NuxtLink
                :to="`/productos/${item.products.id}`"
                class="font-medium hover:text-primary hover:underline"
              >
                {{ item.products.name }}
              </NuxtLink>
              <span v-if="item.products.sku" class="text-sm text-muted ml-2">
                ({{ item.products.sku }})
              </span>
            </div>

            <div class="flex items-center gap-6">
              <div class="text-right min-w-[80px]">
                <div class="text-xs text-muted">Stock</div>
                <div class="font-semibold">{{ parseFloat(item.quantity).toFixed(2) }}</div>
              </div>
              <div class="text-right min-w-[80px]">
                <div class="text-xs text-muted">Reservado</div>
                <div class="font-semibold text-amber-600">{{ parseFloat(item.reserved_quantity).toFixed(2) }}</div>
              </div>
              <div class="text-right min-w-[80px]">
                <div class="text-xs text-muted">Disponible</div>
                <div class="font-semibold text-green-600">
                  {{ (parseFloat(item.quantity) - parseFloat(item.reserved_quantity)).toFixed(2) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>

    <!-- Edit Modal -->
    <ModalForm
      v-model:open="editModalOpen"
      :fields="fields"
      title="Editar Depósito"
      :initial-values="editRow"
      @submit="handleEditSubmit"
    />
  </div>
</template>
