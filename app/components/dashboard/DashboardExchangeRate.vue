<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

interface DollarQuote {
  moneda: string
  casa: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion: string
}

const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canViewHistory = computed(() => isOwnerOrAdmin.value || hasPermission('currency_rates.read'))

const { data, status, refresh } = useLazyFetch<DollarQuote[]>('/api/dolar', {
  server: false,
  default: () => [],
})

const quotes = computed(() => {
  const preferred = ['oficial', 'blue']
  return preferred
    .map(casa => data.value.find(quote => quote.casa?.toLowerCase() === casa))
    .filter((quote): quote is DollarQuote => Boolean(quote))
})

const updatedAt = computed(() => {
  const raw = quotes.value[0]?.fechaActualizacion
  if (!raw) return 'Esperando actualización'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return 'Actualizado hoy'
  return `Actualizado ${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)}`
})

const formatRate = (value: number | null) => value == null
  ? '—'
  : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value)
</script>

<template>
  <UPageCard variant="subtle" class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="grid size-9 place-items-center rounded-xl bg-success/10 text-success">
            <UIcon name="i-lucide-badge-dollar-sign" class="size-5" />
          </div>
          <div>
            <h3 class="text-sm font-semibold">Dólar del día</h3>
            <p class="text-xs text-muted">{{ updatedAt }}</p>
          </div>
        </div>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="xs" :loading="status === 'pending'" aria-label="Actualizar cotización" @click="refresh()" />
      </div>
    </template>

    <div v-if="status === 'pending' && quotes.length === 0" class="space-y-3">
      <USkeleton v-for="index in 2" :key="index" class="h-20 rounded-xl" />
    </div>

    <div v-else-if="quotes.length" class="space-y-3">
      <div v-for="(quote, index) in quotes" :key="quote.casa" class="rounded-xl border border-default p-3" :class="index === 0 ? 'bg-success/5' : 'bg-info/5'">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-semibold">{{ quote.nombre }}</span>
          <UBadge :label="quote.casa.toUpperCase()" :color="index === 0 ? 'success' : 'info'" variant="soft" size="xs" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-wide text-muted">Compra</p>
            <p class="text-base font-semibold tabular-nums">{{ formatRate(quote.compra) }}</p>
          </div>
          <div class="border-l border-default pl-3">
            <p class="text-[11px] uppercase tracking-wide text-muted">Venta</p>
            <p class="text-base font-semibold tabular-nums">{{ formatRate(quote.venta) }}</p>
          </div>
        </div>
      </div>
      <NuxtLink v-if="canViewHistory" to="/settings/monedas" class="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline">
        Ver cotizaciones <UIcon name="i-lucide-arrow-right" class="size-3.5" />
      </NuxtLink>
    </div>

    <div v-else class="flex flex-col items-center py-6 text-center">
      <UIcon name="i-lucide-cloud-off" class="mb-2 size-6 text-muted" />
      <p class="text-sm font-medium">Cotización no disponible</p>
      <p class="mt-1 text-xs text-muted">Conservá el formulario abierto y volvé a intentar.</p>
      <UButton label="Reintentar" variant="ghost" size="xs" class="mt-2" @click="refresh()" />
    </div>
  </UPageCard>
</template>
