<script setup lang="ts">
import { useDocumentAuditorService, type DocumentActivityEvent } from './document-auditor.service'

const props = defineProps<{ documentId: string }>()
const service = useDocumentAuditorService()
const events = ref<DocumentActivityEvent[]>([])
const loading = ref(false)
const failed = ref(false)

watch(() => props.documentId, async (id, _, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  loading.value = true
  failed.value = false
  try {
    const result = await service.findActivity(id)
    if (!stale) events.value = result
  } catch {
    if (!stale) failed.value = true
  } finally {
    if (!stale) loading.value = false
  }
}, { immediate: true })

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function eventIcon(type: string) {
  if (type === 'STATUS_CHANGED') return 'i-lucide-arrow-right-left'
  if (type === 'DELIVERY_STATUS_CHANGED') return 'i-lucide-truck'
  if (type === 'AUDITOR_ASSIGNED') return 'i-lucide-eye'
  if (type === 'RESPONSIBLE_ASSIGNED') return 'i-lucide-user-round-pen'
  return 'i-lucide-file-plus-2'
}
</script>

<template>
  <details class="group rounded-lg border border-default bg-default print:hidden">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
      <span class="flex items-center gap-2 font-medium">
        <UIcon name="i-lucide-history" class="size-4 text-info" />
        Seguimiento y auditoría
      </span>
      <span class="flex items-center gap-2 text-xs text-muted">
        {{ events.length }} evento(s)
        <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
      </span>
    </summary>
    <div class="border-t border-default px-3 py-3">
      <p v-if="loading" class="text-sm text-muted">Cargando historial…</p>
      <UAlert v-else-if="failed" color="warning" variant="subtle" title="No se pudo cargar el historial" />
      <p v-else-if="!events.length" class="text-sm text-muted">Todavía no hay movimientos registrados.</p>
      <ol v-else class="flex flex-col gap-3">
        <li v-for="event in events" :key="event.id" class="flex gap-3">
          <span class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
            <UIcon :name="eventIcon(event.event_type)" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm">{{ event.message }}</p>
            <p class="mt-0.5 text-xs text-muted">
              {{ event.actor ? `Por ${event.actor.name} · ` : '' }}{{ formatDate(event.created_at) }}
            </p>
          </div>
        </li>
      </ol>
    </div>
  </details>
</template>
