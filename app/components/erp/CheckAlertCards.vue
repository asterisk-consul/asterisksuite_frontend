<script setup lang="ts">
import type { CheckAlertCard, CheckAlertKind, CheckAlertTone } from '~/modulos/erp/checks/types/check-alerts.types'

const props = defineProps<{
  alerts: CheckAlertCard[]
  activeFilter?: CheckAlertKind | null
  filteredTotals?: Array<{ currency_code: string; amount: number }>
  variant?: 'default' | 'attention'
}>()

const emit = defineEmits<{
  select: [id: CheckAlertKind]
}>()

const expandedAlerts = ref(new Set<CheckAlertKind>())

const isExpanded = (id: CheckAlertKind) => expandedAlerts.value.has(id)

function toggleExpanded(id: CheckAlertKind) {
  const next = new Set(expandedAlerts.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedAlerts.value = next
}

function formatTotals(alert: CheckAlertCard) {
  const totals = props.activeFilter === alert.id && props.filteredTotals ? props.filteredTotals : alert.totals
  return (totals ?? [])
    .map(total => new Intl.NumberFormat('es-AR', { style: 'currency', currency: total.currency_code || 'ARS', currencyDisplay: 'code', maximumFractionDigits: 2 }).format(total.amount))
    .join(' · ')
}

const columnsClass = (count: number) => count > 2
  ? 'md:grid-cols-2 xl:grid-cols-3'
  : count > 1 ? 'md:grid-cols-2' : ''

const toneStyles: Record<CheckAlertTone, { card: string; active: string; icon: string }> = {
  warning: {
    card: 'border-warning/30 bg-warning/5',
    active: 'border-warning/60 bg-warning/10 ring-1 ring-warning/40',
    icon: 'bg-warning/10 text-warning'
  },
  primary: {
    card: 'border-primary/30 bg-primary/5',
    active: 'border-primary/60 bg-primary/10 ring-1 ring-primary/40',
    icon: 'bg-primary/10 text-primary'
  },
  info: {
    card: 'border-info/30 bg-info/5',
    active: 'border-info/60 bg-info/10 ring-1 ring-info/40',
    icon: 'bg-info/10 text-info'
  }
}
</script>

<template>
  <div v-if="alerts.length" class="grid grid-cols-1 items-stretch gap-3" :class="variant === 'attention' ? '' : columnsClass(alerts.length)" aria-label="Avisos de cheques">
    <section
      v-for="alert in alerts"
      :key="alert.id"
      class="min-w-0 overflow-hidden rounded-lg border transition-colors"
      :class="[
        variant === 'attention'
          ? ['border-default bg-elevated/30 border-l-2', alert.tone === 'warning' ? 'border-l-warning/70' : 'border-l-primary/70']
          : toneStyles[alert.tone].card,
        activeFilter === alert.id ? toneStyles[alert.tone].active : ''
      ]"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3" :class="variant === 'attention' ? 'sm:flex-nowrap' : ''">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-md" :class="toneStyles[alert.tone].icon">
          <UIcon :name="alert.icon" class="size-4" />
        </span>
        <div class="min-w-0 flex-1 basis-[calc(100%-3rem)]" :class="variant === 'attention' ? 'sm:basis-auto' : ''">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 class="text-sm font-semibold leading-5 text-highlighted">{{ alert.title }}</h3>
            <UBadge :color="alert.tone" variant="subtle" size="xs">{{ alert.count }} {{ alert.count === 1 ? 'cheque' : 'cheques' }}</UBadge>
          </div>
          <p v-if="variant === 'attention'" class="mt-0.5 text-xs text-muted">{{ alert.id === 'own' ? 'Vencimiento alcanzado · verificá el débito real.' : 'Vencidos o con vencimiento hoy · revisá su depósito, cobro o aplicación a un pago.' }}</p>
        </div>
        <p
          v-if="alert.totals !== undefined || activeFilter === alert.id && filteredTotals"
          class="min-w-0 break-words text-sm font-semibold tabular-nums text-highlighted"
          :class="variant === 'attention' ? 'ml-11 sm:ml-0 sm:max-w-[35%] sm:text-right' : 'ml-11 flex-1'"
        >{{ formatTotals(alert) || 'Sin importe comprometido' }}</p>
        <UButton
          :label="activeFilter === alert.id ? 'Quitar filtro' : alert.actionLabel"
          :color="alert.tone"
          :variant="variant === 'attention' ? 'outline' : 'soft'"
          size="xs"
          :trailing-icon="activeFilter === alert.id ? 'i-lucide-x' : 'i-lucide-arrow-right'"
          class="shrink-0"
          :aria-pressed="activeFilter !== undefined ? activeFilter === alert.id : undefined"
          @click="emit('select', alert.id)"
        />
        <UButton
          :icon="isExpanded(alert.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          color="neutral"
          variant="ghost"
          size="xs"
          class="shrink-0"
          :aria-label="isExpanded(alert.id) ? `Contraer ${alert.title}` : `Ver información de ${alert.title}`"
          :aria-expanded="isExpanded(alert.id)"
          :aria-controls="`check-alert-details-${alert.id}`"
          @click="toggleExpanded(alert.id)"
        />
      </div>

      <div
        v-if="isExpanded(alert.id)"
        :id="`check-alert-details-${alert.id}`"
        class="flex flex-col gap-3 border-t border-default/70 px-3 py-2.5 pl-[3.125rem]"
      >
        <p class="text-xs leading-5 text-muted">{{ alert.description }}</p>
        <slot name="details" :alert="alert" />
      </div>
    </section>
  </div>
</template>
