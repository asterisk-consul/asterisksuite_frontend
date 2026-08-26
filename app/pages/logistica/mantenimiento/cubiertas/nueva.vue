<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'

const router = useRouter()
const store = useMaintenanceStore()
const toast = useToast()

const saving = ref(false)

// --- FORM (must be declared before computed/watch) ---
const form = reactive({
  product_id: '',
  serial_number: '',
  purchase_date: '',
  purchase_supplier_id: '',
  purchase_unit_cost: null as number | null,
  current_warehouse_id: '',
})

// --- PRODUCTS ---
const products = ref<any[]>([])
const loadingProducts = ref(false)
const selectedProduct = ref<any>(null)

const productItems = computed(() =>
  products.value
    .filter((p: any) => p.usage_type === 'PURCHASE' || p.usage_type === 'BOTH')
    .map((p: any) => ({
      value: p.id,
      label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
    }))
)

watch(selectedProduct, (val) => {
  form.product_id = val?.value ?? ''
})

// --- SUPPLIERS ---
const suppliers = ref<any[]>([])
const loadingSuppliers = ref(false)
const selectedSupplier = ref<any>(null)

const supplierItems = computed(() =>
  suppliers.value.map((s: any) => ({
    value: s.id,
    label: s.business_names ? `${s.business_names} — ${s.name}` : s.name,
    sublabel: s.tax_id || '',
  }))
)

watch(selectedSupplier, (val) => {
  form.purchase_supplier_id = val?.value ?? ''
})

// --- WAREHOUSES ---
const warehouses = ref<any[]>([])
const loadingWarehouses = ref(false)
const selectedWarehouse = ref<any>(null)

const warehouseItems = computed(() =>
  warehouses.value.map((w: any) => ({
    value: w.id,
    label: w.code ? `${w.name} (${w.code})` : w.name,
  }))
)

watch(selectedWarehouse, (val) => {
  form.current_warehouse_id = val?.value ?? ''
})

// --- FETCH DATA ---
async function fetchProducts() {
  loadingProducts.value = true
  try {
    const data = await $fetch<any[]>('/api/logistica/master-data/products')
    products.value = data
  } catch { /* silently fail */ } finally {
    loadingProducts.value = false
  }
}

async function fetchSuppliers() {
  loadingSuppliers.value = true
  try {
    const data = await $fetch<any[]>('/api/logistica/master-data/business-parties', {
      params: { type: 'SUPPLIER' },
    })
    suppliers.value = data
  } catch { /* silently fail */ } finally {
    loadingSuppliers.value = false
  }
}

async function fetchWarehouses() {
  loadingWarehouses.value = true
  try {
    const data = await $fetch<any[]>('/api/logistica/warehouse/warehouses')
    warehouses.value = data.filter((w: any) => w.active !== false)
  } catch { /* silently fail */ } finally {
    loadingWarehouses.value = false
  }
}

onMounted(() => {
  fetchProducts()
  fetchSuppliers()
  fetchWarehouses()
})

// --- SUBMIT ---
async function handleSubmit() {
  if (!form.product_id || !form.serial_number) {
    toast.add({ title: 'Producto y número de serie son requeridos', color: 'error' })
    return
  }

  try {
    saving.value = true
    const created = await store.createTire({
      product_id: form.product_id,
      serial_number: form.serial_number,
      purchase_date: form.purchase_date || undefined,
      purchase_supplier_id: form.purchase_supplier_id || undefined,
      purchase_unit_cost: form.purchase_unit_cost ?? undefined,
      current_warehouse_id: form.current_warehouse_id || undefined,
    })
    toast.add({ title: 'Cubierta creada', color: 'success' })
    router.push(`/logistica/mantenimiento/cubiertas/${created.id}`)
  } catch (err: any) {
    toast.add({ title: 'Error al crear cubierta', color: 'error', description: store.error })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage>
    <AppPageHeader
      title="Nueva Cubierta"
      description="Registrar una nueva cubierta en el sistema"
    />

    <UCard class="mt-4">
      <UForm :state="form" class="space-y-6" @submit="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Producto (Modelo de Cubierta)" required>
            <USelectMenu
              v-model="selectedProduct"
              :items="productItems"
              placeholder="Buscar producto..."
              searchable
              clear
              :loading="loadingProducts"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Número de Serie" required>
            <UInput v-model="form.serial_number" placeholder="Ej: CUB-001234" class="w-full" />
          </UFormField>

          <UFormField label="Proveedor">
            <USelectMenu
              v-model="selectedSupplier"
              :items="supplierItems"
              placeholder="Buscar proveedor..."
              searchable
              clear
              :loading="loadingSuppliers"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Fecha de Compra">
            <UInput v-model="form.purchase_date" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Costo Unitario">
            <UInput v-model.number="form.purchase_unit_cost" type="number" placeholder="0.00" class="w-full" />
          </UFormField>

          <UFormField label="Depósito">
            <USelectMenu
              v-model="selectedWarehouse"
              :items="warehouseItems"
              placeholder="Buscar depósito..."
              searchable
              clear
              :loading="loadingWarehouses"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-3">
          <UButton label="Cancelar" variant="outline" @click="router.back()" />
          <UButton label="Crear Cubierta" type="submit" :loading="saving" color="primary" />
        </div>
      </UForm>
    </UCard>
  </UPage>
</template>
