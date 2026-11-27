<script setup lang="ts">
import { useTasksService, type SharedTaskRecord, type SharedTaskSubtask } from '~/modulos/erp/tasks/tasks.service'
import { formatTaskDuration } from '~/modulos/erp/tasks/task-time.utils'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Tareas compartidas | AsteriskSuite' })

const service = useTasksService()
const records = ref<SharedTaskRecord[]>([])
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const view = ref<'LIST' | 'TIMELINE' | 'CALENDAR'>('LIST')
const monthCursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const rangeStart = computed(() => new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth(), 1))
const rangeEnd = computed(() => new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth() + 2, 0))

const filteredRecords = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  if (!term) return records.value
  return records.value.filter(({ source_company, task }) => [source_company.name, task.key, task.title, task.status, ...task.subtasks.map(item => `${item.key} ${item.title}`)].some(value => value.toLocaleLowerCase('es').includes(term)))
})
const totalTrackedMinutes = computed(() => filteredRecords.value.reduce((sum, row) => sum + row.task.total_work_minutes, 0))
const totalRemainingMinutes = computed(() => filteredRecords.value.reduce((sum, row) => sum + row.task.total_remaining_minutes, 0))

const calendarDays = computed(() => {
  const first = new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const dateKey = toDateKey(date)
    const events = filteredRecords.value.flatMap(record => [
      { key: record.task.key, title: record.task.title, status: record.task.status, start: eventDate(record.task.start_at, record.task.due_at), end: record.task.due_at?.slice(0, 10) ?? eventDate(record.task.start_at, record.task.due_at), company: record.source_company.name, minutes: record.task.total_work_minutes, remaining: record.task.remaining_minutes != null || record.task.total_remaining_minutes > 0 ? record.task.total_remaining_minutes : null },
      ...record.task.subtasks.map(subtask => ({ key: subtask.key, title: subtask.title, status: subtask.status, start: eventDate(subtask.start_at, subtask.due_at), end: subtask.due_at?.slice(0, 10) ?? eventDate(subtask.start_at, subtask.due_at), company: record.source_company.name, minutes: subtask.work_minutes, remaining: subtask.remaining_minutes })),
    ]).filter(event => event.start && event.start <= dateKey && event.end >= dateKey)
    return { date, dateKey, inMonth: date.getMonth() === monthCursor.value.getMonth(), events }
  })
})

const timelineRows = computed(() => filteredRecords.value.flatMap(record => [
      { key: record.task.key, title: record.task.title, description: record.task.description, company: record.source_company.name, start_at: record.task.start_at, due_at: record.task.due_at, done: !!record.task.completed_at, root: true, minutes: record.task.total_work_minutes, remaining: record.task.remaining_minutes != null || record.task.total_remaining_minutes > 0 ? record.task.total_remaining_minutes : null, subtasks_count: record.task.subtasks_count, completed_subtasks_count: record.task.completed_subtasks_count },
      ...record.task.subtasks.map((subtask: SharedTaskSubtask) => ({ key: subtask.key, title: subtask.title, description: subtask.description, company: record.source_company.name, start_at: subtask.start_at, due_at: subtask.due_at, done: !!subtask.completed_at, root: false, minutes: subtask.work_minutes, remaining: subtask.remaining_minutes, subtasks_count: subtask.subtasks_count, completed_subtasks_count: subtask.completed_subtasks_count })),
]))

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function eventDate(start?: string | null, due?: string | null) {
  return due?.slice(0, 10) ?? start?.slice(0, 10) ?? ''
}
function dateLabel(value?: string | null, empty = 'Sin fecha') {
  if (!value) return empty
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
function timeLabel(minutes: number) {
  return formatTaskDuration(minutes)
}
function descriptionText(value?: string | null) {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
function progressPercent(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}
function priorityColor(priority: string) {
  return ({ URGENT: 'error', HIGH: 'warning', NORMAL: 'neutral', LOW: 'info' } as Record<string, string>)[priority] ?? 'neutral'
}
function shiftMonth(delta: number) {
  monthCursor.value = new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth() + delta, 1)
}
function timelineStyle(start?: string | null, due?: string | null) {
  const from = start ? new Date(start) : due ? new Date(due) : rangeStart.value
  const to = due ? new Date(due) : from
  const total = Math.max(1, Math.ceil((rangeEnd.value.getTime() - rangeStart.value.getTime()) / 86_400_000) + 1)
  const left = Math.max(0, Math.min(total - 1, Math.floor((from.getTime() - rangeStart.value.getTime()) / 86_400_000)))
  const right = Math.max(left, Math.min(total - 1, Math.floor((to.getTime() - rangeStart.value.getTime()) / 86_400_000)))
  return { left: `${(left / total) * 100}%`, width: `${Math.max(1.5, ((right - left + 1) / total) * 100)}%` }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try { records.value = await service.getSharedTasks() }
  catch (error: any) { errorMessage.value = error?.data?.message ?? error?.message ?? 'No se pudieron cargar las tareas compartidas.' }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <UPage class="mx-auto flex w-full min-w-0 max-w-full flex-col gap-5 px-4 pb-10 sm:px-6">
    <AppPageHeader title="Tareas compartidas" description="Consultá las tareas de tu empresa que otros equipos compartieron con vos." />
    <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-lucide-circle-alert" title="No se pudieron cargar las tareas" :description="errorMessage" />
    <UPageCard variant="subtle" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar tarea o empresa…" class="min-w-56 flex-1" />
        <div class="flex gap-1 rounded-lg border border-default p-1">
          <UButton label="Lista" icon="i-lucide-list" :color="view === 'LIST' ? 'primary' : 'neutral'" :variant="view === 'LIST' ? 'subtle' : 'ghost'" size="sm" @click="view = 'LIST'" />
          <UButton label="Cronograma" icon="i-lucide-chart-gantt" :color="view === 'TIMELINE' ? 'primary' : 'neutral'" :variant="view === 'TIMELINE' ? 'subtle' : 'ghost'" size="sm" @click="view = 'TIMELINE'" />
          <UButton label="Calendario" icon="i-lucide-calendar-days" :color="view === 'CALENDAR' ? 'primary' : 'neutral'" :variant="view === 'CALENDAR' ? 'subtle' : 'ghost'" size="sm" @click="view = 'CALENDAR'" />
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 text-sm text-muted"><UIcon name="i-lucide-clock-3" class="size-4"/><span>Tiempo empleado:</span><strong class="text-highlighted">{{ timeLabel(totalTrackedMinutes) }}</strong><span v-if="totalRemainingMinutes" class="ml-2 inline-flex items-center gap-1"><UIcon name="i-lucide-hourglass" class="size-4"/>Restante: <strong class="text-warning">{{ timeLabel(totalRemainingMinutes) }}</strong></span><span>· {{ filteredRecords.length }} tareas</span></div>

      <div v-if="loading" class="grid gap-3"><USkeleton v-for="index in 3" :key="index" class="h-24 w-full" /></div>
      <div v-else-if="!filteredRecords.length" class="flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-default p-6 text-center"><UIcon name="i-lucide-inbox" class="size-8 text-muted"/><h2 class="font-semibold">Todavía no hay tareas compartidas</h2><p class="max-w-lg text-sm text-muted">Cuando una empresa te comparta una tarea asociada a tu cliente, aparecerá acá con su avance y tiempo registrado.</p></div>

      <div v-else-if="view === 'LIST'" class="flex flex-col gap-3">
        <article v-for="record in filteredRecords" :key="record.share_id" class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/20 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0"><p class="mb-1 flex items-center gap-1.5 text-xs text-muted"><UIcon name="i-lucide-building-2" class="size-3.5"/>{{ record.source_company.name }}</p><h2 class="text-base font-semibold"><span class="mr-2 font-mono text-primary">{{ record.task.key }}</span>{{ record.task.title }}</h2><p v-if="descriptionText(record.task.description)" class="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">{{ descriptionText(record.task.description) }}</p></div>
            <div class="flex flex-wrap items-center gap-2"><UBadge :color="record.task.status_closed ? 'success' : 'neutral'" variant="subtle">{{ record.task.status }}</UBadge><UBadge :color="priorityColor(record.task.priority) as any" variant="subtle">{{ record.task.priority }}</UBadge></div>
          </div>
          <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-calendar-days" class="size-4"/>{{ dateLabel(record.task.start_at, 'Sin inicio') }}</span><span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-calendar-clock" class="size-4"/>{{ dateLabel(record.task.due_at, 'Sin vencimiento') }}</span><span class="inline-flex items-center gap-1.5 text-highlighted"><UIcon name="i-lucide-clock-3" class="size-4"/>{{ timeLabel(record.task.total_work_minutes) }} empleado</span><span v-if="record.task.remaining_minutes != null || record.task.total_remaining_minutes > 0" class="inline-flex items-center gap-1.5 text-warning"><UIcon name="i-lucide-hourglass" class="size-4"/>{{ timeLabel(record.task.total_remaining_minutes) }} restante</span><span v-if="record.task.subtasks_count" class="text-muted">{{ record.task.completed_subtasks_count }}/{{ record.task.subtasks_count }} subtareas completas</span></div>
          <div v-if="record.task.subtasks_count" class="flex items-center gap-2"><div class="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-muted/30"><div class="h-full rounded-full bg-primary transition-[width]" :style="{ width: `${progressPercent(record.task.completed_subtasks_count, record.task.subtasks_count)}%` }" /></div><span class="shrink-0 text-xs text-muted">{{ progressPercent(record.task.completed_subtasks_count, record.task.subtasks_count) }}% · {{ record.task.completed_subtasks_count }}/{{ record.task.subtasks_count }} subtareas</span></div>
          <div v-if="record.task.subtasks.length" class="flex flex-col gap-2 border-l-2 border-primary/30 pl-3">
            <div v-for="subtask in record.task.subtasks" :key="subtask.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-elevated/30 px-3 py-2 text-sm" :style="{ marginLeft: `${Math.max(0, ((subtask.depth ?? 1) - 1) * 1)}rem` }">
              <div class="min-w-0"><div><span class="mr-2 font-mono text-xs text-primary">{{ subtask.key }}</span><span class="font-medium">{{ subtask.title }}</span><span class="ml-2 text-xs text-muted">{{ subtask.status }}</span></div><p v-if="descriptionText(subtask.description)" class="mt-0.5 line-clamp-2 text-xs text-muted">{{ descriptionText(subtask.description) }}</p><div v-if="subtask.subtasks_count" class="mt-1 flex items-center gap-2"><div class="h-1.5 w-24 overflow-hidden rounded-full bg-muted/30"><div class="h-full rounded-full bg-primary" :style="{ width: `${progressPercent(subtask.completed_subtasks_count, subtask.subtasks_count)}%` }" /></div><span class="text-[10px] text-muted">{{ progressPercent(subtask.completed_subtasks_count, subtask.subtasks_count) }}% · {{ subtask.completed_subtasks_count }}/{{ subtask.subtasks_count }}</span></div></div>
              <div class="flex shrink-0 items-center gap-3 text-xs text-muted"><span>{{ dateLabel(subtask.due_at, 'Sin vencimiento') }}</span><span class="inline-flex items-center gap-1"><UIcon name="i-lucide-clock-3" class="size-3.5"/>{{ timeLabel(subtask.work_minutes) }}</span><span v-if="subtask.remaining_minutes != null" class="inline-flex items-center gap-1 text-warning"><UIcon name="i-lucide-hourglass" class="size-3.5"/>{{ timeLabel(subtask.remaining_minutes) }}</span></div>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="view === 'TIMELINE'" class="flex flex-col gap-3">
        <div class="flex items-center justify-between"><h2 class="font-semibold">Cronograma · {{ monthCursor.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) }}</h2><div class="flex gap-1"><UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" aria-label="Mes anterior" @click="shiftMonth(-1)"/><UButton label="Hoy" color="neutral" variant="outline" size="sm" @click="monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1)"/><UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" aria-label="Mes siguiente" @click="shiftMonth(1)"/></div></div>
        <div class="overflow-x-auto rounded-xl border border-default"><div class="min-w-[760px]">
          <div class="grid grid-cols-[minmax(16rem,0.8fr)_minmax(24rem,1fr)] border-b border-default bg-elevated/40 px-3 py-2 text-xs font-semibold text-muted"><span>Tarea</span><span class="relative">{{ rangeStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) }} — {{ rangeEnd.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) }}</span></div>
          <div v-for="row in timelineRows" :key="row.key" class="grid grid-cols-[minmax(16rem,0.8fr)_minmax(24rem,1fr)] items-center border-b border-default px-3 py-2 last:border-0">
            <div class="min-w-0 space-y-0.5 pr-3" :class="row.root ? '' : 'pl-5'"><p class="truncate text-sm"><span class="mr-2 font-mono text-xs text-primary">{{ row.key }}</span>{{ row.title }}</p><p v-if="descriptionText(row.description)" class="line-clamp-2 text-xs text-muted">{{ descriptionText(row.description) }}</p><p class="truncate text-xs text-muted">{{ row.company }} · Empleado {{ timeLabel(row.minutes) }}<span v-if="row.remaining != null"> · Restante {{ timeLabel(row.remaining) }}</span></p><div v-if="row.subtasks_count" class="flex items-center gap-2 pt-0.5"><div class="h-1.5 w-24 overflow-hidden rounded-full bg-muted/30"><div class="h-full rounded-full bg-primary transition-[width]" :style="{ width: `${progressPercent(row.completed_subtasks_count, row.subtasks_count)}%` }" /></div><span class="text-[10px] text-muted">{{ progressPercent(row.completed_subtasks_count, row.subtasks_count) }}% · {{ row.completed_subtasks_count }}/{{ row.subtasks_count }} subtareas</span></div></div>
            <div class="relative h-7 rounded bg-elevated/40"><div class="absolute top-1.5 h-4 rounded-full" :class="row.done ? 'bg-success' : row.root ? 'bg-primary' : 'bg-info'" :style="timelineStyle(row.start_at, row.due_at)" :title="`${dateLabel(row.start_at, 'Sin inicio')} — ${dateLabel(row.due_at, 'Sin vencimiento')}`" /></div>
          </div>
        </div></div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div class="flex items-center justify-between"><h2 class="font-semibold">{{ monthCursor.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) }}</h2><div class="flex gap-1"><UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" aria-label="Mes anterior" @click="shiftMonth(-1)"/><UButton label="Hoy" color="neutral" variant="outline" size="sm" @click="monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1)"/><UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" aria-label="Mes siguiente" @click="shiftMonth(1)"/></div></div>
        <div class="grid grid-cols-7 overflow-hidden rounded-xl border border-default">
          <div v-for="day in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="day" class="border-b border-r border-default bg-elevated/40 p-2 text-center text-xs font-semibold text-muted">{{ day }}</div>
          <div v-for="day in calendarDays" :key="day.dateKey" class="min-h-24 min-w-0 border-b border-r border-default p-1.5" :class="day.inMonth ? '' : 'bg-elevated/20 text-muted'"><span class="text-xs" :class="day.dateKey === toDateKey(new Date()) ? 'rounded bg-primary px-1.5 py-0.5 text-inverted' : ''">{{ day.date.getDate() }}</span><div class="mt-1 flex flex-col gap-1"><div v-for="event in day.events.slice(0, 3)" :key="`${event.company}-${event.key}-${day.dateKey}`" class="truncate rounded bg-primary/15 px-1.5 py-1 text-[10px] leading-tight text-primary" :title="`${event.key} · ${event.title} · ${event.company}`"><span class="font-mono">{{ event.key }}</span> {{ event.title }} · {{ timeLabel(event.minutes) }}<span v-if="event.remaining != null"> / {{ timeLabel(event.remaining) }}</span></div><span v-if="day.events.length > 3" class="px-1 text-[10px] text-muted">+{{ day.events.length - 3 }} más</span></div></div>
        </div>
      </div>
    </UPageCard>
  </UPage>
</template>
