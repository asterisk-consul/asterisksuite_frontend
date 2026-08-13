<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import {
  HR_VALE_TYPE_LABELS,
  HR_VALE_TYPE_COLORS,
  HR_VALE_STATUS_LABELS,
  HR_VALE_STATUS_COLORS
} from '~/modulos/erp/hr/types/hr.types'

definePageMeta({ middleware: ['auth'] })

const hrStore = useHrStore()
const vales = computed(() => hrStore.vales)
const loading = computed(() => hrStore.loading)
const toast = useToast()

const filterType = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const showCreateModal = ref(false)
const showCancelModal = ref(false)
const cancellingVale = ref<any>(null)
const cancelConfirmText = ref('')

const createForm = ref({
  party_id: '',
  party_type: 'EMPLOYEE',
  type: 'SUELDO',
  amount: 0,
  currency_code: 'ARS',
  date: today(),
  description: ''
})

const people = ref<any[]>([])

async function loadPeople() {
  try {
    const [employees, partners] = await Promise.all([
      $fetch<any[]>('/api/erp/employees'),
      $fetch<any[]>('/api/erp/partners')
    ])
    people.value = [
      ...employees.map((e: any) => ({
        id: e.party_id ?? e.id,
        name: `${e.first_name} ${e.last_name}`,
        type: 'EMPLOYEE'
      })),
      ...partners.map((p: any) => ({
        id: p.party_id ?? p.id,
        name: `${p.first_name} ${p.last_name}`,
        type: 'PARTNER'
      }))
    ]
  } catch (e) {
    console.error(e)
  }
}

async function loadVales() {
  await hrStore.fetchVales({
    ...(filterType.value ? { type: filterType.value } : {}),
    ...(filterStatus.value ? { status: filterStatus.value } : {})
  })
}

onMounted(async () => {
  await Promise.all([loadVales(), loadPeople()])
})

watch([filterType, filterStatus], () => loadVales())

// =========================
// FILTROS POR TIPO DE PERSONA
// =========================

const partyTypeOptions = [
  { label: 'Empleado', value: 'EMPLOYEE' },
  { label: 'Socio', value: 'PARTNER' }
]

const filteredPeople = computed(() =>
  people.value
    .filter(p => p.type === createForm.value.party_type)
    .map(p => ({ label: p.name, value: p.id }))
)

// =========================
// TIPOS DE VALE POR PERSONA
// =========================

const valeTypeOptions: Record<string, { label: string; value: string; icon: string; description: string }[]> = {
  EMPLOYEE: [
    { label: 'Sueldo', value: 'SUELDO', icon: 'i-lucide-banknote', description: 'Pago de sueldo regular' },
    { label: 'Adelanto', value: 'ADELANTO', icon: 'i-lucide-hand-coins', description: 'Adelanto de sueldo' },
    { label: 'Extras', value: 'EXTRAS', icon: 'i-lucide-gift', description: 'Bonuses, horas extras, comisiones' }
  ],
  PARTNER: [
    { label: 'Retiro', value: 'RETIRO', icon: 'i-lucide-arrow-up-right', description: 'El socio retira dinero' },
    { label: 'Aporte', value: 'APORTE', icon: 'i-lucide-arrow-down-left', description: 'Aporte de capital del socio' },
    { label: 'Reembolso', value: 'REEMBOLSO', icon: 'i-lucide-receipt', description: 'Reembolso de gastos' },
    { label: 'Préstamo', value: 'PRESTAMO', icon: 'i-lucide-hand-coins', description: 'Préstamo de la empresa' }
  ]
}

const availableTypeOptions = computed(() =>
  valeTypeOptions[createForm.value.party_type] || []
)

// =========================
// FILTROS TABLA
// =========================

const filterTypeOptions = [
  { label: 'Sueldo', value: 'SUELDO' },
  { label: 'Adelanto', value: 'ADELANTO' },
  { label: 'Extras', value: 'EXTRAS' },
  { label: 'Retiro', value: 'RETIRO' },
  { label: 'Aporte', value: 'APORTE' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Préstamo', value: 'PRESTAMO' }
]

const statusOptions = [
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Confirmado', value: 'CONFIRMED' },
  { label: 'Pagado', value: 'PAID' },
  { label: 'Anulado', value: 'CANCELLED' }
]

const currencyOptions = [
  { label: 'Peso Argentino (ARS)', value: 'ARS' },
  { label: 'Dólar (USD)', value: 'USD' }
]

// =========================
// HELPERS
// =========================

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '-'
}

// =========================
// ACCIONES
// =========================

async function handleCreate() {
  try {
    await hrStore.createVale(createForm.value)
    showCreateModal.value = false
    resetForm()
    await loadVales()
    toast.add({ title: 'Vale creado', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Error al crear vale', color: 'error' })
  }
}

function resetForm() {
  createForm.value = {
    party_id: '',
    party_type: 'EMPLOYEE',
    type: 'SUELDO',
    amount: 0,
    currency_code: 'ARS',
    date: today(),
    description: ''
  }
}

async function handleConfirm(id: string) {
  try {
    await hrStore.confirmVale(id)
    await loadVales()
    toast.add({ title: 'Vale confirmado', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Error al confirmar vale', color: 'error' })
  }
}

function handleCancel(id: string) {
  cancellingVale.value = vales.value.find(v => v.id === id)
  cancelConfirmText.value = ''
  showCancelModal.value = true
}

async function confirmCancel() {
  if (!cancellingVale.value || cancelConfirmText.value !== 'anular') return
  try {
    await hrStore.cancelVale(cancellingVale.value.id)
    showCancelModal.value = false
    cancellingVale.value = null
    cancelConfirmText.value = ''
    await loadVales()
    toast.add({ title: 'Vale anulado', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Error al anular vale', color: 'error' })
  }
}

// =========================
// TABLA
// =========================

const columns = [
  { id: 'number', header: 'Nº' },
  { id: 'person', header: 'Persona' },
  { id: 'type', header: 'Tipo' },
  { id: 'amount', header: 'Monto' },
  { id: 'date', header: 'Fecha' },
  { id: 'status', header: 'Estado' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Vales RRHH" description="Comprobantes internos de empleados y socios">
      <template #links>
        <UButton label="Nuevo vale" icon="i-lucide-plus" @click="showCreateModal = true" />
      </template>
    </AppPageHeader>

    <!-- Filtros -->
    <div class="flex gap-2 flex-wrap py-4">
      <USelect v-model="filterType" :items="filterTypeOptions" placeholder="Tipo" class="w-40" />
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
            :label="HR_VALE_TYPE_LABELS[row.original.type as keyof typeof HR_VALE_TYPE_LABELS] ?? row.original.type"
            :color="HR_VALE_TYPE_COLORS[row.original.type as keyof typeof HR_VALE_TYPE_COLORS] as any ?? 'neutral'"
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

    <!-- ========================= -->
    <!-- MODAL CREAR VALE          -->
    <!-- ========================= -->
    <UModal v-model:open="showCreateModal" :ui="{ content: 'max-w-4xl' }">
      <template #content>
        <div class="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          <div>
            <h2 class="text-lg font-semibold">Nuevo vale</h2>
            <p class="text-sm text-muted mt-1">Crear comprobante de pago para empleado o socio.</p>
          </div>

          <!-- Tipo de persona -->
          <UFormField label="Tipo de persona" required>
            <div class="flex gap-2">
              <button
                v-for="pt in partyTypeOptions"
                :key="pt.value"
                class="flex-1 px-4 py-3 rounded-lg border-2 text-center transition-colors"
                :class="createForm.party_type === pt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-default hover:border-accented'"
                @click="createForm.party_type = pt.value; createForm.party_id = ''; createForm.type = availableTypeOptions[0]?.value ?? 'SUELDO'"
              >
                <UIcon
                  :name="pt.value === 'EMPLOYEE' ? 'i-lucide-user' : 'i-lucide-users'"
                  class="size-5 mx-auto mb-1"
                  :class="createForm.party_type === pt.value ? 'text-primary-600' : 'text-muted'"
                />
                <p class="text-sm font-medium" :class="createForm.party_type === pt.value ? 'text-primary-700' : 'text-gray-700'">
                  {{ pt.label }}
                </p>
              </button>
            </div>
          </UFormField>

          <!-- Persona filtrada -->
          <UFormField label="Persona" required>
            <USelect
              v-model="createForm.party_id"
              :items="filteredPeople"
              :placeholder="filteredPeople.length ? 'Seleccionar persona...' : 'No hay personas de este tipo'"
              :disabled="!filteredPeople.length"
            />
          </UFormField>

          <!-- Tipo de vale (cards) -->
          <UFormField label="Tipo de vale" required>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                v-for="opt in availableTypeOptions"
                :key="opt.value"
                class="flex flex-col items-center p-3 rounded-lg border-2 text-center transition-colors"
                :class="createForm.type === opt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                  : 'border-default hover:border-accented'"
                @click="createForm.type = opt.value"
              >
                <UIcon
                  :name="opt.icon"
                  class="size-5 mb-1"
                  :class="createForm.type === opt.value ? 'text-primary-600' : 'text-muted'"
                />
                <p class="text-sm font-medium" :class="createForm.type === opt.value ? 'text-primary-700' : 'text-gray-700'">
                  {{ opt.label }}
                </p>
                <p class="text-xs text-muted mt-0.5">{{ opt.description }}</p>
              </button>
            </div>
          </UFormField>

          <!-- Monto + Moneda -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Monto" required>
              <UInput v-model.number="createForm.amount" type="number" placeholder="0.00" :min="0" />
            </UFormField>
            <UFormField label="Moneda" required>
              <USelect v-model="createForm.currency_code" :items="currencyOptions" />
            </UFormField>
          </div>

          <!-- Fecha -->
          <UFormField label="Fecha" required>
            <UInput v-model="createForm.date" type="date" />
          </UFormField>

          <!-- Descripción -->
          <UFormField label="Descripción">
            <UTextarea v-model="createForm.description" placeholder="Motivo del vale (sueldo, adelanto, etc.)" :rows="2" />
          </UFormField>

          <!-- Footer -->
          <div class="flex justify-end gap-2 pt-3 border-t border-default">
            <UButton label="Cancelar" variant="ghost" color="neutral" @click="showCreateModal = false; resetForm()" />
            <UButton
              label="Crear vale"
              icon="i-lucide-plus"
              :disabled="!createForm.party_id || createForm.amount <= 0"
              @click="handleCreate"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- ========================= -->
    <!-- MODAL ANULAR VALE         -->
    <!-- ========================= -->
    <UModal v-model:open="showCancelModal">
      <template #content>
        <div class="p-6 space-y-4">
          <div>
            <h2 class="text-lg font-semibold">Anular vale</h2>
            <p class="text-sm text-muted mt-1">Esta acción no se puede deshacer.</p>
          </div>

          <p class="text-sm text-muted">
            ¿Estás seguro que querés anular el vale
            <span class="font-medium text-highlighted">#{{ cancellingVale?.number }}</span>
            de <span class="font-medium text-highlighted">{{ cancellingVale?.party?.name }}</span>
            por <span class="font-medium text-highlighted">{{ fmt(Number(cancellingVale?.amount ?? 0)) }}</span>?
          </p>

          <p class="text-sm text-muted">
            Para confirmar, escribí
            <span class="font-medium text-highlighted font-mono">anular</span>
            en el campo de abajo.
          </p>

          <UInput v-model="cancelConfirmText" placeholder="anular" />

          <div class="flex justify-end gap-2 pt-3 border-t border-default">
            <UButton label="Cancelar" variant="ghost" color="neutral" @click="showCancelModal = false; cancellingVale = null; cancelConfirmText = ''" />
            <UButton
              label="Anular"
              color="error"
              :loading="loading"
              :disabled="cancelConfirmText !== 'anular'"
              @click="confirmCancel"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
