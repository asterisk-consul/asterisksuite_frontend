<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import { createTableBuilder } from '~/composables/table/createColumns'
import { useServerTable } from '~/composables/table/useServerTable'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useAuditService, type AuditAction, type AuditAgendaResponse, type AuditLogEntry } from '~/modulos/erp/audit/audit.service'

definePageMeta({ middleware: ['auth'] })

interface AuditLogRow extends AuditLogEntry {
  user_name: string
  user_email: string
}

interface AuditDiffRow {
  field: string
  before: string
  after: string
}

const auth = useAuthStore()
const platformRoles = ['PLATFORM_ADMIN', 'PLATFORM_OWNER']
const { isOwner } = useCompanyRole()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const isPlatformAuditUser = platformRoles.includes(auth.user?.role ?? '')
if (!isPlatformAuditUser && !isOwner.value) {
  await fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id).catch(() => undefined)
  if (!hasPermission('audit.read')) {
    throw createError({ statusCode: 403, statusMessage: 'Necesitás el permiso Auditoría de cambios para consultar esta pantalla.' })
  }
}

const auditService = useAuditService()
const rows = ref<AuditLogRow[]>([])
const totalRows = ref(0)
const loading = ref(false)
const loadError = ref('')
const forbidden = ref(false)
const selectedLog = ref<AuditLogRow | null>(null)
const selectedDate = ref(getArgentinaToday())
const selectedUserId = ref<string | null>(null)
const agenda = ref<AuditAgendaResponse | null>(null)
const agendaLoading = ref(false)
const agendaError = ref('')
let latestRequestId = 0
let latestAgendaRequestId = 0

const actionInfo: Record<AuditAction, { label: string; color: 'success' | 'info' | 'error' | 'warning' }> = {
  CREATE: { label: 'Alta', color: 'success' },
  UPDATE: { label: 'Edición', color: 'info' },
  DELETE: { label: 'Baja', color: 'error' },
  RESTORE: { label: 'Restauración', color: 'warning' },
}

const actionFilterOptions = Object.entries(actionInfo).map(([value, item]) => ({
  label: item.label,
  value,
}))

const actionStats = computed(() => Object.entries(actionInfo).map(([action, item]) => ({
  action: action as AuditAction,
  label: item.label,
  color: item.color,
  count: agenda.value?.byAction[action as AuditAction] ?? 0,
})))

async function loadLogs(query: {
  page: number
  pageSize: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  filters?: string
}) {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  forbidden.value = false
  try {
    const response = await auditService.findAll({
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      search: query.search,
      sort: query.sort,
      order: query.order,
      filters: query.filters,
      date: selectedDate.value,
      user_id: selectedUserId.value ?? undefined,
    })
    if (requestId !== latestRequestId) return
    rows.value = response.data.map((log) => ({
      ...log,
      user_name: log.user?.name ?? 'Usuario no disponible',
      user_email: log.user?.email ?? '',
    }))
    totalRows.value = response.pagination.total
  } catch (error: any) {
    if (requestId !== latestRequestId) return
    rows.value = []
    totalRows.value = 0
    if (error?.statusCode === 403 || error?.status === 403) {
      forbidden.value = true
    } else {
      loadError.value = error?.data?.message || 'No se pudieron cargar los registros de auditoría.'
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

const serverTable = useServerTable(loadLogs, 'audit-change-agenda')
const { page, pageSize, search, sorting, filters } = serverTable

async function loadAgenda() {
  const requestId = ++latestAgendaRequestId
  agendaLoading.value = true
  agendaError.value = ''
  try {
    const result = await auditService.findAgenda(selectedDate.value)
    if (requestId === latestAgendaRequestId) agenda.value = result
  } catch (error: any) {
    if (requestId !== latestAgendaRequestId) return
    agenda.value = null
    agendaError.value = error?.data?.message || 'No se pudo cargar el resumen de este día.'
    if (error?.statusCode === 403 || error?.status === 403) forbidden.value = true
  } finally {
    if (requestId === latestAgendaRequestId) agendaLoading.value = false
  }
}

watch([selectedDate, selectedUserId], () => {
  const alreadyOnFirstPage = page.value === 1
  page.value = 1
  if (alreadyOnFirstPage) void serverTable.refresh()
})
watch(selectedDate, () => { void loadAgenda() })

function getArgentinaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`
}

const isToday = computed(() => selectedDate.value === getArgentinaToday())
const selectedDateLabel = computed(() => new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'full', timeZone: 'America/Argentina/Buenos_Aires',
}).format(new Date(`${selectedDate.value}T12:00:00-03:00`)))
const selectedUserLabel = computed(() => {
  if (!selectedUserId.value) return ''
  const group = agenda.value?.users.find(user => (user.user_id ?? '__system__') === selectedUserId.value)
  if (selectedUserId.value === '__system__') return 'Sistema / sin usuario'
  return group?.user?.name ?? 'Usuario seleccionado'
})

function moveDate(days: number) {
  const [year = 0, month = 1, day = 1] = selectedDate.value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  setSelectedDate(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`)
}

function setSelectedDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== selectedDate.value) {
    selectedUserId.value = null
    selectedDate.value = value
  }
}

function selectUser(userId: string | null) {
  selectedUserId.value = selectedUserId.value === userId ? null : userId
}

function isSelectedUser(userId: string | null) {
  return selectedUserId.value === (userId ?? '__system__')
}

async function refreshAll() {
  await Promise.all([serverTable.refresh(), loadAgenda()])
}

void loadAgenda()

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const columnsBuilder = createTableBuilder<AuditLogRow>({ locale: 'es-AR', onSortFieldSelect })
const columns = computed<TableColumn<AuditLogRow>[]>(() => columnsBuilder([
  {
    key: 'changed_at',
    label: 'Fecha y hora',
    sortable: true,
    meta: { label: 'Fecha y hora', filter: { type: 'date-range', operators: ['between'] } },
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-sm tabular-nums' }, formatDateTime(row.original.changed_at)),
  },
  {
    key: 'action',
    label: 'Acción',
    sortable: true,
    meta: { label: 'Acción', filter: { type: 'select', options: actionFilterOptions } },
    cell: ({ row }) => {
      const info = actionInfo[row.original.action]
      return h(UBadge, { label: info?.label ?? row.original.action, color: info?.color ?? 'neutral', variant: 'subtle' })
    },
  },
  {
    key: 'table_name',
    label: 'Entidad',
    sortable: true,
    meta: { label: 'Entidad', filter: { type: 'text', operators: ['contains', 'equals'] } },
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.table_name),
  },
  {
    key: 'record_id',
    label: 'ID del registro',
    meta: { label: 'ID del registro', filter: { type: 'text', operators: ['contains', 'equals'] } },
    cell: ({ row }) => h('span', { class: 'block max-w-56 truncate font-mono text-xs', title: row.original.record_id }, row.original.record_id),
  },
  {
    key: 'user_name',
    label: 'Usuario',
    meta: { label: 'Usuario', filter: false },
    cell: ({ row }) => h('div', { class: 'min-w-36' }, [
      h('p', { class: 'font-medium' }, row.original.user_name),
      ...(row.original.user_email ? [h('p', { class: 'text-xs text-muted' }, row.original.user_email)] : []),
    ]),
  },
  {
    key: 'ip_address',
    label: 'Dirección IP',
    meta: { label: 'Dirección IP', filter: false },
    cell: ({ row }) => h('span', { class: 'whitespace-nowrap font-mono text-xs text-muted' }, row.original.ip_address ?? '—'),
  },
  {
    id: 'details',
    label: 'Cambios',
    meta: { label: 'Cambios', filter: false, disableColumnVisibility: true },
    cell: ({ row }) => h(UButton, {
      label: 'Ver cambios',
      icon: 'i-lucide-eye',
      size: 'xs',
      variant: 'soft',
      color: 'neutral',
      'data-row-action': 'true',
      onClick: () => { selectedLog.value = row.original },
    }),
  },
]))

const sortFields = [
  { label: 'Fecha y hora', value: 'changed_at' },
  { label: 'Entidad', value: 'table_name' },
  { label: 'Acción', value: 'action' },
]

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2) ?? '—'
  } catch {
    return String(value)
  }
}

const diffRows = computed<AuditDiffRow[]>(() => {
  const log = selectedLog.value
  if (!log) return []
  const before = log.old_data && typeof log.old_data === 'object' && !Array.isArray(log.old_data)
    ? log.old_data as Record<string, unknown>
    : log.old_data == null ? {} : { value: log.old_data }
  const after = log.new_data && typeof log.new_data === 'object' && !Array.isArray(log.new_data)
    ? log.new_data as Record<string, unknown>
    : log.new_data == null ? {} : { value: log.new_data }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((field) => ({ field, before: formatValue(before[field]), after: formatValue(after[field]) }))
})

function openDetail(row: AuditLogRow) {
  selectedLog.value = row
}

function closeDetail(open: boolean) {
  if (!open) selectedLog.value = null
}

const countLabel = computed(() => `${totalRows.value.toLocaleString('es-AR')} ${totalRows.value === 1 ? 'cambio' : 'cambios'}`)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <AppPageHeader
      title="Auditoría de cambios"
      description="Revisá quién creó, editó o eliminó registros de esta empresa y compará sus valores anteriores y nuevos."
    >
      <template #actions>
        <UBadge v-if="auth.selectedCompany" :label="auth.selectedCompany.name" color="neutral" variant="subtle" />
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading || agendaLoading" @click="refreshAll" />
      </template>
    </AppPageHeader>

    <UAlert
      v-if="forbidden"
      color="warning"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="No tenés alcance de auditoría para esta empresa"
      description="Tu usuario debe pertenecer a la empresa seleccionada y tener Auditoría de cambios en sus permisos, o contar con un alcance de plataforma válido."
    />

    <UAlert v-else-if="loadError" color="error" variant="subtle" :description="loadError">
      <template #actions>
        <UButton label="Reintentar" icon="i-lucide-refresh-cw" size="xs" color="error" variant="soft" @click="refreshAll" />
      </template>
    </UAlert>

    <template v-else>
      <UPageCard variant="subtle" class="min-w-0 overflow-hidden">
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="font-semibold text-highlighted">Agenda diaria</h2>
              <p class="text-sm text-muted">{{ selectedDateLabel }} · Consultá la actividad día por día.</p>
            </div>
            <div class="flex items-center gap-2">
              <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" aria-label="Día anterior" @click="moveDate(-1)" />
              <UInput :model-value="selectedDate" type="date" aria-label="Fecha de auditoría" class="w-40" @update:model-value="setSelectedDate" />
              <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" aria-label="Día siguiente" @click="moveDate(1)" />
              <UButton v-if="!isToday" label="Hoy" color="neutral" variant="soft" @click="setSelectedDate(getArgentinaToday())" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div class="rounded-lg border border-default bg-muted/10 px-3 py-2">
              <p class="text-xs text-muted">Cambios del día</p>
              <p class="mt-0.5 text-xl font-semibold tabular-nums">{{ (agenda?.total ?? 0).toLocaleString('es-AR') }}</p>
            </div>
            <div v-for="stat in actionStats" :key="stat.action" class="rounded-lg border border-default bg-muted/10 px-3 py-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-muted">{{ stat.label }}</p>
                <UBadge :label="stat.action" :color="stat.color" variant="subtle" size="xs" />
              </div>
              <p class="mt-0.5 text-xl font-semibold tabular-nums">{{ stat.count.toLocaleString('es-AR') }}</p>
            </div>
          </div>
          <UAlert v-if="agendaError" color="error" variant="subtle" :description="agendaError" />
        </div>
      </UPageCard>

      <UPageCard variant="subtle" class="min-w-0 overflow-hidden">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">Actividad por usuario</h2>
            <p class="text-sm text-muted">Elegí una persona para filtrar los movimientos del día. {{ agendaLoading ? 'Actualizando…' : '' }}</p>
          </div>
          <UButton
            :label="selectedUserId ? 'Ver todos' : 'Todos los usuarios'"
            icon="i-lucide-users"
            color="neutral"
            :variant="selectedUserId ? 'outline' : 'soft'"
            :disabled="!selectedUserId"
            @click="selectedUserId = null"
          />
        </div>
        <div v-if="agenda?.users.length" class="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="group in agenda.users"
            :key="group.user_id ?? 'system'"
            type="button"
            class="flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
            :class="isSelectedUser(group.user_id) ? 'border-primary bg-primary/10' : 'border-default bg-default'"
            :aria-pressed="isSelectedUser(group.user_id)"
            @click="selectUser(group.user_id ?? '__system__')"
          >
            <span class="flex min-w-0 items-center gap-2">
              <UIcon :name="group.user_id ? 'i-lucide-user-round' : 'i-lucide-cog'" class="size-4 shrink-0 text-primary" />
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{{ group.user?.name ?? (group.user_id ? 'Usuario no disponible' : 'Sistema / sin usuario') }}</span>
                <span v-if="group.user?.email" class="block truncate text-xs text-muted">{{ group.user.email }}</span>
              </span>
            </span>
            <UBadge :label="group.count.toLocaleString('es-AR')" color="neutral" variant="subtle" />
          </button>
        </div>
        <p v-else-if="!agendaLoading" class="rounded-lg border border-dashed border-default px-4 py-8 text-center text-sm text-muted">No hay cambios registrados para este día.</p>
        <p v-if="agenda?.usersTruncated" class="mt-2 text-xs text-muted">Se muestran los 100 usuarios con más movimientos. Usá la búsqueda de la grilla para localizar otros registros.</p>
      </UPageCard>

      <UPageCard variant="subtle" class="min-w-0 overflow-hidden">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">Movimientos del día</h2>
            <p class="text-sm text-muted">{{ countLabel }}{{ selectedUserLabel ? ` · ${selectedUserLabel}` : '' }} · Seleccioná una fila para ver qué cambió.</p>
          </div>
        </div>

        <AsteriskTable
          v-model:page="page"
          v-model:search="search"
          v-model:filters="filters"
          v-model:sorting="sorting"
          :data="rows"
          :columns="columns"
          :loading="loading"
          :total-rows="totalRows"
          :page-size="pageSize"
          :sort-fields="sortFields"
          :get-row-id="(row: AuditLogRow) => row.id"
          :on-row-click="openDetail"
          search-placeholder="Buscar por entidad, ID, acción o usuario..."
          storage-key="audit-change-agenda"
          server-side
          compact
        />
      </UPageCard>
    </template>

    <UModal
      :open="Boolean(selectedLog)"
      title="Detalle del cambio"
      description="Comparación de los valores registrados para esta operación."
      :ui="{ content: 'sm:max-w-5xl' }"
      @update:open="closeDetail"
    >
      <template #body>
        <div v-if="selectedLog" class="flex max-h-[75vh] flex-col gap-4 overflow-hidden">
          <div class="grid gap-3 rounded-lg border border-default bg-elevated/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p class="text-xs text-muted">Entidad</p><p class="font-medium">{{ selectedLog.table_name }}</p></div>
            <div><p class="text-xs text-muted">ID del registro</p><p class="break-all font-mono text-xs">{{ selectedLog.record_id }}</p></div>
            <div><p class="text-xs text-muted">Usuario</p><p class="font-medium">{{ selectedLog.user_name }}</p><p class="text-xs text-muted">{{ selectedLog.user_email }}</p></div>
            <div><p class="text-xs text-muted">Fecha e IP</p><p class="font-medium">{{ formatDateTime(selectedLog.changed_at) }}</p><p class="font-mono text-xs text-muted">{{ selectedLog.ip_address ?? 'IP no registrada' }}</p></div>
          </div>

          <div class="min-h-0 overflow-auto rounded-lg border border-default">
            <div class="grid min-w-[680px] grid-cols-[minmax(8rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] bg-elevated/50 text-xs font-semibold uppercase tracking-wide text-muted">
              <div class="border-b border-default px-3 py-2">Campo</div>
              <div class="border-b border-default px-3 py-2">Valor anterior</div>
              <div class="border-b border-default px-3 py-2">Valor nuevo</div>
            </div>
            <div v-if="diffRows.length" class="min-w-[680px] divide-y divide-default">
              <div v-for="change in diffRows" :key="change.field" class="grid grid-cols-[minmax(8rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div class="break-words border-r border-default px-3 py-2 text-sm font-medium">{{ change.field }}</div>
                <pre class="whitespace-pre-wrap break-words border-r border-default px-3 py-2 font-mono text-xs">{{ change.before }}</pre>
                <pre class="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs">{{ change.after }}</pre>
              </div>
            </div>
            <p v-else class="px-4 py-8 text-center text-sm text-muted">No hay diferencias de valores para mostrar.</p>
          </div>
          <p class="text-xs text-muted">Los valores sensibles, como claves y tokens, se muestran enmascarados.</p>
        </div>
      </template>
    </UModal>
  </div>
</template>
