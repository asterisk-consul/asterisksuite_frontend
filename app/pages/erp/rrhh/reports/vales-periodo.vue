<script setup lang="ts">
import { useHrStore } from '~/modulos/erp/hr/stores/hr.store'
import { HR_VALE_TYPE_LABELS, HR_VALE_TYPE_COLORS } from '~/modulos/erp/hr/types/hr.types'

definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const hrStore = useHrStore()
const vales = computed(() => hrStore.vales)
const loading = computed(() => hrStore.loading)

const dateFrom = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
const dateTo = ref(new Date().toISOString().split('T')[0])
const filterType = ref('')

async function loadReport() {
  await hrStore.fetchVales({
    ...(filterType.value ? { type: filterType.value } : {}),
  })
}

onMounted(() => loadReport())

watch([dateFrom, dateTo, filterType], () => loadReport())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('es-AR') : '-'
}

const filteredVales = computed(() => {
  return vales.value.filter((v) => {
    const d = v.date?.split('T')[0] ?? v.date
    return d >= dateFrom.value && d <= dateTo.value
  })
})

const totalRetiros = computed(() =>
  filteredVales.value
    .filter((v) => v.type === 'RETIRO' || v.type === 'ADELANTO')
    .reduce((sum, v) => sum + Number(v.amount), 0)
)

const totalCreditos = computed(() =>
  filteredVales.value
    .filter((v) => v.type === 'REEMBOLSO' || v.type === 'PRESTAMO')
    .reduce((sum, v) => sum + Number(v.amount), 0)
)

const columns = [
  { id: 'number', header: 'Nº' },
  { id: 'person', header: 'Persona' },
  { id: 'type', header: 'Tipo' },
  { id: 'amount', header: 'Monto' },
  { id: 'date', header: 'Fecha' },
  { id: 'status', header: 'Estado' },
]

const typeOptions = [
  { label: 'Todos', value: '' },
  { label: 'Retiro', value: 'RETIRO' },
  { label: 'Adelanto', value: 'ADELANTO' },
  { label: 'Reembolso', value: 'REEMBOLSO' },
  { label: 'Préstamo', value: 'PRESTAMO' },
]
</script>

<template>
  <UPage>
    <AppPageHeader title="Vales por período" description="Detalle de vales en un rango de fechas" />

    <!-- Filtros -->
    <div class="flex gap-3 flex-wrap items-end">
      <div class="space-y-1">
        <label class="text-xs text-muted">Desde</label>
        <UInput v-model="dateFrom" type="date" />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-muted">Hasta</label>
        <UInput v-model="dateTo" type="date" />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-muted">Tipo</label>
        <USelect v-model="filterType" :items="typeOptions" class="w-40" />
      </div>
    </div>

    <!-- Resumen -->
    <div class="grid grid-cols-2 gap-4">
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Total débitos (retiros + adelantos)</p>
          <p class="text-xl font-semibold text-error">{{ fmt(totalRetiros) }}</p>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="space-y-1">
          <p class="text-xs text-muted">Total créditos (reembolsos + préstamos)</p>
          <p class="text-xl font-semibold text-success">{{ fmt(totalCreditos) }}</p>
        </div>
      </UPageCard>
    </div>

    <!-- Tabla -->
    <UPageCard variant="subtle">
      <UTable :data="filteredVales" :columns="columns" :loading="loading">
        <template #number-cell="{ row }">
          <span class="font-mono font-medium">#{{ row.original.number }}</span>
        </template>

        <template #person-cell="{ row }">
          {{ row.original.party?.name ?? '-' }}
        </template>

        <template #type-cell="{ row }">
          <UBadge
            :label="HR_VALE_TYPE_LABELS[row.original.type as keyof typeof HR_VALE_TYPE_LABELS]"
            :color="(HR_VALE_TYPE_COLORS[row.original.type as keyof typeof HR_VALE_TYPE_COLORS] ?? 'neutral') as any"
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
          {{ row.original.status }}
        </template>
      </UTable>
    </UPageCard>
  </UPage>
</template>
