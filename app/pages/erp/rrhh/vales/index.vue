<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import {
  HR_VALE_TYPE_LABELS,
  HR_VALE_TYPE_COLORS,
  HR_VALE_STATUS_LABELS,
  HR_VALE_STATUS_COLORS,
} from '~/modulos/erp/hr/types/hr.types'
import type { HrVale } from '~/modulos/erp/hr/types/hr.types'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()
const vales = computed(() => hrStore.vales)
const loading = computed(() => hrStore.loading)

const filterType = ref<string>('')
const filterStatus = ref<string>('')

const showCreateModal = ref(false)
const createForm = ref({
  party_id: '',
  party_type: 'EMPLOYEE',
  type: 'RETIRO',
  amount: 0,
  currency_code: 'ARS',
  date: new Date().toISOString().split('T')[0],
  description: '',
})

const people = ref<any[]>([])

async function loadPeople() {
  try {
    const [employees, partners] = await Promise.all([
      $fetch<any[]>('/api/erp/employees'),
      $fetch<any[]>('/api/erp/partners'),
    ])
    people.value = [
      ...employees.map((e: any) => ({
        id: e.party_id ?? e.id,
        name: `${e.first_name} ${e.last_name}`,
        type: 'EMPLOYEE',
      })),
      ...partners.map((p: any) => ({
        id: p.party_id ?? p.id,
        name: `${p.first_name} ${p.last_name}`,
        type: 'PARTNER',
      })),
    ]
  } catch (e) {
    console.error(e)
  }
}

async function loadVales() {
  await hrStore.fetchVales({
    ...(filterType.value ? { type: filterType.value } : {}),
    ...(filterStatus.value ? { status: filterStatus.value } : {}),
  })
}

onMounted(async () => {
  await Promise.all([loadVales(), loadPeople()])
})

watch([filterType, filterStatus], () => loadVales())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '-'
}

async function handleCreate() {
  try {
    await hrStore.createVale(createForm.value)
    showCreateModal.value = false
    createForm.value = {
      party_id: '',
      party_type: 'EMPLOYEE',
      type: 'RETIRO',
      amount: 0,
      currency_code: 'ARS',
      date: new Date().toISOString().split('T')[0],
      description: '',
    }
    await loadVales()
  } catch (e) {
    console.error(e)
  }
}

async function handleConfirm(id: string) {
  try {
    await hrStore.confirmVale(id)
    await loadVales()
  } catch (e) {
    console.error(e)
  }
}

async function handleCancel(id: string) {
  try {
    await hrStore.cancelVale(id)
    await loadVales()
  } catch (e) {
    console.error(e)
  }
}

const columns = [
  { id: 'number', header: 'Nº' },
  { id: 'person', header: 'Persona' },
  { id: 'type', header: 'Tipo' },
  { id: 'amount', header: 'Monto' },
  { id: 'date', header: 'Fecha' },
  { id: 'status', header: 'Estado' },
  { id: 'actions', header: '' },
]

const typeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Retiro', value: 'RETIRO' },
  { label: 'Adelanto', value: 'ADELANTO' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Préstamo', value: 'PRESTAMO' },
]

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Confirmado', value: 'CONFIRMED' },
  { label: 'Pagado', value: 'PAID' },
  { label: 'Anulado', value: 'CANCELLED' },
]
</script>

<template>
  <UPage>
    <AppPageHeader title="Vales RRHH" description="Comprobantes internos de empleados y socios">
      <template #links>
        <UButton label="Nuevo vale" icon="i-lucide-plus" @click="showCreateModal = true" />
      </template>
    </AppPageHeader>

    <!-- Filtros -->
    <div class="flex gap-2 flex-wrap">
      <USelect v-model="filterType" :items="typeOptions" placeholder="Tipo" class="w-40" />
      <USelect v-model="filterStatus" :items="statusOptions" placeholder="Estado" class="w-40" />
    </div>

    <!-- Tabla -->
    <UPageCard variant="subtle">
      <UTable :data="vales" :columns="columns" :loading="loading">
        <template #number-cell="{ row }">
          <span class="font-mono font-medium">#{{ row.original.number }}</span>
        </template>

        <template #person-cell="{ row }">
          {{ row.original.party?.name ?? '-' }}
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="HR_VALE_TYPE_LABELS[row.original.type as keyof typeof HR_VALE_TYPE_LABELS]"
            :color="HR_VALE_TYPE_COLORS[row.original.type as keyof typeof HR_VALE_TYPE_COLORS] as any"
            variant="subtle"
          />
        </template>

        <template #amount-cell="{ row }">
          <span class="font-medium">{{ fmt(Number(row.original.amount)) }}</span>
        </template>

        <template #date-cell="{ row }">
          {{ fmtDate(row.original.date) }}
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :label="HR_VALE_STATUS_LABELS[row.original.status as keyof typeof HR_VALE_STATUS_LABELS]"
            :color="HR_VALE_STATUS_COLORS[row.original.status as keyof typeof HR_VALE_STATUS_COLORS] as any"
            variant="subtle"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              v-if="row.original.status === 'DRAFT'"
              icon="i-lucide-check"
              variant="ghost"
              color="success"
              size="sm"
              @click="handleConfirm(row.original.id)"
            />
            <UButton
              v-if="row.original.status !== 'CANCELLED'"
              icon="i-lucide-x"
              variant="ghost"
              color="error"
              size="sm"
              @click="handleCancel(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UPageCard>

    <!-- Modal crear vale -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h2 class="text-lg font-semibold">Nuevo vale</h2>

          <div class="space-y-1">
            <label class="text-sm font-medium">Persona</label>
            <USelect
              v-model="createForm.party_id"
              :items="people.map(p => ({ label: `${p.name} (${p.type === 'EMPLOYEE' ? 'Empleado' : 'Socio'})`, value: p.id }))"
              placeholder="Seleccionar..."
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-sm font-medium">Tipo</label>
              <USelect
                v-model="createForm.type"
                :items="typeOptions.filter(o => o.value)"
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">Monto</label>
              <UInput v-model.number="createForm.amount" type="number" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-sm font-medium">Fecha</label>
              <UInput v-model="createForm.date" type="date" />
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">Moneda</label>
              <USelect
                v-model="createForm.currency_code"
                :items="[{ label: 'ARS', value: 'ARS' }, { label: 'USD', value: 'USD' }]"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium">Descripción</label>
            <UInput v-model="createForm.description" placeholder="Motivo del vale..." />
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-default">
            <UButton label="Cancelar" variant="ghost" color="neutral" @click="showCreateModal = false" />
            <UButton label="Crear vale" :disabled="!createForm.party_id || createForm.amount <= 0" @click="handleCreate" />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
