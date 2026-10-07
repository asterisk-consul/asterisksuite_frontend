<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

type Row = {
  id: string
  product: { id: string; name: string; sku?: string | null; type: string }
  warehouse: { id: string; name: string; code?: string | null } | null
  unit: string
  reorder_point: number
  target_stock: number
  lead_time_days: number
  physical_stock: number
  reserved: number
  available_now: number
  transit_total: number
  arriving_within_lead_time: number
  transit_pending_assignment: number
  projected_available: number
  suggested_quantity: number
  status: 'CRITICAL' | 'REORDER' | 'COVERED' | 'OK' | 'UNCONFIGURED'
}

const rows = ref<Row[]>([])
const loading = ref(false)
const search = ref('')
const status = ref('')
const showUnconfigured = ref(false)
const page = ref(1)
const meta = ref({ total: 0, page: 1, limit: 25, pages: 0, summary: {} as Record<string, number> })
const toast = useToast()
let timer: ReturnType<typeof setTimeout> | undefined

const statusOptions = [
  { label: 'Todos los estados', value: '' },
  { label: 'Críticos', value: 'CRITICAL' },
  { label: 'Para reponer', value: 'REORDER' },
  { label: 'Cubiertos por arribos', value: 'COVERED' },
  { label: 'Correctos', value: 'OK' },
  { label: 'Sin configuración', value: 'UNCONFIGURED' }
]
const statusMeta = {
  CRITICAL: { label: 'Crítico', color: 'error', icon: 'i-lucide-circle-alert' },
  REORDER: { label: 'Reponer', color: 'warning', icon: 'i-lucide-package-plus' },
  COVERED: { label: 'Cubierto', color: 'info', icon: 'i-lucide-ship' },
  OK: { label: 'Correcto', color: 'success', icon: 'i-lucide-circle-check' },
  UNCONFIGURED: { label: 'Sin configurar', color: 'neutral', icon: 'i-lucide-settings' }
} as const
const counts = computed(() => meta.value.summary)
const format = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value)

async function load() {
  loading.value = true
  try {
    const response = await $fetch<{ data: Row[]; meta: typeof meta.value }>('/api/backend/warehouse/replenishment/report', {
      query: {
        search: search.value || undefined,
        status: status.value || undefined,
        include_unconfigured: showUnconfigured.value ? 'true' : undefined,
        page: page.value,
        limit: 25
      }
    })
    rows.value = response.data
    meta.value = response.meta
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar la reposición', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

function selectStatus(value: string) {
  if (value === 'UNCONFIGURED') showUnconfigured.value = true
  status.value = status.value === value ? '' : value
}

watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; load() }, 350)
})
watch(status, () => { page.value = 1; load() })
watch(showUnconfigured, (enabled) => {
  if (!enabled && status.value === 'UNCONFIGURED') status.value = ''
  page.value = 1
  load()
})
watch(page, load)
onMounted(load)
</script>

<template>
  <UPage class="space-y-5 px-4 pb-8">
    <AppPageHeader title="Reposición de stock" description="Detectá faltantes, considerá los arribos próximos y prepará las cantidades a reponer." />

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <button v-for="item in statusOptions.slice(1)" :key="item.value" type="button" class="rounded-xl border p-4 text-left transition hover:border-primary" :class="status === item.value ? 'border-primary bg-primary/5' : 'border-default bg-default'" @click="selectStatus(item.value)">
        <div class="flex items-center justify-between"><UIcon :name="statusMeta[item.value as keyof typeof statusMeta].icon" class="size-5 text-muted" /><span class="text-2xl font-bold">{{ counts[item.value] ?? '—' }}</span></div>
        <p class="mt-2 text-sm font-medium">{{ item.label }}</p>
      </button>
    </div>

    <UPageCard>
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto_auto] md:items-end">
        <UFormField label="Buscar producto" hint="Nombre o código"><UInput v-model="search" icon="i-lucide-search" placeholder="Buscar…" class="w-full" /></UFormField>
        <UFormField label="Estado"><USelect v-model="status" :items="statusOptions" value-key="value" class="w-full" /></UFormField>
        <UButton
          :label="showUnconfigured ? 'Ocultar sin configurar' : 'Incluir sin configurar'"
          :icon="showUnconfigured ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          :color="showUnconfigured ? 'primary' : 'neutral'"
          :variant="showUnconfigured ? 'soft' : 'outline'"
          @click="showUnconfigured = !showUnconfigured"
        />
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load" />
      </div>
    </UPageCard>

    <UPageCard :ui="{ body: 'p-0 sm:p-0' }">
      <div v-if="loading" class="p-8"><UProgress /></div>
      <div v-else-if="!rows.length" class="p-10 text-center text-muted"><UIcon name="i-lucide-package-search" class="mx-auto mb-3 size-8" /><p>No hay productos para los filtros seleccionados.</p></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1280px] text-sm">
          <thead class="border-b border-default bg-elevated/50 text-left text-xs uppercase text-muted"><tr><th class="px-4 py-3">Estado</th><th class="px-4 py-3">Producto</th><th class="px-4 py-3">Depósito</th><th class="px-4 py-3 text-right">Disponible</th><th class="px-4 py-3 text-right">Reservado</th><th class="px-4 py-3 text-right">Arribo próximo</th><th class="px-4 py-3 text-right">Proyectado</th><th class="px-4 py-3 text-right">Punto</th><th class="px-4 py-3 text-right">Objetivo</th><th class="px-4 py-3 text-right">Sugerido</th><th class="px-4 py-3">Acción</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-b border-default hover:bg-elevated/40">
              <td class="px-4 py-3"><UBadge :color="statusMeta[row.status].color" variant="subtle"><UIcon :name="statusMeta[row.status].icon" class="mr-1 size-3.5" />{{ statusMeta[row.status].label }}</UBadge></td>
              <td class="px-4 py-3"><NuxtLink :to="`/productos/${row.product.id}/edit`" class="font-medium text-highlighted hover:text-primary">{{ row.product.name }}</NuxtLink><p class="text-xs text-muted">{{ row.product.sku || 'Sin código' }} · {{ row.unit }}</p></td>
              <td class="px-4 py-3">{{ row.warehouse?.name || 'Todos los depósitos' }}<p v-if="row.warehouse?.code" class="text-xs text-muted">{{ row.warehouse.code }}</p></td>
              <td class="px-4 py-3 text-right font-semibold">{{ format(row.available_now) }}</td>
              <td class="px-4 py-3 text-right text-warning">{{ format(row.reserved) }}</td>
              <td class="px-4 py-3 text-right text-info">{{ format(row.arriving_within_lead_time) }}<p v-if="row.transit_pending_assignment" class="text-xs">sin asignar</p></td>
              <td class="px-4 py-3 text-right font-semibold">{{ format(row.projected_available) }}</td>
              <td class="px-4 py-3 text-right">{{ row.status === 'UNCONFIGURED' ? '—' : format(row.reorder_point) }}</td>
              <td class="px-4 py-3 text-right">{{ row.status === 'UNCONFIGURED' ? '—' : format(row.target_stock) }}</td>
              <td class="px-4 py-3 text-right text-base font-bold" :class="row.suggested_quantity > 0 ? 'text-primary' : ''">{{ row.status === 'UNCONFIGURED' ? '—' : format(row.suggested_quantity) }}</td>
              <td class="px-4 py-3"><UButton :to="`/productos/${row.product.id}/edit`" :label="row.status === 'UNCONFIGURED' ? 'Configurar' : 'Editar política'" size="xs" variant="outline" icon="i-lucide-settings" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="meta.pages > 1" class="flex items-center justify-between border-t border-default p-4"><p class="text-sm text-muted">Página {{ meta.page }} de {{ meta.pages }} · {{ meta.total }} resultados</p><div class="flex gap-2"><UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" :disabled="page <= 1" @click="() => { page-- }" /><UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" :disabled="page >= meta.pages" @click="() => { page++ }" /></div></div>
    </UPageCard>
  </UPage>
</template>
