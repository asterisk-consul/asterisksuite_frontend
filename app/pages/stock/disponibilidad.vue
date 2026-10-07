<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

type WarehouseAvailability = {
  id: string
  name: string
  code?: string | null
  quantity: number
  reserved: number
  available: number
}

type TransitArrival = {
  container_id: string
  operation_id: string
  container_number: string
  status: string
  estimated_arrival_date?: string | null
  actual_arrival_date?: string | null
  arrival_date_source?: 'CONTAINER' | 'OPERATION' | null
  quantity: number
  reserved: number
  available_on_arrival: number
  within_window: boolean
}

type ProductAvailability = {
  id: string
  name: string
  sku?: string | null
  unit: string
  physical_stock: number
  reserved_total: number
  reserved_physical: number
  reserved_transit: number
  available_now: number
  transit_stock: number
  arriving_within_days: number
  available_within_days: number
  warehouses: WarehouseAvailability[]
  arrivals: TransitArrival[]
}

type AvailabilityResponse = {
  data: ProductAvailability[]
  meta: { total: number; page: number; limit: number; pages: number; days: number }
}

const route = useRoute()
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const days = ref(30)
const page = ref(1)
const loading = ref(false)
const products = ref<ProductAvailability[]>([])
const meta = ref<AvailabilityResponse['meta']>({ total: 0, page: 1, limit: 25, pages: 0, days: 30 })
const expanded = ref(new Set<string>())
const toast = useToast()
let searchTimer: ReturnType<typeof setTimeout> | undefined

function changePage(delta: number) {
  page.value += delta
}

const dayOptions = [
  { label: '7 días', value: 7 },
  { label: '15 días', value: 15 },
  { label: '30 días', value: 30 },
  { label: '60 días', value: 60 },
  { label: '90 días', value: 90 }
]

const formatQuantity = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value)
const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
  : 'Sin fecha estimada'

async function load() {
  loading.value = true
  try {
    const response = await $fetch<AvailabilityResponse>('/api/backend/warehouse/stock/reports/availability', {
      query: { search: search.value || undefined, days: days.value, page: page.value, limit: 25 }
    })
    products.value = response.data
    meta.value = response.meta
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar la disponibilidad', description: error?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

function toggleProduct(id: string) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
watch(days, () => { page.value = 1; load() })
watch(page, load)
onMounted(load)
</script>

<template>
  <UPage class="space-y-5 px-4 pb-8">
    <AppPageHeader
      title="Disponibilidad de stock"
      description="Consultá qué puede entregarse hoy y qué mercadería llegará en los próximos días."
    />

    <UPageCard>
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <UFormField label="Buscar producto" hint="Nombre o código">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Ej. Bulto o BUL2025" class="w-full" />
        </UFormField>
        <UFormField label="Proyección de entrega">
          <USelect v-model="days" :items="dayOptions" value-key="value" label-key="label" class="w-full" />
        </UFormField>
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load" />
      </div>
    </UPageCard>

    <UPageCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1180px] text-sm">
          <thead class="border-b border-default bg-elevated/50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-4 py-3">Producto</th>
              <th class="px-4 py-3 text-right">Stock físico</th>
              <th class="px-4 py-3 text-right">Reservado hoy</th>
              <th class="px-4 py-3 text-right">Disponible hoy</th>
              <th class="px-4 py-3 text-right">En tránsito</th>
              <th class="px-4 py-3 text-right">Llega en {{ days }} días</th>
              <th class="px-4 py-3 text-right">Disponible proyectado</th>
              <th class="px-4 py-3">Próximo arribo</th>
              <th class="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <template v-for="product in products" :key="product.id">
              <tr class="border-b border-default hover:bg-elevated/40">
                <td class="px-4 py-3">
                  <NuxtLink :to="`/productos/${product.id}`" class="font-medium text-highlighted hover:text-primary">{{ product.name }}</NuxtLink>
                  <p class="text-xs text-muted">{{ product.sku || 'Sin código' }} · {{ product.unit }}</p>
                </td>
                <td class="px-4 py-3 text-right font-medium">{{ formatQuantity(product.physical_stock) }}</td>
                <td class="px-4 py-3 text-right">
                  <UBadge :label="formatQuantity(product.reserved_physical)" :color="product.reserved_physical > 0 ? 'warning' : 'neutral'" variant="subtle" />
                </td>
                <td class="px-4 py-3 text-right">
                  <span :class="product.available_now > 0 ? 'font-semibold text-success' : 'font-medium text-error'">{{ formatQuantity(product.available_now) }}</span>
                </td>
                <td class="px-4 py-3 text-right font-medium text-info">{{ formatQuantity(product.transit_stock) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-info">{{ formatQuantity(product.arriving_within_days) }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatQuantity(product.available_within_days) }}</td>
                <td class="px-4 py-3">
                  <template v-if="product.arrivals[0]">
                    <p class="font-medium">{{ formatDate(product.arrivals[0].actual_arrival_date || product.arrivals[0].estimated_arrival_date) }}</p>
                    <p class="text-xs text-muted">Contenedor {{ product.arrivals[0].container_number }}</p>
                    <p v-if="product.arrivals[0].arrival_date_source === 'OPERATION'" class="text-xs text-muted">Fecha tomada de la operación</p>
                  </template>
                  <span v-else class="text-muted">Sin arribos</span>
                </td>
                <td class="px-4 py-3">
                  <UButton
                    :icon="expanded.has(product.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    color="neutral"
                    variant="ghost"
                    square
                    :aria-label="expanded.has(product.id) ? 'Ocultar detalle' : 'Ver detalle'"
                    @click="toggleProduct(product.id)"
                  />
                </td>
              </tr>
              <tr v-if="expanded.has(product.id)" class="border-b border-default bg-elevated/20">
                <td colspan="9" class="px-4 py-4">
                  <div class="grid gap-4 lg:grid-cols-2">
                    <div class="rounded-lg border border-default bg-default p-4">
                      <h3 class="mb-3 flex items-center gap-2 font-medium"><UIcon name="i-lucide-warehouse" /> Depósitos</h3>
                      <div v-if="product.warehouses.length" class="space-y-2">
                        <NuxtLink v-for="warehouse in product.warehouses" :key="warehouse.id" :to="`/productos/warehouses/${warehouse.id}`" class="grid grid-cols-[1fr_repeat(3,90px)] gap-2 rounded-md px-2 py-2 hover:bg-elevated">
                          <span><strong>{{ warehouse.name }}</strong><small class="ml-1 text-muted">{{ warehouse.code }}</small></span>
                          <span class="text-right">{{ formatQuantity(warehouse.quantity) }} físico</span>
                          <span class="text-right text-warning">{{ formatQuantity(warehouse.reserved) }} reservado</span>
                          <span class="text-right font-medium text-success">{{ formatQuantity(warehouse.available) }} disponible</span>
                        </NuxtLink>
                      </div>
                      <p v-else class="text-sm text-muted">No hay stock en depósitos reales.</p>
                    </div>

                    <div class="rounded-lg border border-default bg-default p-4">
                      <h3 class="mb-3 flex items-center gap-2 font-medium"><UIcon name="i-lucide-ship" /> Mercadería en tránsito</h3>
                      <div v-if="product.arrivals.length" class="space-y-2">
                        <NuxtLink v-for="arrival in product.arrivals" :key="arrival.container_id" :to="`/operaciones-internacionales/${arrival.operation_id}/containers/${arrival.container_id}`" class="block rounded-md px-2 py-2 hover:bg-elevated">
                          <div class="flex items-center justify-between gap-3">
                            <strong>Contenedor {{ arrival.container_number }}</strong>
                            <UBadge :label="arrival.status" color="info" variant="subtle" />
                          </div>
                          <div class="mt-1 grid grid-cols-3 gap-2 text-xs text-muted">
                            <span>{{ formatQuantity(arrival.quantity) }} en tránsito</span>
                            <span>{{ formatQuantity(arrival.reserved) }} reservado · {{ formatQuantity(arrival.available_on_arrival) }} libre</span>
                            <span>
                              {{ formatDate(arrival.actual_arrival_date || arrival.estimated_arrival_date) }}
                              <span v-if="arrival.arrival_date_source === 'OPERATION'" class="text-muted"> · fecha de la operación</span>
                            </span>
                          </div>
                        </NuxtLink>
                      </div>
                      <p v-else class="text-sm text-muted">No hay mercadería en tránsito.</p>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="p-8 text-center text-muted"><UIcon name="i-lucide-loader-circle" class="mr-2 animate-spin" /> Calculando disponibilidad…</div>
      <div v-else-if="!products.length" class="p-10 text-center text-muted">No se encontraron productos.</div>

      <div v-if="meta.pages > 1" class="flex items-center justify-between border-t border-default px-4 py-3">
        <span class="text-sm text-muted">{{ meta.total }} productos · Página {{ meta.page }} de {{ meta.pages }}</span>
        <div class="flex gap-2">
          <UButton label="Anterior" color="neutral" variant="outline" :disabled="page <= 1" @click="changePage(-1)" />
          <UButton label="Siguiente" color="neutral" variant="outline" :disabled="page >= meta.pages" @click="changePage(1)" />
        </div>
      </div>
    </UPageCard>
  </UPage>
</template>
