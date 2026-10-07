<script setup lang="ts">
defineProps<{
  availability?: any
  loading?: boolean
}>()

const formatQuantity = (value: unknown) => Number(value ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 3 })
const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  : 'Sin fecha estimada'

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  AVAILABLE: { label: 'Disponible', color: 'success', icon: 'i-lucide-circle-check' },
  PARTIAL: { label: 'Stock parcial', color: 'warning', icon: 'i-lucide-triangle-alert' },
  NO_PHYSICAL_STOCK: { label: 'Sin stock físico', color: 'error', icon: 'i-lucide-circle-x' },
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="flex min-h-40 items-center justify-center text-muted">
      <UIcon name="i-lucide-loader-circle" class="mr-2 size-5 animate-spin" />
      Consultando stock actualizado…
    </div>

    <template v-else-if="availability">
      <UAlert
        v-if="availability.summary?.without_physical_stock"
        color="warning"
        variant="subtle"
        icon="i-lucide-warehouse"
        :title="`${availability.summary.without_physical_stock} producto${availability.summary.without_physical_stock === 1 ? '' : 's'} sin stock físico`"
        description="La mercadería en tránsito se informa por separado y todavía no está disponible para entregar."
      />
      <UAlert
        v-else
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        title="Hay stock físico para todos los productos"
        description="La disponibilidad considera las cantidades que ya están reservadas."
      />

      <div class="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
        <UCard v-for="item in availability.items" :key="item.item_id" variant="subtle">
          <div class="space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium">{{ item.name }}</p>
                <p class="text-xs text-muted">{{ item.sku || 'Sin SKU' }} · {{ item.unit }}</p>
              </div>
              <UBadge
                :label="statusConfig[item.status]?.label || item.status"
                :color="(statusConfig[item.status]?.color as any) || 'neutral'"
                variant="subtle"
                :icon="statusConfig[item.status]?.icon"
              />
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div class="rounded-lg bg-elevated/60 p-2.5">
                <p class="text-xs text-muted">Solicitado</p>
                <p class="font-semibold tabular-nums">{{ formatQuantity(item.requested) }}</p>
              </div>
              <div class="rounded-lg bg-elevated/60 p-2.5">
                <p class="text-xs text-muted">Disponible ahora</p>
                <p class="font-semibold tabular-nums" :class="item.available_now ? 'text-success' : 'text-error'">{{ formatQuantity(item.available_now) }}</p>
              </div>
              <div class="rounded-lg bg-elevated/60 p-2.5">
                <p class="text-xs text-muted">Reservado</p>
                <p class="font-semibold tabular-nums">{{ formatQuantity(item.reserved_physical) }}</p>
              </div>
              <div class="rounded-lg bg-elevated/60 p-2.5">
                <p class="text-xs text-muted">En tránsito disponible</p>
                <p class="font-semibold tabular-nums text-info">{{ formatQuantity(item.transit_available) }}</p>
              </div>
            </div>

            <div v-if="item.warehouses?.length" class="space-y-1.5">
              <p class="text-xs font-medium text-muted">Depósitos físicos</p>
              <div v-for="warehouse in item.warehouses" :key="warehouse.id" class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2 text-sm">
                <span class="truncate">{{ warehouse.name }}<span v-if="warehouse.code" class="text-muted"> · {{ warehouse.code }}</span></span>
                <span class="shrink-0 tabular-nums"><strong>{{ formatQuantity(warehouse.available) }}</strong> disponibles</span>
              </div>
            </div>
            <p v-else class="text-sm text-muted">No hay existencias en depósitos físicos.</p>

            <div v-if="item.arrivals?.length" class="space-y-1.5">
              <p class="text-xs font-medium text-muted">Próximos arribos</p>
              <div v-for="(arrival, index) in item.arrivals" :key="arrival.container_id || index" class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-2 text-sm">
                <span>{{ arrival.container_number ? `Contenedor ${arrival.container_number}` : 'Mercadería en tránsito' }}</span>
                <span class="text-muted">{{ formatQuantity(arrival.available) }} · {{ formatDate(arrival.arrival_date) }}</span>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
