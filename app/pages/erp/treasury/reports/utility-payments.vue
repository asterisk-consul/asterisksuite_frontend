<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

const dateFrom = ref(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
const dateTo = ref(new Date().toISOString().split('T')[0])

const data = ref<{ months: string[]; parties: any[] }>({ months: [], parties: [] })
const loading = ref(false)

async function loadReport() {
  loading.value = true
  try {
    data.value = await $fetch('/api/erp/treasury/utility-payments', {
      query: { date_from: dateFrom.value, date_to: dateTo.value }
    })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadReport())

watch([dateFrom, dateTo], () => loadReport())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

function fmtMonth(m: string) {
  const [year, month] = m.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
}

const monthlyTotals = computed(() => {
  const totals: Record<string, number> = {}
  for (const party of data.value.parties) {
    for (const [month, amount] of Object.entries(party.months)) {
      totals[month] = (totals[month] ?? 0) + (amount as number)
    }
  }
  return totals
})

const grandTotal = computed(() =>
  data.value.parties.reduce((sum, p) => sum + p.total, 0)
)

const avgMonthly = computed(() => {
  const months = data.value.months.length
  return months > 0 ? grandTotal.value / months : 0
})
</script>

<template>
  <UPage>
    <AppPageHeader title="Servicios mensuales" description="Pagos a servicios: EPEC, internet, agua, etc." />

    <!-- Filtros -->
    <div class="flex gap-3 items-end">
      <div class="space-y-1">
        <label class="text-xs text-muted">Desde</label>
        <UInput v-model="dateFrom" type="date" />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-muted">Hasta</label>
        <UInput v-model="dateTo" type="date" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <!-- Sin datos -->
    <div v-else-if="data.parties.length === 0" class="text-center py-8 text-muted text-sm">
      No hay pagos a servicios en el período seleccionado.
    </div>

    <!-- Contenido -->
    <div v-else class="space-y-6">
      <!-- Resumen -->
      <div class="grid grid-cols-3 gap-4">
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Total pagado</p>
            <p class="text-xl font-semibold text-primary">{{ fmt(grandTotal) }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Promedio mensual</p>
            <p class="text-xl font-semibold">{{ fmt(avgMonthly) }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Servicios</p>
            <p class="text-xl font-semibold text-info">{{ data.parties.length }}</p>
          </div>
        </UPageCard>
      </div>

      <!-- Tabla -->
      <UPageCard variant="subtle">
        <template #header>
          <h3 class="text-sm font-semibold">Detalle por servicio y mes</h3>
        </template>

        <div class="overflow-auto max-h-[60vh]">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-default z-10">
              <tr class="border-b border-default">
                <th class="text-left py-2 px-3 text-xs font-medium text-muted">Servicio</th>
                <th
                  v-for="month in data.months"
                  :key="month"
                  class="text-right py-2 px-3 text-xs font-medium text-muted"
                >
                  {{ fmtMonth(month) }}
                </th>
                <th class="text-right py-2 px-3 text-xs font-medium text-muted font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="party in data.parties"
                :key="party.party_id"
                class="border-b border-default hover:bg-muted/30"
              >
                <td class="py-2 px-3 font-medium">{{ party.party_name }}</td>
                <td
                  v-for="month in data.months"
                  :key="month"
                  class="py-2 px-3 text-right font-mono text-xs"
                >
                  {{ party.months[month] ? fmt(party.months[month]) : '—' }}
                </td>
                <td class="py-2 px-3 text-right font-semibold">{{ fmt(party.total) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-default font-semibold">
                <td class="py-2 px-3 text-right">Total mensual:</td>
                <td
                  v-for="month in data.months"
                  :key="month"
                  class="py-2 px-3 text-right font-mono text-xs"
                >
                  {{ fmt(monthlyTotals[month] ?? 0) }}
                </td>
                <td class="py-2 px-3 text-right text-primary">{{ fmt(grandTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </UPageCard>
    </div>
  </UPage>
</template>
