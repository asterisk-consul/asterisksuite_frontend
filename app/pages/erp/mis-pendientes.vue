<script setup lang="ts">
import type { DashboardPersonal, PersonalActivity } from '~/modulos/erp/dashboard/types/dashboard.types'
import { useDashboardDataService } from '~/modulos/erp/dashboard/services/dashboard-data.service'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Mi actividad | AsteriskSuite' })

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref('')
const data = ref<DashboardPersonal | null>(null)
const service = useDashboardDataService()
const selectedDate = ref(isDateKey(route.query.date) ? String(route.query.date) : argentinaDateKey())
const activitySearch = ref('')
const pendingSearch = ref('')
const selectedType = ref<'ALL' | 'DOCUMENT' | 'CAPTURE' | 'TASK'>('ALL')
const pendingSection = ref<HTMLElement | null>(null)
let loadRequest = 0

const typeOptions = [
  { label: 'Todo', value: 'ALL' },
  { label: 'Documentos', value: 'DOCUMENT' },
  { label: 'Capturas', value: 'CAPTURE' },
  { label: 'Tareas', value: 'TASK' },
]
const pendingKindLabels = {
  DOCUMENT: 'Documento',
  CAPTURE: 'Captura',
  TASK: 'Tarea',
} as const
const pendingKindSearchLabels = {
  DOCUMENT: 'Documento Documentos',
  CAPTURE: 'Captura Capturas',
  TASK: 'Tarea Tareas',
} as const

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day
}

function argentinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`
}

const today = computed(() => argentinaDateKey())
const dayTitle = computed(() => new Intl.DateTimeFormat('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
}).format(new Date(`${selectedDate.value}T12:00:00-03:00`)))
const selectedIsToday = computed(() => selectedDate.value === today.value)

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchesSearch(search: string, values: Array<string | null | undefined>) {
  const terms = normalizeSearch(search).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const normalized = normalizeSearch(values.filter(Boolean).join(' '))
  return terms.every(term => normalized.includes(term))
}

const filteredActivities = computed(() => (data.value?.todayActivities ?? []).filter(activity =>
  matchesSearch(activitySearch.value, [activity.title, activity.table, activity.detail, activity.action]),
))
const filteredCompletedTasks = computed(() => (data.value?.completedTasks ?? []).filter(task =>
  matchesSearch(activitySearch.value, [task.title, task.board]),
))
const filteredPendingItems = computed(() => (data.value?.pendingItems ?? []).filter(item => {
  if (selectedType.value !== 'ALL' && item.kind !== selectedType.value) return false
  return matchesSearch(pendingSearch.value, [item.title, item.detail, item.reference, item.status, pendingKindSearchLabels[item.kind], formatDate(item.date)])
}))
const hasPendingFilters = computed(() => !!pendingSearch.value.trim() || selectedType.value !== 'ALL')

function clearPendingFilters() {
  pendingSearch.value = ''
  selectedType.value = 'ALL'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value))
}

function activityIcon(activity: PersonalActivity) {
  if (activity.kind === 'checks') return 'i-lucide-landmark'
  if (activity.kind === 'payments') return 'i-lucide-wallet'
  if (activity.kind === 'tasks') return 'i-lucide-list-checks'
  if (activity.kind === 'documents') return 'i-lucide-file-text'
  if (activity.kind === 'products') return 'i-lucide-package'
  return 'i-lucide-plus'
}

function statusColor(status: string) {
  if (status === 'Borrador') return 'neutral'
  if (status === 'Pendiente') return 'warning'
  return status === 'En proceso' ? 'info' : 'warning'
}

async function load(date = selectedDate.value, page = 1, append = false) {
  const request = ++loadRequest
  if (append) loadingMore.value = true
  else loading.value = true
  loadError.value = ''
  try {
    const result = await service.findPersonal({ date, activity_page: page })
    if (request !== loadRequest) return
    if (append && data.value) {
      data.value = { ...result, todayActivities: [...data.value.todayActivities, ...result.todayActivities] }
    } else {
      data.value = result
    }
  } catch {
    if (request === loadRequest) loadError.value = 'No pudimos cargar la agenda. Revisá la conexión e intentá nuevamente.'
  } finally {
    if (request === loadRequest) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

async function selectDate(date: string) {
  if (!isDateKey(date)) return
  selectedDate.value = date
  activitySearch.value = ''
  await router.replace({ query: { ...route.query, date } })
  await load(date)
}

function shiftDate(amount: number) {
  const [year = 1970, month = 1, day = 1] = selectedDate.value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  void selectDate(key)
}

async function loadMoreActivities() {
  if (!data.value?.activityHasMore || loadingMore.value) return
  await load(selectedDate.value, data.value.activityPage + 1, true)
}

async function goToToday() {
  await selectDate(today.value)
}

watch(() => route.query.date, (value) => {
  if (isDateKey(value) && value !== selectedDate.value) {
    selectedDate.value = value
    void load(value)
  }
})

onMounted(async () => {
  await load()
  if (route.query.view === 'pending') {
    await nextTick()
    pendingSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>

<template>
  <UPage class="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-10">
    <AppPageHeader title="Mi actividad" description="Revisá lo que registraste, las tareas que resolviste y lo que te queda pendiente, día por día.">
      <template #links>
        <UButton v-if="data?.tasksEnabled" label="Abrir tareas" icon="i-lucide-list-checks" to="/erp/tasks" color="neutral" variant="outline" />
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load()" />
      </template>
    </AppPageHeader>

    <section class="flex flex-col gap-4">
      <UPageCard variant="subtle">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" aria-label="Día anterior" @click="shiftDate(-1)" />
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">Agenda del día</p>
              <h2 class="truncate text-lg font-semibold capitalize text-highlighted">{{ dayTitle }}</h2>
            </div>
            <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" aria-label="Día siguiente" :disabled="selectedIsToday || selectedDate > today" @click="shiftDate(1)" />
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <UInput :model-value="selectedDate" type="date" aria-label="Elegir día de la agenda" @update:model-value="selectDate(String($event))" />
            <UButton v-if="!selectedIsToday" label="Hoy" icon="i-lucide-calendar-days" color="primary" variant="soft" @click="goToToday" />
          </div>
        </div>
      </UPageCard>

      <div class="grid gap-3 sm:grid-cols-3">
        <UPageCard variant="subtle" class="border-primary/20 bg-primary/5">
          <div class="flex items-center justify-between gap-3"><div><p class="text-xs text-muted">Registros cargados</p><p class="mt-1 text-2xl font-semibold tabular-nums">{{ data?.activityCount ?? '—' }}</p></div><UIcon name="i-lucide-plus" class="size-5 text-primary" /></div>
          <p class="mt-1 text-xs text-muted">En {{ dayTitle }}</p>
        </UPageCard>
        <UPageCard v-if="data?.tasksEnabled" variant="subtle" class="border-success/20 bg-success/5">
          <div class="flex items-center justify-between gap-3"><div><p class="text-xs text-muted">Tareas resueltas</p><p class="mt-1 text-2xl font-semibold tabular-nums">{{ data.completedTasksCount }}</p></div><UIcon name="i-lucide-circle-check" class="size-5 text-success" /></div>
          <p class="mt-1 text-xs text-muted">Completadas por vos ese día</p>
        </UPageCard>
        <UPageCard variant="subtle" class="border-info/20 bg-info/5" :class="data?.tasksEnabled ? '' : 'sm:col-span-2'">
          <div class="flex items-center justify-between gap-3"><div><p class="text-xs text-muted">Pendientes actuales</p><p class="mt-1 text-2xl font-semibold tabular-nums">{{ data?.pendingDocuments ?? '—' }}</p></div><UIcon name="i-lucide-clipboard-list" class="size-5 text-info" /></div>
          <p class="mt-1 text-xs text-muted">Documentos, capturas y tareas que te toca resolver</p>
        </UPageCard>
      </div>

      <UAlert v-if="loadError" color="error" variant="subtle" title="No se pudo cargar la agenda" :description="loadError" />

      <div class="grid min-w-0 gap-4 xl:grid-cols-2">
        <UPageCard variant="subtle" class="min-w-0">
          <div class="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 flex-1"><h2 class="font-semibold">Lo que cargaste</h2><p class="truncate text-sm text-muted">{{ filteredActivities.length }} de {{ data?.activityCount ?? 0 }} registros · {{ dayTitle }}</p></div>
            <UInput v-model="activitySearch" icon="i-lucide-search" placeholder="Buscar en el día…" class="w-full min-w-0 sm:w-56 sm:shrink-0 xl:w-64" />
          </div>
          <div v-if="loading" class="space-y-3"><USkeleton v-for="index in 4" :key="index" class="h-14 w-full rounded-lg" /></div>
          <div v-else-if="filteredActivities.length" role="region" aria-label="Actividad del día" tabindex="0" class="relative ml-2 max-h-[30rem] space-y-1 overflow-y-auto overscroll-contain border-l border-default pl-4 pr-2">
            <template v-for="activity in filteredActivities" :key="activity.id">
              <NuxtLink v-if="activity.to" :to="activity.to" class="group relative flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/30">
                <span class="absolute -left-[1.35rem] mt-1.5 size-2.5 rounded-full border-2 border-primary bg-default" />
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon :name="activityIcon(activity)" class="size-4" /></span>
                <span class="min-w-0 flex-1"><span class="flex flex-wrap items-center gap-x-2"><span class="font-medium">{{ activity.title }}</span><span class="text-xs text-muted">{{ activity.action }}</span></span><span v-if="activity.detail" class="mt-0.5 block truncate text-sm text-muted">{{ activity.detail }}</span></span>
                <time class="shrink-0 pt-1 text-xs text-muted">{{ formatTime(activity.date) }}</time>
                <UIcon name="i-lucide-chevron-right" class="mt-1 size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </NuxtLink>
              <div v-else class="relative flex items-start gap-3 rounded-lg px-2 py-3">
                <span class="absolute -left-[1.35rem] mt-1.5 size-2.5 rounded-full border-2 border-default bg-default" />
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/40 text-muted"><UIcon :name="activityIcon(activity)" class="size-4" /></span>
                <span class="min-w-0 flex-1"><span class="flex flex-wrap items-center gap-x-2"><span class="font-medium">{{ activity.title }}</span><span class="text-xs text-muted">{{ activity.action }}</span></span><span v-if="activity.detail" class="mt-0.5 block truncate text-sm text-muted">{{ activity.detail }}</span></span>
                <time class="shrink-0 pt-1 text-xs text-muted">{{ formatTime(activity.date) }}</time>
              </div>
            </template>
          </div>
          <div v-else-if="!loading" class="rounded-lg border border-dashed border-default px-4 py-10 text-center">
            <UIcon name="i-lucide-calendar-search" class="mx-auto size-8 text-muted" />
            <p class="mt-2 font-medium">No hay registros para mostrar</p>
            <p class="mt-1 text-sm text-muted">{{ activitySearch ? 'Probá con otra búsqueda.' : 'Cuando cargues un comprobante, pago, cheque u otro registro, va a aparecer acá.' }}</p>
          </div>
          <div v-if="data?.activityHasMore && !activitySearch" class="mt-3 flex justify-center border-t border-default pt-3">
            <UButton label="Cargar actividad anterior" icon="i-lucide-history" color="neutral" variant="outline" size="sm" :loading="loadingMore" @click="loadMoreActivities" />
          </div>
        </UPageCard>

        <UPageCard v-if="data?.tasksEnabled" variant="subtle" class="min-w-0">
          <div class="mb-4"><h2 class="font-semibold">Tareas que resolviste</h2><p class="text-sm text-muted">Finalizadas por vos el {{ dayTitle }}</p></div>
          <div v-if="filteredCompletedTasks.length" class="divide-y divide-default">
            <NuxtLink v-for="task in filteredCompletedTasks" :key="task.id" :to="task.to" class="group flex items-center gap-3 py-3 transition-colors hover:bg-muted/20 sm:px-2">
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-circle-check" class="size-5" /></span>
              <span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ task.title }}</span><span class="block truncate text-xs text-muted">{{ task.board }}</span></span>
              <time class="shrink-0 text-xs text-muted">{{ formatTime(task.date) }}</time>
              <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
            </NuxtLink>
          </div>
          <div v-else class="rounded-lg border border-dashed border-default px-4 py-10 text-center">
            <UIcon name="i-lucide-check-check" class="mx-auto size-8 text-muted" />
            <p class="mt-2 font-medium">No hay tareas resueltas este día</p>
            <p class="mt-1 text-sm text-muted">Las tareas que marques como finalizadas van a quedar registradas acá.</p>
          </div>
        </UPageCard>
      </div>

      <section ref="pendingSection" class="scroll-mt-4">
      <UPageCard variant="subtle">
        <div class="mb-4 flex min-w-0 flex-col gap-3">
          <div class="min-w-0"><h2 class="font-semibold">Pendientes</h2><p class="text-sm text-muted">{{ filteredPendingItems.length }} de {{ data?.pendingItems.length ?? 0 }} por resolver, sin importar la fecha elegida arriba.</p></div>
          <div class="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <UInput v-model="pendingSearch" icon="i-lucide-search" placeholder="Buscar pendiente…" class="w-full min-w-0" />
            <USelect v-model="selectedType" :items="typeOptions.filter(option => option.value !== 'TASK' || data?.tasksEnabled)" value-key="value" class="w-full min-w-0" aria-label="Filtrar tipo de pendiente" />
          </div>
        </div>
        <div v-if="loading" class="space-y-3"><USkeleton v-for="index in 3" :key="index" class="h-16 w-full rounded-lg" /></div>
        <div v-else-if="filteredPendingItems.length" role="region" aria-label="Pendientes por resolver" tabindex="0" class="max-h-[30rem] divide-y divide-default overflow-y-auto overscroll-contain pr-2">
          <NuxtLink v-for="item in filteredPendingItems" :key="`${item.kind}-${item.id}`" :to="item.to" class="group flex items-center gap-3 py-3 transition-colors hover:bg-muted/20 sm:px-2">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg" :class="item.kind === 'CAPTURE' ? 'bg-amber-500/10 text-amber-500' : item.kind === 'TASK' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'">
              <UIcon :name="item.kind === 'CAPTURE' ? 'i-lucide-paperclip' : item.kind === 'TASK' ? 'i-lucide-list-checks' : 'i-lucide-file-text'" class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2"><span class="truncate font-medium">{{ item.title }}</span><UBadge :label="item.status" :color="statusColor(item.status)" variant="subtle" size="xs" /><UBadge :label="pendingKindLabels[item.kind]" color="neutral" variant="outline" size="xs" /></span>
              <span class="mt-0.5 block truncate text-sm text-muted">{{ item.detail || 'Sin contraparte' }}</span>
              <span v-if="item.reference" class="mt-0.5 block truncate text-xs text-muted">{{ item.reference }}</span>
            </span>
            <time class="hidden shrink-0 text-xs text-muted sm:block">{{ item.kind === 'TASK' ? 'Vence ' : '' }}{{ formatDate(item.date) }}</time>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </NuxtLink>
        </div>
        <div v-else-if="!loading" class="flex flex-col items-center py-10 text-center">
          <div class="mb-3 grid size-11 place-items-center rounded-2xl bg-success/10 text-success"><UIcon name="i-lucide-check-check" class="size-5" /></div>
          <h3 class="font-semibold">{{ hasPendingFilters ? 'No hay coincidencias' : 'No tenés pendientes' }}</h3>
          <p class="mt-1 max-w-md text-sm text-muted">{{ hasPendingFilters ? 'Probá con otro texto o tipo de pendiente.' : 'Cuando te asignen un documento o una tarea, o recibas una captura, va a aparecer acá.' }}</p>
          <UButton v-if="hasPendingFilters" class="mt-3" label="Limpiar filtros" color="neutral" variant="outline" size="sm" @click="clearPendingFilters" />
        </div>
      </UPageCard>
      </section>
    </section>
  </UPage>
</template>
