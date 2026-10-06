<script setup lang="ts">
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Fabricar productos' })

const productsStore = useProductsStore()
const depositsStore = useDepositosStore()
const toast = useToast()
const productId = ref('')
const quantity = ref(1)
const materialWarehouseId = ref('')
const outputWarehouseId = ref('')
const preview = ref<any>()
const previewing = ref(false)
const producing = ref(false)

const productOptions = computed(() => productsStore.items
  .filter(product => product.active !== false && (['BOM', 'ENGINEERING'].includes(product.cost_source) || product.is_composed))
  .map(product => ({ label: `${product.sku ? `${product.sku} · ` : ''}${product.name}`, value: product.id })))
const warehouseOptions = computed(() => depositsStore.warehouses
  .filter(warehouse => warehouse.active && !warehouse.is_virtual)
  .map(warehouse => ({ label: `${warehouse.code ? `${warehouse.code} · ` : ''}${warehouse.name}`, value: warehouse.id })))
const selectedProduct = computed(() => productsStore.items.find(product => product.id === productId.value))
const ready = computed(() => Boolean(productId.value && materialWarehouseId.value && outputWarehouseId.value && quantity.value > 0))

onMounted(async () => {
  await Promise.all([productsStore.fetchAll(), depositsStore.fetchAll()])
  if (warehouseOptions.value.length === 1) {
    materialWarehouseId.value = warehouseOptions.value[0]!.value
    outputWarehouseId.value = warehouseOptions.value[0]!.value
  }
})

watch([productId, quantity, materialWarehouseId, outputWarehouseId], () => { preview.value = undefined })

async function calculate() {
  if (!ready.value) return
  previewing.value = true
  try {
    preview.value = await $fetch('/api/backend/warehouse/stock/production/preview', {
      method: 'POST',
      body: {
        product_id: productId.value,
        quantity: Number(quantity.value),
        material_warehouse_id: materialWarehouseId.value,
        output_warehouse_id: outputWarehouseId.value
      }
    })
  } catch (error: any) {
    toast.add({ title: 'No se pudo preparar la fabricación', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    previewing.value = false
  }
}

async function produce() {
  if (!preview.value?.can_produce) return
  producing.value = true
  try {
    await $fetch('/api/backend/warehouse/stock/production/execute', {
      method: 'POST',
      body: {
        product_id: productId.value,
        quantity: Number(quantity.value),
        material_warehouse_id: materialWarehouseId.value,
        output_warehouse_id: outputWarehouseId.value
      }
    })
    toast.add({ title: 'Fabricación registrada', description: `Se fabricaron ${quantity.value} unidades de ${selectedProduct.value?.name}.`, color: 'success' })
    quantity.value = 1
    preview.value = undefined
  } catch (error: any) {
    toast.add({ title: 'No se pudo registrar la fabricación', description: error?.data?.message || error?.message, color: 'error' })
    await calculate()
  } finally {
    producing.value = false
  }
}

const formatQuantity = (value: number) => Number(value).toLocaleString('es-AR', { maximumFractionDigits: 3 })
</script>

<template>
  <div class="flex h-full flex-col">
    <AppPageHeader title="Fabricar productos" description="Registrá una fabricación y actualizá el stock en un solo paso" show-module-toggle class="sticky top-0 z-20 border-b border-default bg-default px-4" />
    <UPage>
      <UPageBody class="mx-auto w-full max-w-6xl space-y-5">
        <UCard>
          <template #header>
            <div class="flex items-start gap-3">
              <div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-factory" class="size-6" /></div>
              <div><h2 class="font-semibold">Nueva fabricación</h2><p class="text-sm text-muted">Elegí qué producto fabricar y dónde se moverá el stock.</p></div>
            </div>
          </template>

          <div class="grid gap-5 md:grid-cols-2">
            <UFormField label="Producto a fabricar" description="Solo se muestran productos terminados e intermedios." required>
              <USelectMenu v-model="productId" value-key="value" :items="productOptions" searchable placeholder="Buscar producto por nombre o SKU" class="w-full" />
            </UFormField>
            <UFormField label="Cantidad" description="Unidades de producto terminado que ingresarán." required>
              <UInputNumber v-model="quantity" :min="0.001" :step="1" class="w-full" />
            </UFormField>
            <UFormField label="Depósito de materiales" description="De aquí se descontarán las materias primas." required>
              <USelect v-model="materialWarehouseId" :items="warehouseOptions" placeholder="Seleccionar depósito" class="w-full" />
            </UFormField>
            <UFormField label="Depósito de producto terminado" description="Aquí ingresará la cantidad fabricada." required>
              <USelect v-model="outputWarehouseId" :items="warehouseOptions" placeholder="Seleccionar depósito" class="w-full" />
            </UFormField>
          </div>

          <div class="mt-6 flex justify-end">
            <UButton label="Ver materiales necesarios" icon="i-lucide-calculator" :disabled="!ready" :loading="previewing" @click="calculate" />
          </div>
        </UCard>

        <UCard v-if="preview">
          <template #header>
            <UAlert :color="preview.can_produce ? 'success' : 'error'" variant="soft" :icon="preview.can_produce ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'" :title="preview.can_produce ? 'Todo listo para fabricar' : 'Faltan materiales'" :description="preview.can_produce ? 'Revisá el consumo y confirmá la operación.' : 'No se realizará ningún movimiento hasta disponer del stock necesario.'" />
          </template>
          <div class="divide-y divide-default overflow-hidden rounded-lg border border-default">
            <div v-for="material in preview.materials" :key="material.product_id" class="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_130px] sm:items-center">
              <div class="min-w-0"><p class="truncate font-medium">{{ material.name }}</p><p class="text-xs text-muted">{{ material.sku || 'Sin SKU' }}</p></div>
              <div><p class="text-xs text-muted">Necesario</p><p class="font-semibold">{{ formatQuantity(material.quantity) }}</p></div>
              <div><p class="text-xs text-muted">Disponible</p><p class="font-semibold">{{ formatQuantity(material.available) }}</p></div>
              <UBadge :color="material.sufficient ? 'success' : 'error'" variant="soft" :label="material.sufficient ? 'Disponible' : `Faltan ${formatQuantity(material.missing)}`" />
            </div>
          </div>
          <template #footer><div class="flex justify-end"><UButton label="Confirmar fabricación" icon="i-lucide-factory" color="success" :disabled="!preview.can_produce" :loading="producing" @click="produce" /></div></template>
        </UCard>
      </UPageBody>
    </UPage>
  </div>
</template>
