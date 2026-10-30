<script setup lang="ts">
import type { CheckAlertCard, CheckAlertKind, CheckAlertTone } from '~/modulos/erp/checks/types/check-alerts.types'

defineProps<{
  alerts: CheckAlertCard[]
  activeFilter?: CheckAlertKind | null
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
  <div v-if="alerts.length" class="grid grid-cols-1 items-stretch gap-3" :class="columnsClass(alerts.length)" aria-label="Avisos de cheques">
    <section
      v-for="alert in alerts"
      :key="alert.id"
      class="min-w-0 overflow-hidden rounded-lg border transition-colors"
      :class="[toneStyles[alert.tone].card, activeFilter === alert.id ? toneStyles[alert.tone].active : '']"
    >
      <div class="flex min-h-[4.25rem] items-center gap-2.5 px-3 py-2">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-md" :class="toneStyles[alert.tone].icon">
          <UIcon :name="alert.icon" class="size-4" />
        </span>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <h3 class="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-highlighted" :title="alert.title">
            {{ alert.title }}
          </h3>
          <UBadge :color="alert.tone" variant="subtle" size="xs">{{ alert.count }}</UBadge>
        </div>
        <UButton
          :label="activeFilter === alert.id ? 'Quitar filtro' : alert.actionLabel"
          :color="alert.tone"
          variant="soft"
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
        class="border-t border-default/70 px-3 py-2.5 pl-[3.125rem]"
      >
        <p class="text-xs leading-5 text-muted">{{ alert.description }}</p>
      </div>
    </section>
  </div>
</template>
