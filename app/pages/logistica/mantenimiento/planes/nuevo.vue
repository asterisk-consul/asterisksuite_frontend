<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import {
  MaintenanceAssetType,
  MaintenanceCategory,
  MaintenanceType,
  MaintenancePriority,
  PlanIntervalType,
} from '~/modulos/logistica/maintenance/types/maintenance.types'

const router = useRouter()
const store = useMaintenanceStore()
const toast = useToast()

const saving = ref(false)

const assetTypes = [
  { value: MaintenanceAssetType.VEHICLE, label: 'Vehículo' },
  { value: MaintenanceAssetType.TIRE, label: 'Cubierta' },
  { value: MaintenanceAssetType.BATTERY, label: 'Batería' },
  { value: MaintenanceAssetType.ENGINE, label: 'Motor' },
  { value: MaintenanceAssetType.TRANSMISSION, label: 'Transmisión' },
  { value: MaintenanceAssetType.DIFFERENTIAL, label: 'Diferencial' },
  { value: MaintenanceAssetType.OTHER_COMPONENT, label: 'Otro Componente' },
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

const intervalTypes = [
  { value: PlanIntervalType.INTERVAL_KM, label: 'Por Kilómetros' },
  { value: PlanIntervalType.INTERVAL_DAYS, label: 'Por Días' },
  { value: PlanIntervalType.INTERVAL_MONTHS, label: 'Por Meses' },
  { value: PlanIntervalType.FIXED_DATE, label: 'Fecha Fija' },
]

const form = reactive({
  name: '',
  description: '',
  asset_type: MaintenanceAssetType.VEHICLE as MaintenanceAssetType,
  vehicle_type: '',
  category: MaintenanceCategory.OTHER as MaintenanceCategory,
  maintenance_type: MaintenanceType.PREVENTIVE as MaintenanceType,
  interval_type: PlanIntervalType.INTERVAL_KM as PlanIntervalType,
  interval_km: null as number | null,
  interval_days: null as number | null,
  interval_months: null as number | null,
  fixed_date: '',
  priority: MaintenancePriority.MEDIUM as MaintenancePriority,
  estimated_hours: null as number | null,
  estimated_cost: null as number | null,
  default_tasks: [] as { description: string; estimated_hours?: number }[],
})

const newTask = reactive({ description: '', estimated_hours: null as number | null })

function addTask() {
  if (!newTask.description) return
  form.default_tasks.push({
    description: newTask.description,
    estimated_hours: newTask.estimated_hours ?? undefined,
  })
  newTask.description = ''
  newTask.estimated_hours = null
}

function removeTask(index: number) {
  form.default_tasks.splice(index, 1)
}

async function handleSubmit() {
  if (!form.name) {
    toast.add({ title: 'Nombre es requerido', color: 'error' })
    return
  }

  try {
    saving.value = true
    const created = await store.createPlan({
      name: form.name,
      description: form.description || undefined,
      asset_type: form.asset_type,
      vehicle_type: form.vehicle_type || undefined,
      category: form.category,
      maintenance_type: form.maintenance_type,
      interval_type: form.interval_type,
      interval_km: form.interval_km ?? undefined,
      interval_days: form.interval_days ?? undefined,
      interval_months: form.interval_months ?? undefined,
      fixed_date: form.fixed_date || undefined,
      priority: form.priority,
      estimated_hours: form.estimated_hours ?? undefined,
      estimated_cost: form.estimated_cost ?? undefined,
      default_tasks: form.default_tasks.length ? form.default_tasks : undefined,
    })
    toast.add({ title: 'Plan creado', color: 'success' })
    router.push(`/logistica/mantenimiento/planes/${created.id}`)
  } catch (err: any) {
    toast.add({ title: 'Error al crear plan', color: 'error', description: store.error })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage>
    <AppPageHeader
      title="Nuevo Plan de Mantenimiento"
      description="Crear un plan preventivo o predictivo"
    />

    <UCard class="mt-4">
      <UForm :state="form" class="space-y-6" @submit="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Nombre" required>
            <UInput v-model="form.name" placeholder="Ej: Cambio de aceite cada 10.000 km" class="w-full" />
          </UFormField>

          <UFormField label="Tipo de Activo" required>
            <USelect v-model="form.asset_type" :items="assetTypes" class="w-full" />
          </UFormField>

          <UFormField label="Tipo de Vehículo">
            <UInput v-model="form.vehicle_type" placeholder="Ej: Camión, Auto, Camioneta" class="w-full" />
          </UFormField>

          <UFormField label="Categoría" required>
            <USelect v-model="form.category" :items="categories" class="w-full" />
          </UFormField>

          <UFormField label="Tipo de Mantenimiento">
            <USelect v-model="form.maintenance_type" :items="types" class="w-full" />
          </UFormField>

          <UFormField label="Prioridad">
            <USelect v-model="form.priority" :items="priorities" class="w-full" />
          </UFormField>

          <UFormField label="Tipo de Intervalo" required>
            <USelect v-model="form.interval_type" :items="intervalTypes" class="w-full" />
          </UFormField>

          <UFormField label="Intervalo (km)" v-if="form.interval_type === PlanIntervalType.INTERVAL_KM">
            <UInput v-model.number="form.interval_km" type="number" placeholder="Ej: 10000" class="w-full" />
          </UFormField>

          <UFormField label="Intervalo (días)" v-if="form.interval_type === PlanIntervalType.INTERVAL_DAYS">
            <UInput v-model.number="form.interval_days" type="number" placeholder="Ej: 30" class="w-full" />
          </UFormField>

          <UFormField label="Intervalo (meses)" v-if="form.interval_type === PlanIntervalType.INTERVAL_MONTHS">
            <UInput v-model.number="form.interval_months" type="number" placeholder="Ej: 6" class="w-full" />
          </UFormField>

          <UFormField label="Fecha Fija" v-if="form.interval_type === PlanIntervalType.FIXED_DATE">
            <UInput v-model="form.fixed_date" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Horas Estimadas">
            <UInput v-model.number="form.estimated_hours" type="number" placeholder="0.00" class="w-full" />
          </UFormField>

          <UFormField label="Costo Estimado">
            <UInput v-model.number="form.estimated_cost" type="number" placeholder="0.00" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Descripción">
          <UTextarea v-model="form.description" placeholder="Descripción del plan" :rows="3" class="w-full" />
        </UFormField>

        <div class="border-t pt-4">
          <h3 class="text-sm font-medium mb-3">Tareas por Defecto</h3>
          <div v-if="form.default_tasks.length" class="space-y-2 mb-3">
            <div v-for="(task, idx) in form.default_tasks" :key="idx" class="flex items-center gap-2 text-sm">
              <span class="flex-1">{{ task.description }}</span>
              <span v-if="task.estimated_hours" class="text-gray-400">{{ task.estimated_hours }}h</span>
              <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeTask(idx)" />
            </div>
          </div>
          <div class="flex gap-2">
            <UInput v-model="newTask.description" placeholder="Descripción de la tarea" class="flex-1" />
            <UInput v-model.number="newTask.estimated_hours" type="number" placeholder="Horas" class="w-24" />
            <UButton label="Agregar" icon="i-lucide-plus" size="sm" @click="addTask" />
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <UButton label="Cancelar" variant="outline" @click="router.back()" />
          <UButton label="Crear Plan" type="submit" :loading="saving" color="primary" />
        </div>
      </UForm>
    </UCard>
  </UPage>
</template>
