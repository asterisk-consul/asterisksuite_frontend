<script setup lang="ts">
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import { formatDate } from '~/utils/dates'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const fiscalService = useFiscalService()
const toast = useToast()

interface WithholdingRow {
  id: string
  direction: string
  tax_type: string
  withheld_amount: string | number
  base_amount: string | number
  rate: string | number | null
  date: string
  status: string
  certificate_number: string | null
  business_party?: { id: string; name: string; tax_id: string | null } | null
  jurisdiction?: { id: string; code: string; name: string } | null
  payment?: { id: string; number: number; type: string; date: string } | null
}

const items = ref<WithholdingRow[]>([])
const totalWithheld = ref(0)
const loading = ref(false)

const filters = reactive({
  direction: '',
  tax_type: '',
  date_from: '',
  date_to: ''
})

const directionOptions = [
  { label: 'Practicada (retuvimos)', value: 'PRACTICADA' },
  { label: 'Sufrida (nos retuvieron)', value: 'SUFRIDA' }
]

const taxTypeOptions = ['GANANCIAS', 'IIBB', 'SUSS', 'IVA']

const columns = [
  { accessorKey: 'date', header: 'Fecha' },
  { accessorKey: 'party', header: 'Tercero' },
  { accessorKey: 'direction', header: 'Dirección' },
  { accessorKey: 'tax_type', header: 'Impuesto' },
  { accessorKey: 'jurisdiction', header: 'Jurisdicción' },
  { accessorKey: 'base_amount', header: 'Base' },
  { accessorKey: 'rate', header: 'Alíc.' },
  { accessorKey: 'withheld_amount', header: 'Retención' },
  { accessorKey: 'certificate_number', header: 'Certificado' },
  { accessorKey: 'status', header: 'Estado' }
]

const formatCurrency = (amount: number | string | null | undefined) => {
  const n = Number(amount ?? 0)
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
}

const fetchWithholdings = async () => {
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (filters.direction) query.direction = filters.direction
    if (filters.tax_type) query.tax_type = filters.tax_type
    if (filters.date_from) query.date_from = filters.date_from
    if (filters.date_to) query.date_to = filters.date_to
    const res = await $fetch<{ items: WithholdingRow[]; total_withheld: number }>('/api/erp/fiscal/withholdings', { query })
    items.value = res.items
    totalWithheld.value = res.total_withheld
  } catch (e: any) {
    console.error('Error cargando retenciones:', e)
    toast.add({ title: 'Error cargando retenciones', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchWithholdings)
</script>

<template>
  <div class="max-w-7xl mx-auto p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Retenciones</h1>
        <p class="text-sm text-muted">Histórico de retenciones practicadas y sufridas</p>
      </div>
      <UBadge :label="`Total: ${formatCurrency(totalWithheld)}`" color="primary" size="lg" variant="subtle" />
    </div>

    <!-- Filtros -->
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <USelectMenu
          v-model="filters.direction"
          :items="directionOptions"
          value-key="value"
          placeholder="Dirección"
        />
        <USelectMenu
          v-model="filters.tax_type"
          :items="taxTypeOptions"
          placeholder="Impuesto"
        />
        <UInput v-model="filters.date_from" type="date" placeholder="Desde" />
        <div class="flex gap-2">
          <UInput v-model="filters.date_to" type="date" placeholder="Hasta" class="flex-1" />
          <UButton icon="i-lucide-search" @click="fetchWithholdings" />
        </div>
      </div>
    </UCard>

    <!-- Tabla -->
    <UCard>
      <div v-if="loading" class="text-center py-8 text-muted">Cargando…</div>
      <div v-else-if="items.length === 0" class="text-center py-8 text-muted text-sm">
        Sin retenciones registradas con estos filtros.
      </div>
      <UTable v-else :data="items" :columns="columns">
        <template #date-cell="{ row }">
          {{ formatDate(row.original.date) }}
        </template>
        <template #party-cell="{ row }">
          <div>
            <div class="font-medium">{{ row.original.business_party?.name ?? '—' }}</div>
            <div class="text-xs text-muted">{{ row.original.business_party?.tax_id ?? '' }}</div>
          </div>
        </template>
        <template #direction-cell="{ row }">
          <UBadge
            :label="row.original.direction === 'PRACTICADA' ? 'Practicada' : 'Sufrida'"
            :color="row.original.direction === 'PRACTICADA' ? 'warning' : 'info'"
            variant="subtle"
            size="xs"
          />
        </template>
        <template #tax_type-cell="{ row }">
          {{ row.original.tax_type }}
        </template>
        <template #jurisdiction-cell="{ row }">
          {{ row.original.jurisdiction?.name ?? '—' }}
        </template>
        <template #base_amount-cell="{ row }">
          {{ formatCurrency(row.original.base_amount) }}
        </template>
        <template #rate-cell="{ row }">
          {{ row.original.rate != null ? `${Number(row.original.rate)}%` : '—' }}
        </template>
        <template #withheld_amount-cell="{ row }">
          <span class="font-medium">{{ formatCurrency(row.original.withheld_amount) }}</span>
        </template>
        <template #certificate_number-cell="{ row }">
          {{ row.original.certificate_number ?? '—' }}
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.status"
            :color="row.original.status === 'APPLIED' ? 'success' : row.original.status === 'CANCELLED' ? 'error' : 'neutral'"
            variant="subtle"
            size="xs"
          />
        </template>
      </UTable>
    </UCard>
  </div>
</template>
