<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
import type { ButtonProps } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { useMaintenanceStore } from '~/modulos/logistica/maintenance/store/maintenance.store'
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { useEmployeesStore } from '~/modulos/erp/employees/store/employees.store'
import type { MaintenanceStatus } from '~/modulos/logistica/maintenance/types/maintenance.types'

const route = useRoute()
const router = useRouter()
const store = useMaintenanceStore()
const toast = useToast()

const productsStore = useProductsStore()
const warehousesStore = useDepositosStore()
const partiesStore = useBusinessPartiesStore()
const employeesStore = useEmployeesStore()

const { items: allProducts } = storeToRefs(productsStore)
const { warehouses: allWarehouses } = storeToRefs(warehousesStore)
const { suppliers: allSuppliers } = storeToRefs(partiesStore)
const { items: allEmployees } = storeToRefs(employeesStore)

const id = route.params.id as string
const loading = ref(true)
const activeTab = ref('info')

const order = computed(() => store.currentOrder)

type BadgeColor = 'error' | 'neutral' | 'info' | 'success' | 'warning' | 'primary' | 'secondary'

const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  PENDING: { color: 'warning', label: 'Pendiente' },
  SCHEDULED: { color: 'info', label: 'Programada' },
  IN_PROGRESS: { color: 'primary', label: 'En Progreso' },
  WAITING_PARTS: { color: 'secondary', label: 'Esperando Repuestos' },
  WAITING_SUPPLIER: { color: 'secondary', label: 'Esperando Proveedor' },
  COMPLETED: { color: 'success', label: 'Completada' },
  CANCELLED: { color: 'error', label: 'Cancelada' }
}

const priorityConfig: Record<string, { color: BadgeColor; label: string }> = {
  CRITICAL: { color: 'error', label: 'Crítica' },
  HIGH: { color: 'warning', label: 'Alta' },
  MEDIUM: { color: 'info', label: 'Media' },
  LOW: { color: 'neutral', label: 'Baja' }
}

const statusBadge = computed(() => {
  const s = order.value?.status ?? ''
  return statusConfig[s] ?? { color: 'neutral' as BadgeColor, label: s }
})

const priorityBadge = computed(() => {
  const p = order.value?.priority ?? ''
  return priorityConfig[p] ?? { color: 'neutral' as BadgeColor, label: p }
})

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
}

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
}

const tabs = [
  { key: 'info', label: 'Información', slot: 'info' },
  { key: 'tasks', label: 'Tareas', slot: 'tasks' },
  { key: 'parts', label: 'Repuestos', slot: 'parts' },
  { key: 'labor', label: 'Mano de Obra', slot: 'labor' },
  { key: 'services', label: 'Servicios', slot: 'services' },
  { key: 'history', label: 'Historial', slot: 'history' }
]

const availableStatuses: { value: MaintenanceStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'SCHEDULED', label: 'Programada' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'WAITING_PARTS', label: 'Esperando Repuestos' },
  { value: 'WAITING_SUPPLIER', label: 'Esperando Proveedor' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' }
]

const showStatusModal = ref(false)
const selectedStatus = ref<MaintenanceStatus>('PENDING')
const statusComment = ref('')

function openStatusModal() {
  selectedStatus.value = order.value?.status ?? 'PENDING'
  statusComment.value = ''
  showStatusModal.value = true
}

async function confirmStatusChange() {
  if (!order.value) return
  await store.changeOrderStatus(order.value.id, {
    to_status: selectedStatus.value,
    comment: statusComment.value || undefined
  })
  showStatusModal.value = false
}

// --- MODALS ---
const showTaskModal = ref(false)
const showPartModal = ref(false)
const showLaborModal = ref(false)
const showServiceModal = ref(false)
const saving = ref(false)

const taskForm = reactive({ description: '', estimated_hours: null as number | null, notes: '' })

const partForm = reactive({
  product_id: '',
  warehouse_id: '',
  quantity: null as number | null,
  unit_cost: null as number | null,
  document_id: ''
})

const laborForm = reactive({
  labor_type: 'internal' as 'internal' | 'external',
  employee_id: '',
  supplier_id: '',
  description: '',
  hours: null as number | null,
  hourly_cost: null as number | null,
  document_id: ''
})

const serviceForm = reactive({
  supplier_id: '',
  description: '',
  quantity: null as number | null,
  unit_cost: null as number | null,
  document_id: ''
})

// --- LOOKUPS (via stores, no $fetch directo) ---
const documents = ref<any[]>([])

const selectProducts = computed(() =>
  allProducts.value.map((p: any) => ({ value: p.id, label: p.sku ? `${p.sku} - ${p.name}` : p.name }))
)

const selectWarehouses = computed(() =>
  allWarehouses.value
    .filter((w: any) => w.active !== false)
    .map((w: any) => ({ value: w.id, label: w.code ? `${w.name} (${w.code})` : w.name }))
)

const selectSuppliers = computed(() => allSuppliers.value.map((s: any) => ({ value: s.id, label: s.name })))

const selectEmployees = computed(() =>
  allEmployees.value.map((e: any) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))
)

const selectDocuments = computed(() =>
  documents.value.map((d: any) => ({ value: d.id, label: d.number + ' - ' + d.party_name }))
)

async function fetchLookups() {
  try {
    const [, , , , docData] = await Promise.all([
      productsStore.fetchAll(),
      warehousesStore.fetchAll(),
      partiesStore.fetchAll(),
      employeesStore.fetchAll(),
      $fetch<any>('/api/erp/documents/purchases?category=INVOICE&status=2')
    ])
    documents.value = docData?.data ?? docData ?? []
  } catch {
    // silently fail
  }
}

async function submitTask() {
  if (!taskForm.description) {
    toast.add({ title: 'Descripción requerida', color: 'error' })
    return
  }
  saving.value = true
  try {
    await store.createTask(id, { ...taskForm })
    toast.add({ title: 'Tarea creada', color: 'success' })
    showTaskModal.value = false
    Object.assign(taskForm, { description: '', estimated_hours: null, notes: '' })
  } catch {
    toast.add({ title: 'Error al crear tarea', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function submitPart() {
  if (!partForm.product_id || !partForm.warehouse_id || !partForm.quantity || !partForm.unit_cost) {
    toast.add({ title: 'Complete todos los campos requeridos', color: 'error' })
    return
  }
  saving.value = true
  try {
    await store.createPart(id, { ...partForm })
    toast.add({ title: 'Repuesto agregado', color: 'success' })
    showPartModal.value = false
    Object.assign(partForm, { product_id: '', warehouse_id: '', quantity: null, unit_cost: null, document_id: '' })
  } catch {
    toast.add({ title: 'Error al agregar repuesto', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function submitLabor() {
  if (!laborForm.description || !laborForm.hours || !laborForm.hourly_cost) {
    toast.add({ title: 'Complete todos los campos requeridos', color: 'error' })
    return
  }
  if (laborForm.labor_type === 'internal' && !laborForm.employee_id) {
    toast.add({ title: 'Seleccioná un empleado', color: 'error' })
    return
  }
  if (laborForm.labor_type === 'external' && !laborForm.supplier_id) {
    toast.add({ title: 'Seleccioná un proveedor', color: 'error' })
    return
  }
  saving.value = true
  try {
    const payload = {
      description: laborForm.description,
      hours: laborForm.hours,
      hourly_cost: laborForm.hourly_cost,
      employee_id: laborForm.labor_type === 'internal' ? laborForm.employee_id : undefined,
      supplier_id: laborForm.labor_type === 'external' ? laborForm.supplier_id : undefined,
      document_id: laborForm.document_id || undefined
    }
    await store.createLabor(id, payload)
    toast.add({ title: 'Mano de obra registrada', color: 'success' })
    showLaborModal.value = false
    Object.assign(laborForm, {
      labor_type: 'internal',
      employee_id: '',
      supplier_id: '',
      description: '',
      hours: null,
      hourly_cost: null,
      document_id: ''
    })
  } catch {
    toast.add({ title: 'Error al registrar mano de obra', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function submitService() {
  if (!serviceForm.supplier_id || !serviceForm.description || !serviceForm.quantity || !serviceForm.unit_cost) {
    toast.add({ title: 'Complete todos los campos requeridos', color: 'error' })
    return
  }
  saving.value = true
  try {
    await store.createService(id, { ...serviceForm })
    toast.add({ title: 'Servicio registrado', color: 'success' })
    showServiceModal.value = false
    Object.assign(serviceForm, { supplier_id: '', description: '', quantity: null, unit_cost: null, document_id: '' })
  } catch {
    toast.add({ title: 'Error al registrar servicio', color: 'error' })
  } finally {
    saving.value = false
  }
}

const links = computed<ButtonProps[]>(() => {
  if (!order.value) return []
  return [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onClick: () => router.push(`/logistica/mantenimiento/${id}/editar`),
      color: 'primary',
      variant: 'solid'
    }
  ]
})

onMounted(async () => {
  await Promise.all([store.fetchOrder(id), fetchLookups()])
  loading.value = false
})
</script>

<template>
  <div v-if="loading" class="flex justify-center py-24">
    <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-gray-400" />
  </div>

  <UPage v-else-if="order">
    <UPageHeader :title="`Orden ${order.number}`" :description="order.title" :links="links" />

    <div class="space-y-6 mt-4">
      <div class="flex items-center gap-3">
        <UBadge :color="statusBadge.color" variant="soft" size="lg">
          {{ statusBadge.label }}
        </UBadge>
        <UBadge :color="priorityBadge.color" variant="soft" size="lg">
          {{ priorityBadge.label }}
        </UBadge>
        <UButton
          size="sm"
          variant="outline"
          label="Cambiar Estado"
          icon="i-lucide-arrow-right-left"
          class="ml-auto"
          @click="openStatusModal"
        />
      </div>

      <UTabs v-model="activeTab" :items="tabs">
        <!-- TAB: Info -->
        <template #info>
          <div class="space-y-6 mt-4">
            <UCard>
              <template #header>
                <span class="font-medium text-sm">Datos Generales</span>
              </template>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Número</span>
                  <span class="font-medium">{{ order.number }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Tipo de Activo</span>
                  <span class="font-medium">{{ order.asset_type }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Categoría</span>
                  <span class="font-medium">{{ order.category }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Tipo Mantenimiento</span>
                  <span class="font-medium">{{ order.maintenance_type }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Vehículo</span>
                  <span class="font-medium">{{ order.vehicle?.plate ?? '—' }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Proveedor</span>
                  <span class="font-medium">{{ order.supplier?.name ?? '—' }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Programada</span>
                  <span class="font-medium">{{ formatDate(order.scheduled_at) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Reportada</span>
                  <span class="font-medium">{{ formatDate(order.reported_at) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Iniciada</span>
                  <span class="font-medium">{{ formatDate(order.started_at) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Completada</span>
                  <span class="font-medium">{{ formatDate(order.completed_at) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Odómetro</span>
                  <span class="font-medium">
                    {{ order.odometer ? `${order.odometer.toLocaleString('es-AR')} km` : '—' }}
                  </span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Horas Estimadas</span>
                  <span class="font-medium">{{ order.estimated_hours ?? '—' }} h</span>
                </div>
              </div>
            </UCard>

            <UCard
              v-if="order.description || order.reported_problem || order.diagnosis || order.solution || order.notes"
            >
              <template #header>
                <span class="font-medium text-sm">Descripción y Notas</span>
              </template>
              <div class="space-y-3 text-sm">
                <div v-if="order.description">
                  <span class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Descripción</span>
                  <p>{{ order.description }}</p>
                </div>
                <div v-if="order.reported_problem">
                  <span class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Problema Reportado</span>
                  <p>{{ order.reported_problem }}</p>
                </div>
                <div v-if="order.diagnosis">
                  <span class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Diagnóstico</span>
                  <p>{{ order.diagnosis }}</p>
                </div>
                <div v-if="order.solution">
                  <span class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Solución</span>
                  <p>{{ order.solution }}</p>
                </div>
                <div v-if="order.notes">
                  <span class="text-xs text-gray-400 uppercase tracking-wide block mb-1">Notas</span>
                  <p>{{ order.notes }}</p>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <span class="font-medium text-sm">Resumen de Costos</span>
              </template>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Costo Estimado</span>
                  <span class="font-medium text-lg">{{ formatCurrency(order.estimated_cost) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Repuestos</span>
                  <span class="font-medium text-lg">{{ formatCurrency(order.parts_cost) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Mano de Obra</span>
                  <span class="font-medium text-lg">{{ formatCurrency(order.labor_cost) }}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-xs text-gray-400 uppercase tracking-wide">Servicios</span>
                  <span class="font-medium text-lg">{{ formatCurrency(order.services_cost) }}</span>
                </div>
              </div>
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Costo Real Total</span>
                  <span class="text-xl font-bold">{{ formatCurrency(order.actual_cost) }}</span>
                </div>
              </div>
            </UCard>
          </div>
        </template>

        <!-- TAB: Tasks -->
        <template #tasks>
          <UCard class="mt-4">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">Tareas</span>
                <div class="flex items-center gap-2">
                  <UBadge variant="soft" color="neutral">{{ order.tasks?.length ?? 0 }}</UBadge>
                  <UButton size="xs" icon="i-lucide-plus" label="Agregar" @click="showTaskModal = true" />
                </div>
              </div>
            </template>
            <div v-if="order.tasks?.length" class="space-y-3">
              <div
                v-for="task in order.tasks"
                :key="task.id"
                class="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <UBadge
                  :color="task.status === 'COMPLETED' ? 'success' : task.status === 'IN_PROGRESS' ? 'info' : 'warning'"
                  variant="soft"
                  size="xs"
                >
                  {{ task.status }}
                </UBadge>
                <span class="flex-1 text-sm">{{ task.description }}</span>
                <span v-if="task.estimated_hours" class="text-xs text-gray-400">{{ task.estimated_hours }}h est.</span>
                <span v-if="task.actual_hours" class="text-xs text-gray-400">{{ task.actual_hours }}h real</span>
              </div>
            </div>
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-check-circle"
              title="Sin tareas"
              description="Esta orden no tiene tareas registradas."
            />
          </UCard>
        </template>

        <!-- TAB: Parts -->
        <template #parts>
          <UCard class="mt-4">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">Repuestos</span>
                <div class="flex items-center gap-2">
                  <UBadge variant="soft" color="neutral">{{ order.parts?.length ?? 0 }}</UBadge>
                  <UButton size="xs" icon="i-lucide-plus" label="Agregar" @click="showPartModal = true" />
                </div>
              </div>
            </template>
            <div v-if="order.parts?.length">
              <UTable
                :data="order.parts"
                :columns="[
                  {
                    accessorKey: 'product',
                    header: 'Producto',
                    cell: ({ row }: any) => row.original.product?.name ?? '—'
                  },
                  { accessorKey: 'quantity', header: 'Cantidad', cell: ({ row }: any) => row.original.quantity },
                  {
                    accessorKey: 'unit_cost',
                    header: 'Costo Unit.',
                    cell: ({ row }: any) => formatCurrency(row.original.unit_cost)
                  },
                  {
                    accessorKey: 'total_cost',
                    header: 'Total',
                    cell: ({ row }: any) => formatCurrency(row.original.total_cost)
                  }
                ]"
              />
            </div>
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-package-open"
              title="Sin repuestos"
              description="No se registraron repuestos en esta orden."
            />
          </UCard>
        </template>

        <!-- TAB: Labor -->
        <template #labor>
          <UCard class="mt-4">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">Mano de Obra</span>
                <div class="flex items-center gap-2">
                  <UBadge variant="soft" color="neutral">{{ order.labor?.length ?? 0 }}</UBadge>
                  <UButton size="xs" icon="i-lucide-plus" label="Agregar" @click="showLaborModal = true" />
                </div>
              </div>
            </template>
            <div v-if="order.labor?.length">
              <UTable
                :data="order.labor"
                :columns="[
                  {
                    accessorKey: 'type',
                    header: 'Tipo',
                    cell: ({ row }: any) => (row.original.employee_id ? 'Interno' : 'Externo')
                  },
                  {
                    accessorKey: 'description',
                    header: 'Descripción',
                    cell: ({ row }: any) => row.original.description
                  },
                  { accessorKey: 'hours', header: 'Horas', cell: ({ row }: any) => row.original.hours },
                  {
                    accessorKey: 'hourly_cost',
                    header: 'Costo/h',
                    cell: ({ row }: any) => formatCurrency(row.original.hourly_cost)
                  },
                  {
                    accessorKey: 'total_cost',
                    header: 'Total',
                    cell: ({ row }: any) => formatCurrency(row.original.total_cost)
                  }
                ]"
              />
            </div>
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-users"
              title="Sin mano de obra"
              description="No se registró mano de obra en esta orden."
            />
          </UCard>
        </template>

        <!-- TAB: Services -->
        <template #services>
          <UCard class="mt-4">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">Servicios Externos</span>
                <div class="flex items-center gap-2">
                  <UBadge variant="soft" color="neutral">{{ order.services?.length ?? 0 }}</UBadge>
                  <UButton size="xs" icon="i-lucide-plus" label="Agregar" @click="showServiceModal = true" />
                </div>
              </div>
            </template>
            <div v-if="order.services?.length">
              <UTable
                :data="order.services"
                :columns="[
                  {
                    accessorKey: 'description',
                    header: 'Descripción',
                    cell: ({ row }: any) => row.original.description
                  },
                  {
                    accessorKey: 'supplier',
                    header: 'Proveedor',
                    cell: ({ row }: any) => row.original.supplier?.name ?? '—'
                  },
                  { accessorKey: 'quantity', header: 'Cantidad', cell: ({ row }: any) => row.original.quantity },
                  {
                    accessorKey: 'unit_cost',
                    header: 'Costo Unit.',
                    cell: ({ row }: any) => formatCurrency(row.original.unit_cost)
                  },
                  {
                    accessorKey: 'total_cost',
                    header: 'Total',
                    cell: ({ row }: any) => formatCurrency(row.original.total_cost)
                  }
                ]"
              />
            </div>
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-wrench"
              title="Sin servicios"
              description="No se registraron servicios externos en esta orden."
            />
          </UCard>
        </template>

        <!-- TAB: History -->
        <template #history>
          <UCard class="mt-4">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">Historial de Estados</span>
                <UBadge variant="soft" color="neutral">{{ order.status_history?.length ?? 0 }}</UBadge>
              </div>
            </template>
            <div v-if="order.status_history?.length" class="space-y-3">
              <div
                v-for="entry in order.status_history"
                :key="entry.id"
                class="flex items-center gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <UBadge :color="statusConfig[entry.to_status]?.color ?? 'neutral'" variant="soft" size="xs">
                  {{ statusConfig[entry.to_status]?.label ?? entry.to_status }}
                </UBadge>
                <span class="flex-1 text-xs text-gray-400">
                  {{ formatDate(entry.changed_at) }}
                  <span v-if="entry.comment">— {{ entry.comment }}</span>
                </span>
              </div>
            </div>
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-clock"
              title="Sin historial"
              description="No hay cambios de estado registrados."
            />
          </UCard>
        </template>
      </UTabs>
    </div>

    <!-- Status Change Modal -->
    <UModal v-model:open="showStatusModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Cambiar Estado</h3>
          <USelectMenu
            v-model="selectedStatus"
            :items="availableStatuses"
            label="Nuevo Estado"
            value-key="value"
            label-key="label"
          />
          <UTextarea v-model="statusComment" placeholder="Comentario (opcional)" />
          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showStatusModal = false" />
            <UButton label="Confirmar" @click="confirmStatusChange" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Task Modal -->
    <UModal v-model:open="showTaskModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Agregar Tarea</h3>
          <UFormField label="Descripción" required>
            <UTextarea v-model="taskForm.description" placeholder="Descripción de la tarea" :rows="3" class="w-full" />
          </UFormField>
          <UFormField label="Horas Estimadas">
            <UInput v-model.number="taskForm.estimated_hours" type="number" placeholder="0" class="w-full" />
          </UFormField>
          <UFormField label="Notas">
            <UTextarea v-model="taskForm.notes" placeholder="Notas adicionales" :rows="2" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showTaskModal = false" />
            <UButton label="Crear" :loading="saving" @click="submitTask" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Part Modal -->
    <UModal v-model:open="showPartModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Agregar Repuesto</h3>
          <UFormField label="Producto" required>
            <USelectMenu
              v-model="partForm.product_id"
              :items="selectProducts"
              placeholder="Buscar producto..."
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <UFormField label="Depósito" required>
            <USelectMenu
              v-model="partForm.warehouse_id"
              :items="selectWarehouses"
              placeholder="Seleccionar depósito..."
              class="w-full"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Cantidad" required>
              <UInput v-model.number="partForm.quantity" type="number" placeholder="0" class="w-full" />
            </UFormField>
            <UFormField label="Costo Unitario" required>
              <UInput v-model.number="partForm.unit_cost" type="number" placeholder="0.00" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Factura Asociada (opcional)">
            <USelectMenu
              v-model="partForm.document_id"
              :items="selectDocuments"
              placeholder="Sin factura"
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showPartModal = false" />
            <UButton label="Agregar" :loading="saving" @click="submitPart" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Labor Modal -->
    <UModal v-model:open="showLaborModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Agregar Mano de Obra</h3>
          <UFormField label="Tipo">
            <URadioGroup
              v-model="laborForm.labor_type"
              :items="[
                { value: 'internal', label: 'Empleado interno' },
                { value: 'external', label: 'Tercero externo' }
              ]"
            />
          </UFormField>
          <UFormField v-if="laborForm.labor_type === 'internal'" label="Empleado" required>
            <USelectMenu
              v-model="laborForm.employee_id"
              :items="selectEmployees"
              placeholder="Seleccionar empleado..."
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <UFormField v-else label="Proveedor" required>
            <USelectMenu
              v-model="laborForm.supplier_id"
              :items="selectSuppliers"
              placeholder="Seleccionar proveedor..."
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <UFormField label="Descripción" required>
            <UTextarea v-model="laborForm.description" placeholder="Descripción del trabajo" :rows="2" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Horas" required>
              <UInput v-model.number="laborForm.hours" type="number" placeholder="0" class="w-full" />
            </UFormField>
            <UFormField label="Costo/Hora" required>
              <UInput v-model.number="laborForm.hourly_cost" type="number" placeholder="0.00" class="w-full" />
            </UFormField>
          </div>
          <UFormField v-if="laborForm.labor_type === 'external'" label="Factura Asociada (opcional)">
            <USelectMenu
              v-model="laborForm.document_id"
              :items="selectDocuments"
              placeholder="Sin factura"
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showLaborModal = false" />
            <UButton label="Agregar" :loading="saving" @click="submitLabor" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Service Modal -->
    <UModal v-model:open="showServiceModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-medium">Agregar Servicio Externo</h3>
          <UFormField label="Proveedor" required>
            <USelectMenu
              v-model="serviceForm.supplier_id"
              :items="selectSuppliers"
              placeholder="Buscar proveedor..."
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <UFormField label="Descripción" required>
            <UTextarea
              v-model="serviceForm.description"
              placeholder="Descripción del servicio"
              :rows="2"
              class="w-full"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Cantidad" required>
              <UInput v-model.number="serviceForm.quantity" type="number" placeholder="0" class="w-full" />
            </UFormField>
            <UFormField label="Costo Unitario" required>
              <UInput v-model.number="serviceForm.unit_cost" type="number" placeholder="0.00" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Factura Asociada (opcional)">
            <USelectMenu
              v-model="serviceForm.document_id"
              :items="selectDocuments"
              placeholder="Sin factura"
              searchable
              clear
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" label="Cancelar" @click="showServiceModal = false" />
            <UButton label="Agregar" :loading="saving" @click="submitService" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
