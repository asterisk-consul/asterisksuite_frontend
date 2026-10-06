<script setup lang="ts">
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'

const props = defineProps<{ open: boolean; productId: string; productName?: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; completed: [result: any] }>()

const depositsStore = useDepositosStore()
const { warehouses, loading: loadingWarehouses } = storeToRefs(depositsStore)
const toast = useToast()
const warehouseId = ref('')
const quantity = ref(1)
const preview = ref<any | null>(null)
const loadingPreview = ref(false)
const producing = ref(false)

const warehouseOptions = computed(() => warehouses.value
  .filter(warehouse => warehouse.active)
  .map(warehouse => ({ label: `${warehouse.code ? `${warehouse.code} · ` : ''}${warehouse.name}`, value: warehouse.id })))

const canPreview = computed(() => !!warehouseId.value && Number(quantity.value) > 0)

const loadPreview = async () => {
  if (!canPreview.value) return
  loadingPreview.value = true
  try {
    preview.value = await $fetch('/api/backend/warehouse/stock/production/preview', {
      method: 'POST',
      body: { product_id: props.productId, warehouse_id: warehouseId.value, quantity: Number(quantity.value) }
    })
  } catch (err: any) {
    preview.value = null
    toast.add({ title: 'No se pudo calcular la fabricación', description: err?.data?.message || err?.message, color: 'error' })
  } finally {
    loadingPreview.value = false
  }
}

const execute = async () => {
  if (!preview.value?.can_produce) return
  producing.value = true
  try {
    const result = await $fetch('/api/backend/warehouse/stock/production/execute', {
      method: 'POST',
      body: { product_id: props.productId, warehouse_id: warehouseId.value, quantity: Number(quantity.value) }
    })
    toast.add({
      title: 'Fabricación registrada',
      description: `Ingresaron ${quantity.value} unidades de ${props.productName ?? 'producto terminado'}.`,
      color: 'success'
    })
    emit('completed', result)
    emit('update:open', false)
  } catch (err: any) {
    toast.add({ title: 'No se pudo fabricar', description: err?.data?.message || err?.message, color: 'error' })
    await loadPreview()
  } finally {
    producing.value = false
  }
}

watch(() => props.open, async open => {
  if (!open) return
  preview.value = null
  quantity.value = 1
  if (!warehouses.value.length) await depositsStore.fetchAll()
  if (warehouseOptions.value.length === 1) warehouseId.value = warehouseOptions.value[0]!.value
})

watch([warehouseId, quantity], () => { preview.value = null })

const formatQuantity = (value: number) => Number(value).toLocaleString('es-AR', { maximumFractionDigits: 3 })
</script>

<template>
  <UModal :open="open" title="Fabricar producto" :ui="{ width: 'max-w-4xl' }" @update:open="emit('update:open', $event)">
    <template #body>
      <div class="space-y-5">
        <div class="rounded-lg border border-default bg-elevated/40 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Producto terminado</p>
          <p class="mt-1 text-lg font-semibold">{{ productName }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Cantidad a fabricar" required description="Cantidad de producto terminado que ingresará al stock.">
            <UInputNumber v-model="quantity" :min="0.001" :step="1" class="w-full" />
          </UFormField>
          <UFormField label="Depósito" required description="De aquí salen los materiales y aquí ingresa el terminado.">
            <USelect v-model="warehouseId" :items="warehouseOptions" :loading="loadingWarehouses" placeholder="Seleccionar depósito" class="w-full" />
          </UFormField>
        </div>

        <div v-if="!preview" class="rounded-lg border border-dashed border-default py-8 text-center">
          <UIcon name="i-lucide-factory" class="mx-auto size-8 text-muted" />
          <p class="mt-2 text-sm font-medium">Calculá los materiales antes de confirmar</p>
          <p class="text-xs text-muted">No se modificará stock durante esta verificación.</p>
          <UButton class="mt-4" label="Ver materiales necesarios" icon="i-lucide-calculator" variant="soft" :disabled="!canPreview" :loading="loadingPreview" @click="loadPreview" />
        </div>

        <template v-else>
          <UAlert
            :color="preview.can_produce ? 'success' : 'error'"
            variant="soft"
            :icon="preview.can_produce ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'"
            :title="preview.can_produce ? 'Stock suficiente para fabricar' : 'Faltan materiales'"
            :description="preview.can_produce ? 'Al confirmar se descontarán los materiales y se ingresará el producto terminado.' : 'No se realizará ningún movimiento hasta contar con todo el stock.'"
          />
          <div class="overflow-hidden rounded-lg border border-default">
            <div v-for="material in preview.materials" :key="material.product_id" class="grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(80px,110px))] items-center gap-3 border-b border-default px-4 py-3 last:border-b-0">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ material.name }}</p>
                <p class="text-xs font-mono text-muted">{{ material.sku || 'Sin SKU' }}</p>
              </div>
              <div class="text-right"><p class="text-[10px] uppercase text-muted">Necesario</p><p class="text-sm font-semibold">{{ formatQuantity(material.quantity) }}</p></div>
              <div class="text-right"><p class="text-[10px] uppercase text-muted">Disponible</p><p class="text-sm font-semibold">{{ formatQuantity(material.available) }}</p></div>
              <div class="text-right">
                <UBadge :color="material.sufficient ? 'success' : 'error'" variant="soft" size="sm">
                  {{ material.sufficient ? 'Disponible' : `Faltan ${formatQuantity(material.missing)}` }}
                </UBadge>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <p class="text-xs text-muted">Los consumos y el ingreso quedan vinculados por una misma referencia de fabricación.</p>
        <div class="flex gap-2">
          <UButton label="Cancelar" variant="ghost" color="neutral" @click="emit('update:open', false)" />
          <UButton label="Confirmar fabricación" icon="i-lucide-factory" :loading="producing" :disabled="!preview?.can_produce" @click="execute" />
        </div>
      </div>
    </template>
  </UModal>
</template>
