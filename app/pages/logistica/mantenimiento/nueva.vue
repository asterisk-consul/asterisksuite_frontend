<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import {
  MaintenanceAssetType,
  MaintenanceCategory,
  MaintenanceType,
  MaintenancePriority,
} from '~/modulos/logistica/maintenance/types/maintenance.types'

const router = useRouter()
const store = useMaintenanceStore()
const toast = useToast()

const saving = ref(false)

// --- OPTIONS ---
const assetTypes = [
  { value: MaintenanceAssetType.VEHICLE, label: 'Vehículo' },
  { value: MaintenanceAssetType.TIRE, label: 'Cubierta' },
]

const categories = [
  { value: MaintenanceCategory.ENGINE, label: 'Motor' },
  { value: MaintenanceCategory.TRANSMISSION, label: 'Transmisión' },
  { value: MaintenanceCategory.BRAKES, label: 'Frenos' },
  { value: MaintenanceCategory.SUSPENSION, label: 'Suspensión' },
  { value: MaintenanceCategory.STEERING, label: 'Dirección' },
  { value: MaintenanceCategory.ELECTRICAL, label: 'Eléctrico' },
  { value: MaintenanceCategory.COOLING, label: 'Refrigeración' },
  { value: MaintenanceCategory.LUBRICATION, label: 'Lubricación' },
  { value: MaintenanceCategory.TIRES, label: 'Cubiertas' },
  { value: MaintenanceCategory.BODY, label: 'Carrocería' },
  { value: MaintenanceCategory.LIGHTING, label: 'Iluminación' },
  { value: MaintenanceCategory.TRAILER, label: 'Acoplado' },
  { value: MaintenanceCategory.OTHER, label: 'Otro' },
]

const types = [
  { value: MaintenanceType.CORRECTIVE, label: 'Correctivo' },
  { value: MaintenanceType.PREVENTIVE, label: 'Preventivo' },
  { value: MaintenanceType.PREDICTIVE, label: 'Predictivo' },
  { value: MaintenanceType.INSPECTION, label: 'Inspección' },
  { value: MaintenanceType.SCHEDULED, label: 'Programado' },
]

const priorities = [
  { value: MaintenancePriority.CRITICAL, label: 'Crítica' },
  { value: MaintenancePriority.HIGH, label: 'Alta' },
  { value: MaintenancePriority.MEDIUM, label: 'Media' },
  { value: MaintenancePriority.LOW, label: 'Baja' },
]

// --- FORM (must be declared before computed/watch that reference it) ---
const form = reactive({
  asset_type: MaintenanceAssetType.VEHICLE as MaintenanceAssetType,
  asset_id: '',
  vehicle_id: '',
  category: MaintenanceCategory.OTHER as MaintenanceCategory,
  maintenance_type: MaintenanceType.CORRECTIVE as MaintenanceType,
  priority: MaintenancePriority.MEDIUM as MaintenancePriority,
  title: '',
  description: '',
  reported_problem: '',
  scheduled_at: '',
  odometer: null as number | null,
  assigned_to: '',
  supplier_id: '',
  estimated_cost: null as number | null,
  notes: '',
})

// --- ASSET LOOKUP ---
const vehicles = ref<any[]>([])
const tires = ref<any[]>([])
const loadingAssets = ref(false)
const selectedAsset = ref<any>(null)

const assetItems = computed(() => {
  if (form.asset_type === MaintenanceAssetType.VEHICLE) {
    return vehicles.value.map((v: any) => ({
      value: v.id,
      label: `${v.plate}${v.brand ? ' — ' + v.brand : ''}${v.model ? ' ' + v.model : ''}${v.year ? ' (' + v.year + ')' : ''}`,
    }))
  }
  if (form.asset_type === MaintenanceAssetType.TIRE) {
    return tires.value.map((t: any) => ({
      value: t.id,
      label: `${t.serial_number}${t.product?.name ? ' — ' + t.product.name : ''}`,
    }))
  }
  return []
})

async function fetchAssets() {
  loadingAssets.value = true
  try {
    if (form.asset_type === MaintenanceAssetType.VEHICLE) {
      const data = await $fetch<any[]>('/api/logistica/vehicles')
      vehicles.value = data
    } else if (form.asset_type === MaintenanceAssetType.TIRE) {
      const data = await $fetch<any>('/api/logistica/maintenance/tires', { params: { limit: 500 } })
      tires.value = data.data ?? data
    }
  } catch {
    // silently fail
  } finally {
    loadingAssets.value = false
  }
}

watch(() => form.asset_type, () => {
  form.asset_id = ''
  selectedAsset.value = null
  fetchAssets()
})

watch(selectedAsset, (val) => {
  form.asset_id = val?.value ?? ''
})

async function handleSubmit() {
  if (!form.title || !form.asset_id) {
    toast.add({ title: 'Título y activo son requeridos', color: 'error' })
    return
  }

  try {
    saving.value = true
    const payload = {
      ...form,
      vehicle_id: form.asset_type === MaintenanceAssetType.VEHICLE ? form.asset_id : form.vehicle_id || undefined,
      odometer: form.odometer ?? undefined,
      estimated_cost: form.estimated_cost ?? undefined,
      scheduled_at: form.scheduled_at || undefined,
      assigned_to: form.assigned_to || undefined,
      supplier_id: form.supplier_id || undefined,
    }
    console.log('[ORDEN] Payload enviado:', payload)
    const created = await store.createOrder(payload)
    toast.add({ title: 'Mantenimiento creado', color: 'success' })
    router.push(`/logistica/mantenimiento/${created.id}`)
  } catch (err: any) {
    console.error('[ORDEN] Error completo:', err)
    toast.add({ title: 'Error al crear', color: 'error', description: store.error })
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchAssets())
</script>

<template>
  <UPage>
    <AppPageHeader
      title="Nuevo Mantenimiento"
      description="Crear una nueva orden de mantenimiento"
    />

    <UCard class="mt-4">
      <UForm :state="form" class="space-y-6" @submit="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Tipo de Activo" required>
            <USelect v-model="form.asset_type" :items="assetTypes" class="w-full" />
          </UFormField>

          <UFormField label="Activo" required>
            <USelectMenu
              v-model="selectedAsset"
              :items="assetItems"
              placeholder="Buscar activo..."
              searchable
              clear
              :loading="loadingAssets"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Categoría" required>
            <USelect v-model="form.category" :items="categories" class="w-full" />
          </UFormField>

          <UFormField label="Tipo de Mantenimiento" required>
            <USelect v-model="form.maintenance_type" :items="types" class="w-full" />
          </UFormField>

          <UFormField label="Prioridad">
            <USelect v-model="form.priority" :items="priorities" class="w-full" />
          </UFormField>

          <UFormField label="Título" required>
            <UInput v-model="form.title" placeholder="Descripción breve" class="w-full" />
          </UFormField>

          <UFormField label="Fecha Programada">
            <UInput v-model="form.scheduled_at" type="datetime-local" class="w-full" />
          </UFormField>

          <UFormField label="Odómetro">
            <UInput v-model.number="form.odometer" type="number" placeholder="km actuales" class="w-full" />
          </UFormField>

          <UFormField label="Costo Estimado">
            <UInput v-model.number="form.estimated_cost" type="number" placeholder="0.00" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Descripción">
          <UTextarea v-model="form.description" placeholder="Detalle del mantenimiento" :rows="3" class="w-full" />
        </UFormField>

        <UFormField label="Problema Reportado">
          <UTextarea v-model="form.reported_problem" placeholder="Síntomas o problema reportado" :rows="3" class="w-full" />
        </UFormField>

        <UFormField label="Notas">
          <UTextarea v-model="form.notes" placeholder="Notas adicionales" :rows="2" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-3">
          <UButton label="Cancelar" variant="outline" @click="router.back()" />
          <UButton label="Crear Mantenimiento" type="submit" :loading="saving" color="primary" />
        </div>
      </UForm>
    </UCard>
  </UPage>
</template>
