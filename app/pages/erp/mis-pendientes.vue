<script setup lang="ts">
import type { DashboardPersonal } from '~/modulos/erp/dashboard/types/dashboard.types'

definePageMeta({ middleware: ['auth'] })

const loading = ref(true)
const loadError = ref('')
const data = ref<DashboardPersonal | null>(null)
const search = ref('')
const selectedType = ref<'ALL' | 'DOCUMENT' | 'CAPTURE'>('ALL')

const typeOptions = [
  { label: 'Todo', value: 'ALL' },
  { label: 'Documentos', value: 'DOCUMENT' },
  { label: 'Capturas', value: 'CAPTURE' },
]

const filteredItems = computed(() => {
  const normalizedSearch = search.value.trim().toLocaleLowerCase('es-AR')
  return (data.value?.pendingItems ?? []).filter((item) => {
    if (selectedType.value !== 'ALL' && item.kind !== selectedType.value) return false
    if (!normalizedSearch) return true
    return `${item.title} ${item.detail} ${item.status}`.toLocaleLowerCase('es-AR').includes(normalizedSearch)
  })
})

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await $fetch<DashboardPersonal>('/api/backend/dashboard/personal')
  } catch {
    loadError.value = 'No pudimos cargar tus pendientes. Revisá la conexión e intentá nuevamente.'
  } finally {
    loading.value = false
  }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value))
const statusColor = (status: string) => status === 'Borrador' ? 'neutral' : status === 'En proceso' ? 'info' : 'warning'

onMounted(load)
</script>

<template>
  <UPage class="flex-1 space-y-5 overflow-y-auto px-4 pb-10">
    <AppPageHeader title="Mis pendientes" description="Documentos y comprobantes que tenés que completar o revisar en esta empresa.">
      <template #links>
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load" />
      </template>
    </AppPageHeader>

    <section class="grid gap-4 sm:grid-cols-3">
      <UPageCard variant="subtle" class="sm:col-span-1">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-clipboard-list" class="size-5" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{{ data?.pendingDocuments ?? '—' }}</p>
            <p class="text-sm text-muted">Tareas por resolver</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle" class="sm:col-span-2">
        <p class="text-sm leading-6 text-muted">Acá aparecen los documentos pendientes que te asignaron —o que creaste sin asignar— y las capturas que recibiste para completar. Al abrir uno vas directamente al registro.</p>
      </UPageCard>
    </section>

    <UAlert v-if="loadError" color="error" variant="subtle" title="No se pudieron cargar los pendientes" :description="loadError" />

    <UPageCard variant="subtle">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">Tareas para resolver</h2>
          <p class="text-sm text-muted">{{ filteredItems.length }} de {{ data?.pendingItems.length ?? 0 }} registros</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar pendiente…" class="sm:w-64" />
          <USelect v-model="selectedType" :items="typeOptions" value-key="value" class="sm:w-40" aria-label="Filtrar tipo de pendiente" />
        </div>
      </div>

      <div v-if="loading" class="space-y-3">
        <USkeleton v-for="index in 4" :key="index" class="h-20 w-full rounded-xl" />
      </div>
      <div v-else-if="filteredItems.length" class="divide-y divide-default">
        <NuxtLink
          v-for="item in filteredItems"
          :key="`${item.kind}-${item.id}`"
          :to="item.to"
          class="group flex items-center gap-3 py-4 transition-colors hover:bg-muted/20 sm:px-3"
        >
          <div class="grid size-10 shrink-0 place-items-center rounded-xl" :class="item.kind === 'CAPTURE' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'">
            <UIcon :name="item.kind === 'CAPTURE' ? 'i-lucide-paperclip' : 'i-lucide-file-text'" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate font-medium">{{ item.title }}</p>
              <UBadge :label="item.status" :color="statusColor(item.status)" variant="subtle" size="xs" />
              <UBadge :label="item.kind === 'CAPTURE' ? 'Captura' : 'Documento'" color="neutral" variant="outline" size="xs" />
            </div>
            <p class="mt-1 truncate text-sm text-muted">{{ item.detail || 'Sin detalle adicional' }}</p>
          </div>
          <time class="hidden shrink-0 text-xs text-muted sm:block">{{ formatDate(item.date) }}</time>
          <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </NuxtLink>
      </div>
      <div v-else-if="!loading" class="flex flex-col items-center py-12 text-center">
        <div class="mb-3 grid size-12 place-items-center rounded-2xl bg-success/10 text-success">
          <UIcon name="i-lucide-check-check" class="size-6" />
        </div>
        <h3 class="font-semibold">No tenés pendientes</h3>
        <p class="mt-1 max-w-md text-sm text-muted">Cuando te asignen un documento o recibas un comprobante para completar, va a aparecer acá.</p>
      </div>
    </UPageCard>
  </UPage>
</template>
