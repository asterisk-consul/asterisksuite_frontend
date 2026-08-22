<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useProductSuppliersStore } from '~/modulos/erp/pricing/stores/product-suppliers.store'
import SupplierFormModal from '~/modulos/erp/pricing/components/SupplierFormModal.vue'

const props = defineProps<{
  productId: string
}>()

const toast = useToast()
const store = useProductSuppliersStore()
const { items: suppliers, loading } = storeToRefs(store)

const showModal = ref(false)
const editMode = ref(false)
const editingSupplier = ref<any>(null)

onMounted(async () => {
  if (props.productId) {
    await store.fetchAll(props.productId)
  }
})

function openAdd() {
  editMode.value = false
  editingSupplier.value = null
  showModal.value = true
}

function openEdit(supplier: any) {
  editMode.value = true
  editingSupplier.value = { ...supplier }
  showModal.value = true
}

async function handleSave(data: any) {
  try {
    if (editMode.value && editingSupplier.value) {
      await store.update(editingSupplier.value.id, data)
      toast.add({ title: 'Proveedor actualizado', color: 'success' })
    } else {
      await store.create({ ...data, product_id: props.productId })
      toast.add({ title: 'Proveedor agregado', color: 'success' })
    }
    showModal.value = false
  } catch (err: any) {
    toast.add({
      title: 'Error',
      color: 'error',
      description: err?.data?.message || err?.message || 'Error'
    })
  }
}

async function handleDelete(supplier: any) {
  try {
    await store.remove(supplier.id)
    toast.add({ title: 'Proveedor eliminado', color: 'success' })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      color: 'error',
      description: err?.data?.message || 'Error'
    })
  }
}

async function togglePrimary(supplier: any) {
  try {
    await store.update(supplier.id, { is_primary: !supplier.is_primary })
    await store.fetchAll(props.productId)
  } catch (err: any) {
    toast.add({
      title: 'Error',
      color: 'error',
      description: err?.data?.message || 'Error'
    })
  }
}
</script>

<template>
  <div class="space-y-4 p-1">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold">
        Proveedores
        <span v-if="suppliers.length" class="text-muted font-normal">({{ suppliers.length }})</span>
      </h3>
      <UButton
        size="xs"
        variant="outline"
        icon="i-heroicons-plus"
        @click="openAdd"
      >
        Agregar proveedor
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-4">
      <UProgress />
    </div>

    <!-- Empty state -->
    <div v-else-if="suppliers.length === 0" class="text-center py-8 text-muted">
      <p class="text-sm">Este producto no tiene proveedores asociados.</p>
      <UButton
        size="xs"
        variant="outline"
        icon="i-heroicons-plus"
        class="mt-3"
        @click="openAdd"
      >
        Agregar primer proveedor
      </UButton>
    </div>

    <!-- Suppliers table -->
    <div v-else class="space-y-2">
      <div
        v-for="supplier in suppliers"
        :key="supplier.id"
        class="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <div class="flex items-center gap-3">
          <UButton
            :icon="supplier.is_primary ? 'i-lucide-star' : 'i-lucide-star-off'"
            :color="supplier.is_primary ? 'amber' : 'neutral'"
            variant="ghost"
            size="xs"
            :title="supplier.is_primary ? 'Proveedor principal' : 'Marcar como principal'"
            @click="togglePrimary(supplier)"
          />
          <div>
            <div class="font-medium text-sm">
              {{ supplier.business_parties?.name || 'Sin nombre' }}
            </div>
            <div class="text-xs text-muted">
              {{ supplier.currencies?.symbol || '' }}
              {{ parseFloat(supplier.purchase_price).toFixed(2) }}
              <span v-if="supplier.is_primary" class="ml-2 text-amber-600 font-medium">Principal</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-pencil"
            variant="ghost"
            size="xs"
            color="neutral"
            @click="openEdit(supplier)"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            size="xs"
            color="error"
            @click="handleDelete(supplier)"
          />
        </div>
      </div>
    </div>

    <!-- Modal -->
    <SupplierFormModal
      v-model:open="showModal"
      :product-id="productId"
      :supplier="editingSupplier"
      :is-edit="editMode"
      @submit="handleSave"
    />
  </div>
</template>
