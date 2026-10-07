<script setup lang="ts">
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'

type Policy = {
  id: string
  product_id: string
  warehouse_id: string
  preferred_supplier_id?: string | null
  reorder_point: string | number
  target_stock: string | number
  lead_time_days: number
  active: boolean
  warehouse: { id: string; name: string; code?: string | null; active: boolean }
}

const props = defineProps<{ productId: string; canConfigure?: boolean }>()
const depositsStore = useDepositosStore()
const { warehouses } = storeToRefs(depositsStore)
const toast = useToast()
const policies = ref<Policy[]>([])
const suppliers = ref<Array<{ supplier_id: string; business_parties?: { name: string } }>>([])
const loading = ref(false)
const saving = ref(false)
const open = ref(false)
const expanded = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ warehouse_id: '', preferred_supplier_id: '', reorder_point: 0, target_stock: 0, lead_time_days: 0, active: true })

const warehouseOptions = computed(() => warehouses.value
  .filter(warehouse => warehouse.active && !warehouse.is_virtual)
  .map(warehouse => ({ label: `${warehouse.code ? `${warehouse.code} · ` : ''}${warehouse.name}`, value: warehouse.id })))
const supplierOptions = computed(() => suppliers.value.map(supplier => ({
  label: supplier.business_parties?.name || 'Proveedor sin nombre',
  value: supplier.supplier_id
})))

async function load() {
  loading.value = true
  try {
    policies.value = await $fetch<Policy[]>(`/api/backend/warehouse/replenishment/policies/product/${props.productId}`)
  } finally {
    loading.value = false
  }
}

function createPolicy() {
  editingId.value = null
  Object.assign(form, { warehouse_id: '', preferred_supplier_id: '', reorder_point: 0, target_stock: 0, lead_time_days: 0, active: true })
  open.value = true
}

function editPolicy(policy: Policy) {
  editingId.value = policy.id
  Object.assign(form, {
    warehouse_id: policy.warehouse_id,
    preferred_supplier_id: policy.preferred_supplier_id || '',
    reorder_point: Number(policy.reorder_point),
    target_stock: Number(policy.target_stock),
    lead_time_days: policy.lead_time_days,
    active: policy.active
  })
  open.value = true
}

async function save() {
  if (!form.warehouse_id) return
  if (form.target_stock < form.reorder_point) {
    toast.add({ title: 'Revisá las cantidades', description: 'El stock objetivo debe ser igual o mayor al punto de reposición.', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const body = { product_id: props.productId, ...form, preferred_supplier_id: form.preferred_supplier_id || null }
    await $fetch(editingId.value
      ? `/api/backend/warehouse/replenishment/policies/${editingId.value}`
      : '/api/backend/warehouse/replenishment/policies', {
      method: editingId.value ? 'PATCH' : 'POST',
      body
    })
    open.value = false
    await load()
    toast.add({ title: editingId.value ? 'Política actualizada' : 'Política creada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(policy: Policy) {
  try {
    await $fetch(`/api/backend/warehouse/replenishment/policies/${policy.id}`, { method: 'DELETE' })
    await load()
    toast.add({ title: 'Política eliminada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo eliminar', description: error?.data?.message || error?.message, color: 'error' })
  }
}

onMounted(async () => {
  await Promise.all([
    load(),
    warehouses.value.length ? Promise.resolve() : depositsStore.fetchAll(),
    $fetch<Array<{ supplier_id: string; business_parties?: { name: string } }>>('/api/pricing/product-suppliers', { query: { product_id: props.productId } }).then(result => { suppliers.value = result })
  ])
})
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-default bg-muted/20">
    <button type="button" class="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40" @click="expanded = !expanded">
      <div>
        <div class="flex items-center gap-2">
          <p class="font-medium">Política de reposición</p>
          <UBadge color="neutral" variant="subtle">{{ policies.length }} {{ policies.length === 1 ? 'depósito' : 'depósitos' }}</UBadge>
        </div>
        <p class="mt-1 text-sm text-muted">Definí cuándo advertir y hasta qué cantidad conviene reponer.</p>
      </div>
      <UIcon name="i-lucide-chevron-down" class="size-5 text-muted transition-transform" :class="{ 'rotate-180': expanded }" />
    </button>

    <div v-if="expanded" class="space-y-3 border-t border-default p-4">
      <div v-if="canConfigure" class="flex justify-end">
        <UButton label="Agregar depósito" icon="i-lucide-plus" size="sm" @click="createPolicy" />
      </div>
      <div v-if="loading" class="py-6"><UProgress /></div>
      <UAlert v-else-if="!policies.length" color="neutral" variant="subtle" icon="i-lucide-info" title="Sin políticas configuradas" description="Agregá un depósito para empezar a recibir recomendaciones de reposición." />
      <div v-else class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full min-w-[700px] text-sm">
          <thead class="bg-elevated/50 text-left text-xs uppercase text-muted"><tr><th class="px-3 py-2">Depósito</th><th class="px-3 py-2 text-right">Punto</th><th class="px-3 py-2 text-right">Objetivo</th><th class="px-3 py-2 text-right">Plazo</th><th class="px-3 py-2">Estado</th><th class="w-24 px-3 py-2" /></tr></thead>
          <tbody>
            <tr v-for="policy in policies" :key="policy.id" class="border-t border-default">
              <td class="px-3 py-2 font-medium">{{ policy.warehouse.name }}<span v-if="policy.warehouse.code" class="ml-1 text-muted">· {{ policy.warehouse.code }}</span></td>
              <td class="px-3 py-2 text-right">{{ Number(policy.reorder_point).toLocaleString('es-AR') }}</td>
              <td class="px-3 py-2 text-right">{{ Number(policy.target_stock).toLocaleString('es-AR') }}</td>
              <td class="px-3 py-2 text-right">{{ policy.lead_time_days }} días</td>
              <td class="px-3 py-2"><UBadge :color="policy.active ? 'success' : 'neutral'" variant="subtle">{{ policy.active ? 'Activa' : 'Inactiva' }}</UBadge></td>
              <td class="px-3 py-2"><div v-if="canConfigure" class="flex justify-end gap-1"><UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click="editPolicy(policy)" /><UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="remove(policy)" /></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <UModal v-model:open="open" :title="editingId ? 'Editar política de reposición' : 'Nueva política de reposición'" description="Configurá los valores para un depósito físico.">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Depósito" required description="Los depósitos temporales y en tránsito no están disponibles."><USelectMenu v-model="form.warehouse_id" :items="warehouseOptions" value-key="value" searchable class="w-full" placeholder="Seleccionar depósito" /></UFormField>
        <UFormField label="Proveedor habitual" description="Opcional. Se utilizará al preparar futuras sugerencias de compra."><USelectMenu v-model="form.preferred_supplier_id" :items="supplierOptions" value-key="value" searchable class="w-full" placeholder="Sin proveedor definido" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Punto de reposición" description="Al llegar a esta cantidad se genera la advertencia."><UInput v-model.number="form.reorder_point" type="number" min="0" step="0.001" class="w-full" /></UFormField>
          <UFormField label="Stock objetivo" description="Cantidad que se desea alcanzar después de reponer."><UInput v-model.number="form.target_stock" type="number" min="0" step="0.001" class="w-full" /></UFormField>
        </div>
        <UFormField label="Plazo de reposición" description="Días utilizados para considerar arribos próximos."><UInput v-model.number="form.lead_time_days" type="number" min="0" step="1" class="w-full"><template #trailing>días</template></UInput></UFormField>
        <USwitch v-model="form.active" label="Política activa" />
      </div>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="() => { open = false }" /><UButton label="Guardar" :loading="saving" :disabled="!form.warehouse_id" @click="save" /></div></template>
  </UModal>
</template>
