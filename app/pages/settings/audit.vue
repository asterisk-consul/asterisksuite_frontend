<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import { createTableBuilder } from '~/composables/table/createColumns'
import { useServerTable } from '~/composables/table/useServerTable'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useAuditService, type AuditAction, type AuditLogEntry } from '~/modulos/erp/audit/audit.service'

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
if (!platformRoles.includes(auth.user?.role ?? '')) {
  throw createError({ statusCode: 403, statusMessage: 'La auditoría general está disponible para usuarios autorizados de la plataforma.' })
}

const auditService = useAuditService()
const rows = ref<AuditLogRow[]>([])
const totalRows = ref(0)
const loading = ref(false)
const loadError = ref('')
const forbidden = ref(false)
const selectedLog = ref<AuditLogRow | null>(null)
const days = ref(0)
let latestRequestId = 0

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
      days: days.value || undefined,
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

const serverTable = useServerTable(loadLogs, 'platform-audit-logs')
const { page, pageSize, search, sorting, filters } = serverTable

watch(days, () => {
  page.value = 1
  void serverTable.refresh()
})

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

const daysOptions = [
  { label: 'Todo el historial', value: 0 },
  { label: 'Últimos 7 días', value: 7 },
  { label: 'Últimos 30 días', value: 30 },
  { label: 'Últimos 90 días', value: 90 },
  { label: 'Último año', value: 365 },
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
        <UButton label="Actualizar" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="serverTable.refresh" />
      </template>
    </AppPageHeader>

    <UAlert
      v-if="forbidden"
      color="warning"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="No tenés alcance de auditoría para esta empresa"
      description="Tu usuario debe pertenecer a la empresa seleccionada y tener el alcance de plataforma correspondiente."
    />

    <UAlert v-else-if="loadError" color="error" variant="subtle" :description="loadError">
      <template #actions>
        <UButton label="Reintentar" icon="i-lucide-refresh-cw" size="xs" color="error" variant="soft" @click="serverTable.refresh" />
      </template>
    </UAlert>

    <UPageCard v-else variant="subtle" class="min-w-0 overflow-hidden">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">Registro de actividad</h2>
          <p class="text-sm text-muted">{{ countLabel }} · Seleccioná una fila para ver el detalle del cambio.</p>
        </div>
        <UFormField label="Período">
          <USelect v-model="days" :items="daysOptions" value-key="value" class="w-48" />
        </UFormField>
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
        storage-key="platform-audit-logs"
        server-side
        compact
      />
    </UPageCard>

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
