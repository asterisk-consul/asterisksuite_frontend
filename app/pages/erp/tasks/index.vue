<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { h, resolveComponent } from 'vue'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import type { SortField } from '~/components/Tablas/TableToolbar.vue'
import { useTasksService, type SaveTaskInput, type TaskBoard, type TaskCategory, type TaskChecklist, type TaskColumn, type TaskComment, type TaskLabel, type TaskMember, type TaskMemberInput, type TaskMemberRole, type TaskNotificationSettings, type TaskRecord, type TaskRelation, type TaskRelationCandidate, type TaskRelationInputType, type TaskWorkLog, type TaskWorkLogInput } from '~/modulos/erp/tasks/tasks.service'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { usePlatformModulesStore } from '~/modulos/platform-modules/platform-modules.store'
import { useTaskTimerStore } from '~/modulos/erp/tasks/task-timer.store'
import { usePhotosService } from '~/modulos/logistica/media/photos/photos.service'
import TaskDescriptionEditor from '~/components/erp/tasks/TaskDescriptionEditor.vue'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Tareas | AsteriskSuite' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()
const platformModules = usePlatformModulesStore()
const taskTimer = useTaskTimerStore()
const { isOwnerOrAdmin } = useCompanyRole()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const hasTaskPermission = (permission: string) => auth.selectedCompany?.role === 'OWNER' || hasPermission(permission)
const service = useTasksService()
const partiesService = useBusinessPartiesService()
const photosService = usePhotosService()
const notificationFeed = useNotifications()

const boards = ref<TaskBoard[]>([])
const allBoardsSearch = ref('')
const allBoardsPartyId = ref('ALL')
const taskSidebarBoardLinks = useState<{ companyId: string | null; items: Array<{ id: string; name: string }> }>('task-sidebar-board-links', () => ({ companyId: null, items: [] }))
const members = ref<TaskMember[]>([])
const labels = ref<TaskLabel[]>([])
const categories = ref<TaskCategory[]>([])
const comments = ref<TaskComment[]>([])
const workLogs = ref<TaskWorkLog[]>([])
const totalWorkMinutes = ref(0)
const directWorkMinutes = ref(0)
const subtaskWorkMinutes = ref(0)
const workLogsLimited = ref(false)
const selectedTaskTimer = computed(() => !!selectedTask.value && taskTimer.timer?.task_id === selectedTask.value.id)
const anotherTaskTimerRunning = computed(() => !!taskTimer.timer && !selectedTaskTimer.value)
const workLogMinutes = ref('30')
const workLogDescription = ref('')
const addingWorkLog = ref(false)
const showRequiredWorkLogModal = ref(false)
const requiredWorkLogMinutes = ref('30')
const requiredWorkLogDescription = ref('')
const submittingRequiredWorkLog = ref(false)
const boardSettingsOpen = ref(false)
const boardRequireWorkLogDraft = ref(false)
const boardAllowTimerDraft = ref(false)
const boardTimerMaxHoursDraft = ref(8)
const timerDesktopNotificationPermission = ref<'default' | 'granted' | 'denied' | 'unsupported'>('default')
const savingBoardSettings = ref(false)
type PendingWorkLogAction =
  | { type: 'saveTask'; taskId: string; payload: SaveTaskInput }
  | { type: 'moveTask'; taskId: string; columnId: string; position: number }
  | { type: 'completeTask'; taskId: string; completed: boolean }
const pendingWorkLogAction = ref<PendingWorkLogAction | null>(null)
const checklists = ref<TaskChecklist[]>([])
const taskSubtasks = ref<NonNullable<TaskRecord['subtasks']>>([])
const taskParent = ref<TaskRecord['parent_task']>(null)
const taskRelations = ref<TaskRelation[]>([])
const relationCandidates = ref<TaskRelationCandidate[]>([])
const subtaskTitleDraft = ref('')
const subtaskCategoryDraft = ref('NONE')
const creatingSubtask = ref(false)
const relationModalMode = ref<'CREATE' | 'EXISTING'>('EXISTING')
const relationSearch = ref('')
const relationCandidateId = ref('')
const relationTypeDraft = ref<TaskRelationInputType | 'NONE'>('NONE')
const loadingRelationCandidates = ref(false)
const savingTaskRelation = ref(false)
const removingTaskRelation = ref('')
const taskRelationCreateOpen = ref(false)
const linkedActivitiesOpen = ref(true)
let relationSearchTimer: ReturnType<typeof setTimeout> | null = null
const attachments = ref<any[]>([])
const checklistTitle = ref('')
const checklistItemDrafts = ref<Record<string, string>>({})
const checklistDateOpen = reactive<Record<string, boolean>>({})
const checklistMemberOpen = reactive<Record<string, boolean>>({})
const convertingChecklistItemId = ref('')
const activeActionPanel = ref<'add' | 'labels' | 'checklist' | 'members' | 'client' | 'category' | 'priority' | 'start' | 'due' | null>(null)
const actionModalOpen = ref(false)
const timeModalOpen = ref(false)
const attachmentInput = ref<HTMLInputElement | null>(null)
const uploadingAttachment = ref(false)
const attachmentDeletingId = ref('')
const previewAttachment = ref<any | null>(null)
const attachmentPreviewUrl = ref('')
const attachmentPreviewLoading = ref(false)
const attachmentPreviewError = ref('')
const attachmentPreviewRequestId = ref(0)
const board = ref<(TaskBoard & { columns: TaskColumn[] }) | null>(null)
const boardId = ref('')
const filterOpen = ref(false)
const taskFilters = reactive({ search: '', member_ids: [] as string[], label_ids: [] as string[], category_ids: [] as string[], party_ids: [] as string[], completion: 'ALL', priority: 'ALL', due_status: 'ALL' })
const collapsedClosedColumnIds = ref<string[]>([])
const hideCompletedColumns = ref(true)
const boardViewSettingsOpen = ref(false)
const boardViewSettings = reactive({ columnWidth: 'FIXED' as 'FIXED' | 'FLEXIBLE', scrollMode: 'BOARD' as 'BOARD' | 'COLUMNS', hideCompletedAfter: 'NEVER' as 'NEVER' | 'IMMEDIATELY' | 'DAY' | 'WEEK' | 'MONTH' })
const boardViewClock = ref(Date.now())
let boardViewClockTimer: ReturnType<typeof setInterval> | null = null
const showCategoriesModal = ref(false)
const newCategoryName = ref('')
const newCategoryColor = ref('neutral')
const savingCategory = ref(false)
const updatingCategoryId = ref('')
const categoryNameDrafts = reactive<Record<string, string>>({})
const categoryColorDrafts = reactive<Record<string, string>>({})
const partyOptions = ref<Array<{ label: string; value: string }>>([{ label: 'Todos los clientes', value: 'ALL' }])
const clientFilterOptions = computed(() => partyOptions.value.filter(option => option.value !== 'ALL'))
const customerSuggestions = ref<Array<{ label: string; value: string }>>([])
const taskPartyOptions = ref<Array<{ label: string; value: string }>>([{ label: 'Sin cliente asociado', value: 'NONE' }])
const partyFilterSearch = ref('')
const taskPartySearch = ref('')
const partySearchLoading = ref(false)
const taskPartySearchLoading = ref(false)
const loading = ref(true)
const saving = ref(false)
const savingTaskNotificationSettings = ref(false)
const taskNotificationSettingsOpen = ref(false)
const taskNotificationSettingsLoaded = ref(false)
const taskNotificationSettingsError = ref('')
const whatsappModuleRefreshError = ref('')
const whatsappModuleRefreshing = ref(false)
const taskNotificationSettings = reactive<TaskNotificationSettings>({ in_app_enabled: true, task_changes_enabled: true })
const moving = ref(false)
const completionTaskId = ref('')
const dragOverColumnId = ref('')
const quickAddColumnId = ref('')
const quickTaskTitle = ref('')
const newColumnName = ref('')
const showNewColumnForm = ref(false)
const creatingColumn = ref(false)
const showMoveTasksModal = ref(false)
const moveTasksFrom = ref<TaskColumn | null>(null)
const moveTasksTargetId = ref('')
const movingAllTasks = ref(false)
const showMoveColumnModal = ref(false)
const moveColumnSource = ref<TaskColumn | null>(null)
const moveColumnPosition = ref('0')
const movingColumn = ref(false)
const deleting = ref(false)
const commentsLoading = ref(false)
const commentSaving = ref(false)
const descriptionSaving = ref(false)
const descriptionEditing = ref(false)
const addingLabel = ref(false)
const updatingLabel = ref(false)
const newLabelName = ref('')
const newLabelColor = ref('warning')
const labelSearchTerm = ref('')
const labelCreateModalOpen = ref(false)
const labelEditModalOpen = ref(false)
const editingLabelId = ref('')
const editingLabelName = ref('')
const editingLabelColor = ref('warning')
const commentDraft = ref('')
const showBoardModal = ref(false)
const showTaskModal = ref(false)
const showDeleteModal = ref(false)
const selectedTask = ref<TaskRecord | null>(null)
type BoardWorkspaceTab = 'SUMMARY' | 'LIST' | 'BOARD' | 'TIMELINE' | 'CALENDAR' | 'DOCUMENTS' | 'ATTACHMENTS'
type BoardTaskRow = { id: string; key: string; title: string; list: string; priority: string; assignee: string; due: string; client: string; categoryName: string; labelsText: string; task: TaskRecord; columnId: string }
const boardWorkspaceExpanded = ref(false)
const activeBoardTab = ref<BoardWorkspaceTab>('SUMMARY')
const boardTabs: Array<{ id: BoardWorkspaceTab; label: string; icon: string }> = [
  { id: 'SUMMARY', label: 'Resumen', icon: 'i-lucide-layout-dashboard' },
  { id: 'LIST', label: 'Lista', icon: 'i-lucide-list' },
  { id: 'BOARD', label: 'Tablero', icon: 'i-lucide-kanban' },
  { id: 'TIMELINE', label: 'Cronograma', icon: 'i-lucide-chart-no-axes-gantt' },
  { id: 'CALENDAR', label: 'Calendario', icon: 'i-lucide-calendar-days' },
  { id: 'DOCUMENTS', label: 'Documentos', icon: 'i-lucide-file-text' },
  { id: 'ATTACHMENTS', label: 'Adjuntos', icon: 'i-lucide-paperclip' },
]
const boardAttachments = ref<Array<Record<string, any>>>([])
const boardAttachmentsLoading = ref(false)
const boardAttachmentsHasMore = ref(false)
const boardAttachmentsHasMoreTasks = ref(false)
const summaryActivityLoading = ref(false)
let boardAttachmentsRequestId = 0
const calendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const calendarView = ref<'MONTH' | 'WEEK'>('MONTH')
const calendarSearch = ref('')
const calendarMemberId = ref('ALL')
const boardListSearch = ref('')
const boardListShowSubtasks = ref(true)
const timelineScale = ref<'WEEK' | 'MONTH' | 'QUARTER'>('MONTH')
const timelineSearch = ref('')
const timelineMemberId = ref('ALL')
const boardForm = reactive({ name: '', task_key_prefix: '', description: '', party_id: 'NONE', columns: 'Pendiente\nEn curso\nEn revisión\nFinalizada' })
const taskKeyPrefixManuallyEdited = ref(false)
const taskForm = reactive({
  title: '',
  description: '',
  column_id: '',
  party_id: 'NONE',
  assigned_to: 'NONE',
  start_at: '',
  due_at: '',
  priority: 'NORMAL' as TaskRecord['priority'],
  category_id: 'NONE',
  label_ids: [] as string[],
  members: [] as TaskMemberInput[],
})
const memberToAdd = ref('NONE')
const memberRoleToAdd = ref<TaskMemberRole>('COLLABORATOR')

const memberOptions = computed(() => [{ label: 'Sin asignar', value: 'NONE' }, ...members.value.map(member => ({ label: member.name, value: member.id }))])
const selectMenuUi = { base: 'w-full min-w-0', value: 'min-w-0 truncate', content: 'z-[10030] max-w-[calc(100vw-2rem)]', itemLabel: 'min-w-0 truncate' }
const stackedModalSelectMenuUi = { ...selectMenuUi, content: 'z-[10030] max-w-[calc(100vw-2rem)]' }
const taskMemberOptions = computed(() => [
  { label: 'Seleccionar persona', value: 'NONE' },
  ...members.value
    .filter(member => member.id !== taskForm.assigned_to && !taskForm.members.some(assignment => assignment.user_id === member.id))
    .map(member => ({ label: member.name, value: member.id })),
])
const taskMemberRoleOptions = [
  { label: 'Colaborador', value: 'COLLABORATOR' },
  { label: 'Auditor', value: 'REVIEWER' },
  { label: 'Observador', value: 'OBSERVER' },
]
const selectedBoardParty = computed(() => board.value?.party ?? null)
const isAllBoardsView = computed(() => !boardId.value)
const allBoardsPartyOptions = computed(() => {
  const parties = new Map<string, string>()
  for (const item of boards.value) if (item.party) parties.set(item.party.id, item.party.name)
  return [{ label: 'Todos los clientes', value: 'ALL' }, ...[...parties].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es'))]
})
const visibleAllBoards = computed(() => {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  const search = normalize(allBoardsSearch.value.trim())
  return boards.value.filter(item => {
    if (allBoardsPartyId.value !== 'ALL' && item.party_id !== allBoardsPartyId.value) return false
    return !search || normalize(`${item.name} ${item.description ?? ''} ${item.party?.name ?? ''} ${item.task_key_prefix}`).includes(search)
  })
})
const whatsappModule = computed(() => platformModules.modules.find(module => module.code === 'WHATSAPP') ?? null)
const whatsappModuleEnabled = computed(() => whatsappModule.value?.enabled === true)
const whatsappModuleChecking = computed(() => whatsappModuleRefreshing.value)
const canManagePlatformModules = computed(() => ['PLATFORM_OWNER', 'PLATFORM_ADMIN'].includes(auth.user?.role ?? ''))
const selectedTaskPartyOption = computed(() => taskPartyOptions.value.find(option => option.value === taskForm.party_id) ?? customerSuggestions.value.find(option => option.value === taskForm.party_id))
const labelOptions = computed(() => labels.value.map(label => ({ label: label.name ?? `${labelColorName(label.color)} · solo color`, value: label.id })))
const selectedTaskLabels = computed(() => taskForm.label_ids.map(id => labels.value.find(label => label.id === id)).filter((label): label is TaskLabel => !!label))
const filteredTaskLabels = computed(() => {
  const query = labelSearchTerm.value.trim().toLocaleLowerCase('es')
  if (!query) return labels.value
  return labels.value.filter(label => `${label.name ?? ''} ${labelColorName(label.color)}`.toLocaleLowerCase('es').includes(query))
})
const categoryOptions = computed(() => categories.value.filter(category => category.active || taskForm.category_id === category.id).map(category => ({ label: category.name, value: category.id })))
const subtaskCategoryOptions = computed(() => categories.value.filter(category => category.active).map(category => ({ label: category.name, value: category.id })))
const categoryFilterOptions = computed(() => categories.value.filter(category => category.active).map(category => ({ label: category.name, value: category.id })))
const boardFilterMemberOptions = computed(() => [{ label: 'Sin miembros', value: 'NONE' }, { label: 'Asignadas a mí', value: 'ME' }, ...members.value.map(member => ({ label: member.name, value: member.id }))])
const activeBoardFilterCount = computed(() => Number(!!taskFilters.search.trim()) + Number(taskFilters.member_ids.length > 0) + Number(taskFilters.label_ids.length > 0) + Number(taskFilters.category_ids.length > 0) + Number(taskFilters.party_ids.length > 0) + Number(taskFilters.completion !== 'ALL') + Number(taskFilters.priority !== 'ALL') + Number(taskFilters.due_status !== 'ALL'))
const visibleBoardColumns = computed(() => (board.value?.columns ?? []).filter(column => !hideCompletedColumns.value || !column.is_closed))
const boardGridTemplateColumns = computed(() => [
  ...visibleBoardColumns.value.map(column => isColumnCollapsed(column) ? '3rem' : boardViewSettings.columnWidth === 'FIXED' ? '340px' : 'minmax(275px, 1fr)'),
  ...(hasTaskPermission('tasks.create') ? [boardViewSettings.columnWidth === 'FIXED' ? '340px' : 'minmax(275px, 1fr)'] : []),
].join(' '))
const boardPeople = computed(() => {
  const ids = new Set((board.value?.columns ?? []).flatMap(column => column.tasks.flatMap(task => [task.assigned_to, ...(task.members ?? []).map(member => member.user_id)]).filter((id): id is string => !!id)))
  return members.value.filter(member => ids.has(member.id)).slice(0, 6)
})
const summaryPeople = computed(() => members.value.slice(0, 6))
const summaryPeopleExtraCount = computed(() => Math.max(0, members.value.length - summaryPeople.value.length))
const boardPeopleExtraCount = computed(() => {
  const ids = new Set((board.value?.columns ?? []).flatMap(column => column.tasks.flatMap(task => [task.assigned_to, ...(task.members ?? []).map(member => member.user_id)]).filter((id): id is string => !!id)))
  return Math.max(0, ids.size - boardPeople.value.length)
})
const boardTaskRows = computed<BoardTaskRow[]>(() => (board.value?.columns ?? []).flatMap(column => column.tasks.map(task => ({
  id: task.id,
  key: taskKey(task, board.value?.task_key_prefix ?? ''),
  title: task.title,
  list: column.name,
  priority: priorityLabel(task.priority),
  assignee: task.assignee?.name ?? members.value.find(member => member.id === task.assigned_to)?.name ?? 'Sin asignar',
  due: formatDueDate(task.due_at),
  client: task.party?.name ?? selectedBoardParty.value?.name ?? 'Sin cliente',
  categoryName: task.category?.name ?? 'Sin categoría',
  labelsText: (task.labels ?? []).map(label => label.name ?? labelColorName(label.color)).join(' '),
  task,
  columnId: column.id,
}))))
const visibleBoardListRows = computed(() => {
  const query = boardListSearch.value.trim().toLocaleLowerCase('es')
  return boardTaskRows.value.filter(row => {
    const column = board.value?.columns.find(item => item.id === row.columnId)
    if (hideCompletedColumns.value && (column?.is_closed || row.task.completed_at)) return false
    if (!boardListShowSubtasks.value && row.task.parent_task_id) return false
    if (!query) return true
    return `${row.key} ${row.title} ${row.list} ${row.priority} ${row.assignee} ${row.due} ${row.client} ${row.categoryName} ${row.labelsText}`.toLocaleLowerCase('es').includes(query)
  })
})
const hasBoardSummaryFilters = computed(() => activeBoardFilterCount.value > 0)
const boardSummary = computed(() => {
  const tasks = boardTaskRows.value
  const total = hasBoardSummaryFilters.value
    ? tasks.length
    : (board.value?.columns ?? []).reduce((sum, column) => sum + (column.total_tasks ?? column.tasks.length), 0)
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  const through = Date.now() + 7 * 24 * 60 * 60 * 1000
  return {
    total,
    visible: tasks.length,
    completed: tasks.filter(row => !!row.task.completed_at && new Date(row.task.completed_at).getTime() >= since).length,
    updated: tasks.filter(row => !!row.task.updated_at && new Date(row.task.updated_at).getTime() >= since).length,
    created: tasks.filter(row => !!row.task.created_at && new Date(row.task.created_at).getTime() >= since).length,
    dueSoon: tasks.filter(row => !row.task.completed_at && row.task.due_at && new Date(row.task.due_at).getTime() >= Date.now() && new Date(row.task.due_at).getTime() <= through).length,
    overdue: tasks.filter(row => isOverdue(row.task)).length,
  }
})
const boardStatusSummary = computed(() => (board.value?.columns ?? []).map(column => {
  const count = hasBoardSummaryFilters.value
    ? boardTaskRows.value.filter(row => row.columnId === column.id).length
    : column.total_tasks ?? column.tasks.length
  return {
    id: column.id,
    name: column.name,
    count,
    percent: boardSummary.value.total ? Math.round((count / boardSummary.value.total) * 100) : 0,
  }
}))
const boardPrioritySummary = computed(() => {
  const priorities: Array<{ value: TaskRecord['priority']; label: string; icon: string }> = [
    { value: 'URGENT', label: 'Urgente', icon: 'i-lucide-chevrons-up' },
    { value: 'HIGH', label: 'Alta', icon: 'i-lucide-chevron-up' },
    { value: 'NORMAL', label: 'Normal', icon: 'i-lucide-equal' },
    { value: 'LOW', label: 'Baja', icon: 'i-lucide-chevron-down' },
  ]
  const counts = priorities.map(priority => ({ ...priority, count: boardTaskRows.value.filter(row => row.task.priority === priority.value).length }))
  const max = Math.max(1, ...counts.map(item => item.count))
  return counts.map(item => ({ ...item, percent: Math.round(item.count / max * 100) }))
})
const boardCategorySummary = computed(() => {
  const counts = new Map<string, number>()
  for (const row of boardTaskRows.value) {
    const name = row.task.category?.name ?? 'Sin categoría'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const max = Math.max(1, ...counts.values())
  return [...counts.entries()].map(([name, count]) => ({ name, count, percent: Math.round(count / max * 100) })).sort((a, b) => b.count - a.count).slice(0, 8)
})
const boardAssigneeSummary = computed(() => {
  const counts = new Map<string, number>()
  for (const row of boardTaskRows.value) {
    const name = row.assignee || 'Sin asignar'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const max = Math.max(1, ...counts.values())
  return [...counts.entries()].map(([name, count]) => ({ name, count, percent: Math.round(count / max * 100) })).sort((a, b) => b.count - a.count).slice(0, 8)
})
const relatedTaskBoards = computed(() => boards.value.filter(item => item.id !== boardId.value).slice(0, 6))
const boardStatusColors = ['#4f8df7', '#91c83e', '#7b61d1', '#f59e0b', '#14b8a6', '#ef6b6b']
const boardStatusChartStyle = computed(() => {
  let cursor = 0
  const stops = boardStatusSummary.value.map((status, index) => {
    const start = cursor
    cursor += status.percent
    return `${boardStatusColors[index % boardStatusColors.length]} ${start}% ${cursor}%`
  })
  return { background: stops.length ? `conic-gradient(${stops.join(', ')})` : 'var(--ui-bg-elevated)' }
})
const recentBoardActivities = computed(() => {
  const taskIds = new Set(boardTaskRows.value.map(row => row.id))
  return notificationFeed.items.value
    .filter(item => item.target_type === 'TASK' && (!!item.target_id && taskIds.has(item.target_id) || !hasBoardSummaryFilters.value && !item.target_id && !!item.target_path?.includes(`board_id=${encodeURIComponent(boardId.value)}`)))
    .slice(0, 20)
})
const boardSummaryMetrics = computed(() => [
  { label: 'Finalizadas', value: boardSummary.value.completed, detail: 'en los últimos 7 días', icon: 'i-lucide-circle-check' },
  { label: 'Actualizadas', value: boardSummary.value.updated, detail: 'en los últimos 7 días', icon: 'i-lucide-list-todo' },
  { label: 'Creadas', value: boardSummary.value.created, detail: 'en los últimos 7 días', icon: 'i-lucide-square-plus' },
  { label: 'Vencen pronto', value: boardSummary.value.dueSoon, detail: 'en los próximos 7 días', icon: 'i-lucide-calendar-days' },
])
const monthLabel = computed(() => new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(calendarMonth.value))
const calendarCells = computed(() => {
  const monthStart = new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth(), 1)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = calendarView.value === 'WEEK'
    ? new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth(), calendarMonth.value.getDate() - ((calendarMonth.value.getDay() + 6) % 7))
    : new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - mondayOffset)
  return Array.from({ length: calendarView.value === 'WEEK' ? 7 : 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return { date, dateKey, inMonth: date.getMonth() === calendarMonth.value.getMonth() }
  })
})
const calendarHeading = computed(() => {
  if (calendarView.value === 'MONTH') return monthLabel.value
  const first = calendarCells.value[0]?.date
  const last = calendarCells.value[calendarCells.value.length - 1]?.date
  if (!first || !last) return monthLabel.value
  const formatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
  return `${formatter.format(first)} – ${new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(last)}`
})
const calendarWeeks = computed(() => {
  const cells = calendarCells.value
  const tasks = boardTaskRows.value.filter(row => {
    const search = calendarSearch.value.trim().toLocaleLowerCase('es')
    const matchesSearch = !search || `${row.key} ${row.title} ${row.assignee} ${row.client}`.toLocaleLowerCase('es').includes(search)
    const matchesMember = calendarMemberId.value === 'ALL' || (calendarMemberId.value === 'NONE' ? !row.task.assigned_to : row.task.assigned_to === calendarMemberId.value || row.task.members?.some(member => member.user_id === calendarMemberId.value))
    return matchesSearch && matchesMember
  })
  const weekSize = calendarView.value === 'WEEK' ? cells.length : 7
  return Array.from({ length: Math.ceil(cells.length / weekSize) }, (_, weekIndex) => {
    const weekCells = cells.slice(weekIndex * weekSize, (weekIndex + 1) * weekSize)
    const first = weekCells[0]?.date
    const last = weekCells[weekCells.length - 1]?.date
    if (!first || !last) return { cells: weekCells, bars: [] }
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const dayMs = 24 * 60 * 60 * 1000
    const weekStart = startOfDay(first)
    const weekEnd = startOfDay(last)
    const bars = tasks.flatMap(row => {
      const startValue = row.task.start_at ?? row.task.due_at
      const endValue = row.task.due_at ?? row.task.start_at
      if (!startValue || !endValue) return []
      const start = startOfDay(new Date(startValue))
      const end = startOfDay(new Date(endValue))
      if (Number.isNaN(start) || Number.isNaN(end) || end < weekStart || start > weekEnd) return []
      const visibleStart = Math.max(start, weekStart)
      const visibleEnd = Math.min(Math.max(end, start), weekEnd)
      const column = Math.max(0, Math.floor((visibleStart - weekStart) / dayMs))
      const span = Math.min(weekCells.length - column, Math.max(1, Math.floor((visibleEnd - visibleStart) / dayMs) + 1))
      return [{ ...row, column, span, continuesBefore: start < weekStart, continuesAfter: end > weekEnd }]
    })
    const laneEnds: number[] = []
    const barsWithLanes = bars.sort((a, b) => a.column - b.column).map(bar => {
      let lane = laneEnds.findIndex(endColumn => endColumn <= bar.column)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = bar.column + bar.span
      return { ...bar, lane }
    })
    return { cells: weekCells, bars: barsWithLanes }
  })
})
const timelineVisibleRows = computed(() => boardTaskRows.value.filter(row => {
  const search = timelineSearch.value.trim().toLocaleLowerCase('es')
  const matchesSearch = !search || `${row.key} ${row.title} ${row.assignee} ${row.client}`.toLocaleLowerCase('es').includes(search)
  const matchesMember = timelineMemberId.value === 'ALL' || (timelineMemberId.value === 'NONE' ? !row.task.assigned_to : row.task.assigned_to === timelineMemberId.value || row.task.members?.some(member => member.user_id === timelineMemberId.value))
  return matchesSearch && matchesMember
}))
const timelineRange = computed(() => {
  const anchor = calendarMonth.value
  if (timelineScale.value === 'WEEK') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7))
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 84) }
  }
  if (timelineScale.value === 'QUARTER') {
    const start = new Date(anchor.getFullYear(), Math.floor(anchor.getMonth() / 3) * 3, 1)
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 12, 1) }
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 3, 1) }
})
const timelinePeriods = computed(() => {
  const { start, end } = timelineRange.value
  const periods: Array<{ label: string; left: number; width: number }> = []
  const total = end.getTime() - start.getTime()
  const cursor = new Date(start)
  while (cursor < end) {
    const next = timelineScale.value === 'WEEK'
      ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
      : timelineScale.value === 'QUARTER'
        ? new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1)
        : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    periods.push({
      label: timelineScale.value === 'WEEK'
        ? `Sem. ${new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(cursor)}`
        : new Intl.DateTimeFormat('es-AR', { month: 'long', ...(timelineScale.value === 'QUARTER' ? { year: 'numeric' } : {}) }).format(cursor),
      left: (cursor.getTime() - start.getTime()) / total * 100,
      width: (Math.min(next.getTime(), end.getTime()) - cursor.getTime()) / total * 100,
    })
    cursor.setTime(next.getTime())
  }
  return periods
})
const timelineTodayPosition = computed(() => {
  const { start, end } = timelineRange.value
  const today = new Date()
  return today < start || today >= end ? null : (today.getTime() - start.getTime()) / (end.getTime() - start.getTime()) * 100
})
const attachmentRows = computed(() => boardAttachments.value.map(item => ({
  ...item,
  file_name: item.file_name || 'Adjunto de tarea',
  task_key: item.task?.key ?? '',
})))
const documentRows = computed(() => attachmentRows.value.filter(file => file.mime_type === 'application/pdf'))
const UButtonComponent = resolveComponent('UButton')
const UBadgeComponent = resolveComponent('UBadge')
const boardTaskColumns: ExtendedColumn<BoardTaskRow>[] = [
  { accessorKey: 'key', header: 'Clave', meta: { label: 'Clave', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'title', header: 'Tarea', cell: ({ row }) => h(UButtonComponent, { label: row.original.title, color: 'neutral', variant: 'link', class: 'max-w-full justify-start truncate px-0 text-left font-medium', onClick: () => openBoardTask(row.original) }), meta: { label: 'Tarea', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'list', header: 'Estado', cell: ({ row }) => h(UBadgeComponent, { color: row.original.task.completed_at || board.value?.columns.find(column => column.id === row.original.columnId)?.is_closed ? 'success' : 'neutral', variant: 'subtle', size: 'xs', class: 'max-w-full truncate' }, () => row.original.list), meta: { label: 'Estado', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'categoryName', header: 'Categoría', cell: ({ row }) => h(UBadgeComponent, { color: 'neutral', variant: 'subtle', size: 'xs', class: 'max-w-full truncate', style: labelChipStyle(row.original.task.category?.color ?? 'neutral') }, () => row.original.task.category?.name ?? 'Sin categoría'), meta: { label: 'Categoría', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'labelsText', header: 'Etiquetas', cell: ({ row }) => row.original.task.labels?.length ? h('div', { class: 'flex min-w-0 flex-wrap gap-1' }, [...row.original.task.labels.slice(0, 3).map(label => h(UBadgeComponent, { key: label.id, variant: 'subtle', size: 'xs', class: 'max-w-28 truncate', style: labelChipStyle(label.color) }, () => label.name ?? labelColorName(label.color))), ...(row.original.task.labels.length > 3 ? [h(UBadgeComponent, { key: 'more', color: 'neutral', variant: 'subtle', size: 'xs' }, () => `+${row.original.task.labels!.length - 3}`)] : [])]) : h('span', { class: 'text-xs text-muted' }, '—'), meta: { label: 'Etiquetas', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'priority', header: 'Prioridad', cell: ({ row }) => h(UBadgeComponent, { color: priorityColor(row.original.task.priority), variant: 'subtle', size: 'xs', class: 'max-w-full truncate' }, () => row.original.priority), meta: { label: 'Prioridad', filter: { type: 'select', options: ['Baja', 'Normal', 'Alta', 'Urgente'].map(value => ({ label: value, value })) } } },
  { accessorKey: 'assignee', header: 'Responsable', meta: { label: 'Responsable', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'due', header: 'Vencimiento', meta: { label: 'Vencimiento', filter: { type: 'text', operators: ['contains', 'equals'] } } },
  { accessorKey: 'client', header: 'Cliente', meta: { label: 'Cliente', filter: { type: 'text', operators: ['contains', 'equals'] } } },
]
const boardTaskSortFields: SortField[] = [
  { label: 'Clave', value: 'key' }, { label: 'Tarea', value: 'title' }, { label: 'Estado', value: 'list' }, { label: 'Categoría', value: 'categoryName' }, { label: 'Prioridad', value: 'priority' }, { label: 'Responsable', value: 'assignee' }, { label: 'Vencimiento', value: 'due' },
]
const boardListMenuItems = computed(() => [[
  { label: hideCompletedColumns.value ? 'Mostrar finalizadas' : 'Ocultar finalizadas', icon: hideCompletedColumns.value ? 'i-lucide-eye' : 'i-lucide-eye-off', onSelect: () => persistHideCompletedColumns(!hideCompletedColumns.value) },
  { label: boardListShowSubtasks.value ? 'Ocultar subtareas' : 'Mostrar subtareas', icon: 'i-lucide-list-tree', onSelect: () => { boardListShowSubtasks.value = !boardListShowSubtasks.value } },
  { label: 'Limpiar búsqueda', icon: 'i-lucide-eraser', disabled: !boardListSearch.value, onSelect: () => { boardListSearch.value = '' } },
]])
const boardTitle = computed(() => isAllBoardsView.value ? 'Todos los tableros' : board.value?.name ?? 'Seleccioná un tablero')
const currentBoardCollapseStorageKey = computed(() => `tasks:collapsed-final-columns:${auth.selectedCompany?.id ?? 'company'}:${auth.user?.id ?? 'user'}:${boardId.value || 'board'}`)
const currentBoardViewSettingsStorageKey = computed(() => `tasks:view-settings:${auth.selectedCompany?.id ?? 'company'}:${auth.user?.id ?? 'user'}:${boardId.value || 'board'}`)
const hideCompletedColumnsStorageKey = computed(() => `tasks:hide-final-columns:${auth.selectedCompany?.id ?? 'company'}:${auth.user?.id ?? 'user'}`)
const columnMoveOptions = computed(() => {
  const columns = board.value?.columns ?? []
  const sourceId = moveColumnSource.value?.id
  return [
    { label: 'Al principio', value: '0' },
    ...columns.filter(column => column.id !== sourceId).map(column => ({
      label: `Después de ${column.name}`,
      value: String(columns.findIndex(item => item.id === column.id) + 1),
    })),
  ]
})
const labelColorOptions = [
  { label: 'Naranja', value: 'warning', background: '#9b4e00', foreground: '#ffe1bf' },
  { label: 'Rojo', value: 'error', background: '#a92d27', foreground: '#ffe0dd' },
  { label: 'Azul', value: 'info', background: '#205db3', foreground: '#deebff' },
  { label: 'Verde', value: 'success', background: '#216b52', foreground: '#d5f3e6' },
  { label: 'Violeta', value: 'primary', background: '#793da0', foreground: '#f0defa' },
  { label: 'Gris', value: 'neutral', background: '#555b66', foreground: '#f0f1f3' },
]
const actionPanelTitle = computed(() => {
  switch (activeActionPanel.value) {
    case 'add': return 'Añadir a la tarea'
    case 'labels': return 'Etiquetas'
    case 'checklist': return 'Añadir checklist'
    case 'members': return 'Miembros'
    case 'client': return 'Cliente asociado'
    case 'category': return 'Categoría'
    case 'priority': return 'Prioridad'
    case 'start': return 'Fecha de inicio'
    case 'due': return 'Fecha de vencimiento'
    default: return 'Acciones de tarea'
  }
})
const canEditTask = computed(() => selectedTask.value ? hasTaskPermission('tasks.update') : hasTaskPermission('tasks.create'))
const canConvertChecklistItem = computed(() => hasTaskPermission('tasks.create') && hasTaskPermission('tasks.update'))
const checklistSummary = (checklist: TaskChecklist) => `${checklist.items.filter(item => item.completed).length}/${checklist.items.length}`
const attachmentAccept = 'image/*,.pdf'
const priorityOptions = [
  { label: 'Baja', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Alta', value: 'HIGH' },
  { label: 'Urgente', value: 'URGENT' },
]
const taskRelationOptions: Array<{ label: string; value: TaskRelationInputType }> = [
  { label: 'Bloquea', value: 'BLOCKS' },
  { label: 'Está bloqueada por', value: 'BLOCKED_BY' },
  { label: 'Complementa', value: 'COMPLEMENTS' },
  { label: 'Relacionada con', value: 'RELATES_TO' },
]
const linkedTaskRows = computed(() => [
  ...(taskParent.value ? [{ id: `parent:${taskParent.value.id}`, relation: 'Subtarea de', task: taskParent.value }] : []),
  ...taskSubtasks.value.map(task => ({ id: `subtask:${task.id}`, relation: 'Subtarea', task })),
  ...taskRelations.value.map(relation => ({ id: `${relation.task.id}:${relation.direction}`, relation: taskRelationLabel(relation), task: relation.task })),
])

function taskMemberRoleLabel(role: TaskMemberRole) {
  return role === 'REVIEWER' ? 'Auditor' : role === 'OBSERVER' ? 'Observador' : 'Colaborador'
}

function addTaskMember() {
  if (memberToAdd.value === 'NONE' || memberToAdd.value === taskForm.assigned_to || taskForm.members.some(member => member.user_id === memberToAdd.value)) return
  taskForm.members.push({ user_id: memberToAdd.value, role: memberRoleToAdd.value })
  memberToAdd.value = 'NONE'
}

function removeTaskMember(userId: string) {
  taskForm.members = taskForm.members.filter(member => member.user_id !== userId)
}

watch(() => taskForm.assigned_to, assignedTo => {
  if (assignedTo !== 'NONE') removeTaskMember(assignedTo)
})

function formatDueDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null
}

function formatFileSize(value?: number | null) {
  if (!value) return 'Tamaño no disponible'
  return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`
}

function descriptionPreview(value: string) {
  return value.replace(/<\/(p|li|h[1-6]|blockquote|pre)>/gi, ' ').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

function isOverdue(task: TaskRecord) {
  return !!task.due_at && !task.completed_at && new Date(task.due_at).getTime() < new Date().setHours(0, 0, 0, 0)
}

function priorityLabel(priority: TaskRecord['priority']) {
  return ({ LOW: 'Baja', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente' } as const)[priority]
}

function priorityColor(priority: TaskRecord['priority']) {
  return ({ LOW: 'neutral', NORMAL: 'primary', HIGH: 'warning', URGENT: 'error' } as const)[priority]
}

function columnMenuItems(column: TaskColumn) {
  const columns = board.value?.columns ?? []
  const groups = [] as Array<Array<Record<string, any>>>
  if (hasTaskPermission('tasks.create')) {
    groups.push([
      { label: 'Añadir tarjeta', icon: 'i-lucide-plus', onSelect: () => startQuickAdd(column) },
      { label: 'Copiar lista', icon: 'i-lucide-copy', onSelect: () => void copyColumn(column) },
    ])
  }
  if (hasTaskPermission('tasks.update')) {
    groups.push([
      { label: 'Mover lista…', icon: 'i-lucide-arrow-right-left', onSelect: () => openMoveColumn(column) },
      { label: 'Mover todas las tarjetas de esta lista…', icon: 'i-lucide-list-end', disabled: !!board.value?.require_work_log_on_transition || (column.total_tasks ?? column.tasks.length) === 0 || columns.length < 2, onSelect: () => openMoveTasks(column) },
    ])
    groups.push([
      { label: column.is_pinned ? 'Desfijar lista' : 'Fijar lista', icon: column.is_pinned ? 'i-lucide-pin-off' : 'i-lucide-pin', onSelect: () => void toggleColumnPreference(column, 'is_pinned') },
      { label: column.is_watching ? 'Dejar de seguir' : 'Seguir lista', icon: column.is_watching ? 'i-lucide-eye-off' : 'i-lucide-eye', onSelect: () => void toggleColumnPreference(column, 'is_watching') },
    ])
  }
  if (!groups.length) {
    groups.push([{ label: 'Tu rol solo puede consultar esta lista', icon: 'i-lucide-lock-keyhole', disabled: true }])
  }
  return groups
}

function labelColor(color: string) {
  return ({ primary: 'primary', success: 'success', info: 'info', warning: 'warning', error: 'error', neutral: 'neutral' } as const)[color as 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'] ?? 'primary'
}

function categoryColor(color: string) { return labelColor(color) }

function formatWorkedTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours && remainingMinutes) return `${hours} h ${remainingMinutes} min`
  if (hours) return `${hours} h`
  return `${remainingMinutes} min`
}

function formatTimerDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':')
}

function isWorkLogRequiredError(error: any) { return error?.data?.code === 'TASK_WORK_LOG_REQUIRED' }

function requestRequiredWorkLog(action: PendingWorkLogAction) {
  pendingWorkLogAction.value = action
  requiredWorkLogMinutes.value = '30'
  requiredWorkLogDescription.value = ''
  showRequiredWorkLogModal.value = true
}

async function loadWorkLogs(taskId: string) {
  try {
    const result = await service.getWorkLogs(taskId)
    workLogs.value = result.items
    directWorkMinutes.value = result.direct_minutes
    subtaskWorkMinutes.value = result.subtasks_minutes
    totalWorkMinutes.value = result.total_minutes
    workLogsLimited.value = result.limited
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar el tiempo insumido', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function addWorkLog() {
  const taskId = selectedTask.value?.id
  const minutes = Number(workLogMinutes.value)
  if (!taskId || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !canEditTask.value) return
  addingWorkLog.value = true
  try {
    await service.addWorkLog(taskId, { minutes, description: workLogDescription.value.trim() || undefined })
    workLogMinutes.value = '30'
    workLogDescription.value = ''
    await loadWorkLogs(taskId)
    toast.add({ title: 'Tiempo registrado', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo registrar el tiempo', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { addingWorkLog.value = false }
}

async function submitRequiredWorkLog() {
  const action = pendingWorkLogAction.value
  const minutes = Number(requiredWorkLogMinutes.value)
  if (!action || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return
  submittingRequiredWorkLog.value = true
  const workLog: TaskWorkLogInput = { minutes, description: requiredWorkLogDescription.value.trim() || undefined }
  try {
    if (action.type === 'saveTask') {
      await service.updateTask(action.taskId, { ...action.payload, work_log: workLog })
      await loadBoard()
      selectedTask.value = board.value?.columns.flatMap(column => column.tasks).find(task => task.id === action.taskId) ?? selectedTask.value
      await loadWorkLogs(action.taskId)
      toast.add({ title: 'Tarea actualizada', color: 'success' })
    } else if (action.type === 'moveTask') {
      await service.updateTask(action.taskId, { column_id: action.columnId, position: action.position, work_log: workLog })
      await loadBoard()
      await loadWorkLogs(action.taskId)
      toast.add({ title: 'Tarea movida', color: 'success' })
    } else {
      await service.setTaskCompletion(action.taskId, action.completed, workLog)
      await loadBoard()
      selectedTask.value = board.value?.columns.flatMap(column => column.tasks).find(task => task.id === action.taskId) ?? selectedTask.value
      await loadWorkLogs(action.taskId)
      toast.add({ title: action.completed ? 'Tarea completada' : 'Tarea reabierta', color: 'success' })
    }
    showRequiredWorkLogModal.value = false
    pendingWorkLogAction.value = null
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar el cambio', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { submittingRequiredWorkLog.value = false }
}

function openBoardSettings() {
  refreshTimerDesktopNotificationPermission()
  boardRequireWorkLogDraft.value = !!board.value?.require_work_log_on_transition
  boardAllowTimerDraft.value = !!board.value?.allow_task_timer
  boardTimerMaxHoursDraft.value = board.value?.task_timer_max_hours ?? 8
  boardSettingsOpen.value = true
}

function refreshTimerDesktopNotificationPermission() {
  if (!import.meta.client || !('Notification' in window)) {
    timerDesktopNotificationPermission.value = 'unsupported'
    return
  }
  timerDesktopNotificationPermission.value = Notification.permission
}

async function requestTimerDesktopNotifications() {
  if (!import.meta.client || !('Notification' in window)) {
    timerDesktopNotificationPermission.value = 'unsupported'
    return
  }
  timerDesktopNotificationPermission.value = await Notification.requestPermission()
  toast.add({
    title: timerDesktopNotificationPermission.value === 'granted' ? 'Avisos del navegador habilitados' : 'El navegador no autorizó los avisos',
    description: timerDesktopNotificationPermission.value === 'denied' ? 'Podés cambiarlo desde los permisos del sitio en el navegador.' : undefined,
    color: timerDesktopNotificationPermission.value === 'granted' ? 'success' : 'warning',
  })
}

async function saveBoardSettings() {
  if (!board.value) return
  savingBoardSettings.value = true
  try {
    const updated = await service.updateBoardSettings(board.value.id, { require_work_log_on_transition: boardRequireWorkLogDraft.value, allow_task_timer: boardAllowTimerDraft.value, task_timer_max_hours: boardTimerMaxHoursDraft.value })
    board.value.require_work_log_on_transition = updated.require_work_log_on_transition
    board.value.allow_task_timer = updated.allow_task_timer
    board.value.task_timer_max_hours = updated.task_timer_max_hours
    boardSettingsOpen.value = false
    toast.add({ title: 'Configuración del tablero guardada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la configuración', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { savingBoardSettings.value = false }
}

async function startSelectedTaskTimer() {
  const task = selectedTask.value
  if (!task || !canEditTask.value || !board.value?.allow_task_timer) return
  try {
    await taskTimer.start(task.id)
    toast.add({ title: 'Temporizador iniciado', description: task.title, color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo iniciar el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function toggleSelectedTaskTimer() {
  try {
    if (taskTimer.timer?.paused) await taskTimer.resume()
    else await taskTimer.pause()
  } catch (error: any) {
    toast.add({ title: 'No se pudo actualizar el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function finishSelectedTaskTimer() {
  if (!selectedTask.value?.id || !selectedTaskTimer.value) return
  try {
    await taskTimer.requestFinish()
  } catch (error: any) {
    toast.add({ title: 'No se pudo pausar el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

watch(() => taskTimer.timer, (current, previous) => {
  if (!current && previous && selectedTask.value?.id === previous.task_id) void loadWorkLogs(previous.task_id)
})

function toggleBoardMemberFilter(memberId: string) {
  if (memberId === 'NONE') {
    taskFilters.member_ids = taskFilters.member_ids.includes('NONE') ? [] : ['NONE']
    return
  }
  taskFilters.member_ids = taskFilters.member_ids.includes(memberId)
    ? taskFilters.member_ids.filter(id => id !== memberId)
    : [...taskFilters.member_ids.filter(id => id !== 'NONE' && id !== 'ME'), memberId]
}

function isColumnCollapsed(column: TaskColumn) { return collapsedClosedColumnIds.value.includes(column.id) }

function restoreCollapsedClosedColumns() {
  if (!import.meta.client) return
  try {
    collapsedClosedColumnIds.value = JSON.parse(localStorage.getItem(currentBoardCollapseStorageKey.value) ?? '[]')
  } catch {
    collapsedClosedColumnIds.value = []
  }
}

function restoreBoardViewSettings() {
  if (!import.meta.client) return
  Object.assign(boardViewSettings, { columnWidth: 'FIXED', scrollMode: 'BOARD', hideCompletedAfter: 'NEVER' })
  try {
    const saved = JSON.parse(localStorage.getItem(currentBoardViewSettingsStorageKey.value) ?? '{}')
    if (saved.columnWidth === 'FIXED' || saved.columnWidth === 'FLEXIBLE') boardViewSettings.columnWidth = saved.columnWidth
    if (saved.scrollMode === 'BOARD' || saved.scrollMode === 'COLUMNS') boardViewSettings.scrollMode = saved.scrollMode
    if (['NEVER', 'IMMEDIATELY', 'DAY', 'WEEK', 'MONTH'].includes(saved.hideCompletedAfter)) boardViewSettings.hideCompletedAfter = saved.hideCompletedAfter
  } catch {
    boardViewSettings.columnWidth = 'FIXED'
    boardViewSettings.scrollMode = 'BOARD'
    boardViewSettings.hideCompletedAfter = 'NEVER'
  }
}

function persistBoardViewSettings() {
  if (import.meta.client) localStorage.setItem(currentBoardViewSettingsStorageKey.value, JSON.stringify(boardViewSettings))
}

function setBoardViewSetting(key: 'columnWidth' | 'scrollMode', value: 'FIXED' | 'FLEXIBLE' | 'BOARD' | 'COLUMNS') {
  if (key === 'columnWidth' && (value === 'FIXED' || value === 'FLEXIBLE')) boardViewSettings.columnWidth = value
  if (key === 'scrollMode' && (value === 'BOARD' || value === 'COLUMNS')) boardViewSettings.scrollMode = value
  persistBoardViewSettings()
}

function shouldHideCompletedTask(task: TaskRecord) {
  if (!task.completed_at || boardViewSettings.hideCompletedAfter === 'NEVER') return false
  if (boardViewSettings.hideCompletedAfter === 'IMMEDIATELY') return true
  const cutoff = { DAY: 24, WEEK: 24 * 7, MONTH: 24 * 30 }[boardViewSettings.hideCompletedAfter]
  return boardViewClock.value - new Date(task.completed_at).getTime() >= cutoff * 60 * 60 * 1000
}

function toggleColumnCollapsed(column: TaskColumn) {
  const ids = new Set(collapsedClosedColumnIds.value)
  if (ids.has(column.id)) ids.delete(column.id)
  else ids.add(column.id)
  collapsedClosedColumnIds.value = [...ids]
  if (import.meta.client) localStorage.setItem(currentBoardCollapseStorageKey.value, JSON.stringify(collapsedClosedColumnIds.value))
}

function restoreHideCompletedColumns() {
  if (!import.meta.client) return
  const saved = localStorage.getItem(hideCompletedColumnsStorageKey.value)
  hideCompletedColumns.value = saved === null ? true : saved !== 'false'
}

function persistHideCompletedColumns(value: boolean) {
  hideCompletedColumns.value = value
  if (import.meta.client) localStorage.setItem(hideCompletedColumnsStorageKey.value, String(value))
}

function resetBoardFilters() {
  Object.assign(taskFilters, { search: '', member_ids: [], label_ids: [], category_ids: [], party_ids: [], completion: 'ALL', priority: 'ALL', due_status: 'ALL' })
}

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  savingCategory.value = true
  try {
    const category = await service.createCategory({ name, color: newCategoryColor.value })
    const existing = categories.value.findIndex(item => item.id === category.id)
    if (existing >= 0) categories.value.splice(existing, 1, category)
    else categories.value.push(category)
    categoryNameDrafts[category.id] = category.name
    categoryColorDrafts[category.id] = category.color
    newCategoryName.value = ''
    newCategoryColor.value = 'neutral'
    toast.add({ title: 'Categoría agregada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la categoría', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { savingCategory.value = false }
}

async function saveCategory(category: TaskCategory) {
  updatingCategoryId.value = category.id
  try {
    const updated = await service.updateCategory(category.id, { name: categoryNameDrafts[category.id] ?? category.name, color: categoryColorDrafts[category.id] ?? category.color })
    categories.value.splice(categories.value.findIndex(item => item.id === category.id), 1, updated)
    categoryNameDrafts[category.id] = updated.name
    categoryColorDrafts[category.id] = updated.color
    toast.add({ title: 'Categoría actualizada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo actualizar la categoría', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { updatingCategoryId.value = '' }
}

async function toggleCategoryActive(category: TaskCategory) {
  updatingCategoryId.value = category.id
  try {
    const updated = await service.updateCategory(category.id, { active: !category.active })
    categories.value.splice(categories.value.findIndex(item => item.id === category.id), 1, updated)
  } catch (error: any) {
    toast.add({ title: 'No se pudo cambiar la categoría', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { updatingCategoryId.value = '' }
}

function labelColorName(color: string) {
  return labelColorOptions.find(option => option.value === color)?.label ?? 'Color'
}

function labelChipStyle(color: string) {
  const option = labelColorOptions.find(item => item.value === color) ?? labelColorOptions[4]
  return { backgroundColor: option.background, color: option.foreground }
}

async function loadBoards() {
  const pageSize = 100
  const loadedBoards: TaskBoard[] = []
  let skip = 0
  while (true) {
    const page = await service.getBoards(skip, pageSize)
    loadedBoards.push(...page)
    if (page.length < pageSize) break
    skip += page.length
  }
  boards.value = loadedBoards
  taskSidebarBoardLinks.value = { companyId: auth.selectedCompany?.id ?? null, items: boards.value.map(item => ({ id: item.id, name: item.name })) }
  const requestedId = typeof route.query.board_id === 'string' ? route.query.board_id : ''
  const requestedPartyId = typeof route.query.party_id === 'string' ? route.query.party_id : ''
  const chosen = boards.value.find(item => item.id === requestedId)
    ?? boards.value.find(item => item.party_id === requestedPartyId)
  boardId.value = chosen?.id ?? ''
}

function openBoardOverviewItem(item: TaskBoard) {
  activeBoardTab.value = 'SUMMARY'
  void router.push({ path: '/erp/tasks', query: { board_id: item.id } })
}

async function loadBoard() {
  if (!boardId.value) {
    board.value = null
    return
  }
  board.value = await service.getBoard(boardId.value, {
    ...(taskFilters.party_ids.length ? { party_ids: taskFilters.party_ids.join(',') } : {}),
    ...(taskFilters.search.trim() ? { search: taskFilters.search.trim() } : {}),
    ...(taskFilters.member_ids.length ? { member_ids: taskFilters.member_ids.join(',') } : {}),
    ...(taskFilters.label_ids.length ? { label_ids: taskFilters.label_ids.join(',') } : {}),
    ...(taskFilters.category_ids.length ? { category_ids: taskFilters.category_ids.join(',') } : {}),
    ...(taskFilters.completion !== 'ALL' ? { completion: taskFilters.completion } : {}),
    ...(taskFilters.priority !== 'ALL' ? { priority: taskFilters.priority } : {}),
    ...(taskFilters.due_status !== 'ALL' ? { due_status: taskFilters.due_status } : {}),
  })
}

async function openTaskFromRoute() {
  const taskId = typeof route.query.task_id === 'string' ? route.query.task_id : ''
  if (!taskId || !boardId.value) return
  try {
    const task = await service.getTask(taskId)
    if (task.board_id !== boardId.value) return
    const column = board.value?.columns.find(item => item.id === task.column_id)
    if (column) {
      const loadedTask = column.tasks.find(item => item.id === task.id)
      openEditTask(loadedTask ?? task, column.id)
    } else {
      openEditTask(task, task.column_id ?? '')
    }
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function load() {
  loading.value = true
  restoreHideCompletedColumns()
  try {
    try {
      await fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id)
    } catch {
      // El middleware también carga permisos; mantener la vista si el fetch es transitorio.
    }
    const initialCustomers = await partiesService.search('', ['CUSTOMER'])
    customerSuggestions.value = initialCustomers.map(party => ({ label: party.name, value: party.id }))
    partyOptions.value = [{ label: 'Todos los clientes', value: 'ALL' }, ...customerSuggestions.value]
    taskPartyOptions.value = [{ label: 'Sin cliente asociado', value: 'NONE' }, ...customerSuggestions.value]
    const requestedPartyId = typeof route.query.party_id === 'string' ? route.query.party_id : ''
    if (requestedPartyId) {
      const party = await partiesService.findOne(requestedPartyId)
      const option = { label: party.name, value: party.id }
      if (!customerSuggestions.value.some(item => item.value === option.value)) customerSuggestions.value.unshift(option)
      partyOptions.value = [{ label: 'Todos los clientes', value: 'ALL' }, ...customerSuggestions.value]
      taskPartyOptions.value = [{ label: 'Sin cliente asociado', value: 'NONE' }, ...customerSuggestions.value]
      taskFilters.party_ids = [party.id]
    }
    const results = await Promise.all([loadBoards(), service.getMembers(), service.getLabels(), service.getCategories()])
    members.value = results[1]
    labels.value = results[2]
    categories.value = results[3]
    for (const category of categories.value) {
      categoryNameDrafts[category.id] = category.name
      categoryColorDrafts[category.id] = category.color
    }
    try {
      const notificationSettings = await service.getNotificationSettings()
      taskNotificationSettings.in_app_enabled = notificationSettings.in_app_enabled
      taskNotificationSettings.task_changes_enabled = notificationSettings.task_changes_enabled
      taskNotificationSettingsLoaded.value = true
      taskNotificationSettingsError.value = ''
    } catch (error: any) {
      // Una preferencia de avisos no debe impedir que se abra el tablero.
      taskNotificationSettingsLoaded.value = false
      taskNotificationSettingsError.value = error?.data?.message ?? 'No se pudieron cargar las preferencias de avisos.'
    }
    restoreCollapsedClosedColumns()
    restoreBoardViewSettings()
    if (boardId.value) await loadBoard()
    await openTaskFromRoute()
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar las tareas', description: error?.data?.message ?? 'Revisá tu permiso y la conexión.', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function saveTaskNotificationSettings() {
  if (!taskNotificationSettingsLoaded.value) return
  savingTaskNotificationSettings.value = true
  try {
    const saved = await service.saveNotificationSettings({ ...taskNotificationSettings })
    taskNotificationSettings.in_app_enabled = saved.in_app_enabled
    taskNotificationSettings.task_changes_enabled = saved.task_changes_enabled
    taskNotificationSettingsLoaded.value = true
    taskNotificationSettingsError.value = ''
    toast.add({ title: 'Preferencias guardadas', description: saved.task_changes_enabled ? 'Los cambios se avisan a las personas relacionadas, excepto a quien los realiza.' : 'Se desactivaron los avisos de cambios para esta empresa.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    savingTaskNotificationSettings.value = false
  }
}

async function openTaskNotificationSettings() {
  taskNotificationSettingsOpen.value = true
  whatsappModuleRefreshError.value = ''
  const companyId = auth.selectedCompany?.id
  if (!companyId) {
    whatsappModuleRefreshError.value = 'No se pudo identificar la empresa activa.'
    return
  }

  whatsappModuleRefreshing.value = true
  try {
    // El módulo puede haberse habilitado desde otra pestaña después de cargar el tablero.
    await platformModules.fetchEffective(companyId, true)
  } catch {
    whatsappModuleRefreshError.value = 'No se pudo verificar si WhatsApp está habilitado para esta empresa.'
  } finally {
    whatsappModuleRefreshing.value = false
  }
}

let partyFilterSearchTimer: ReturnType<typeof setTimeout> | undefined
let taskPartySearchTimer: ReturnType<typeof setTimeout> | undefined
let taskFilterReloadTimer: ReturnType<typeof setTimeout> | undefined
let partyFilterSearchController: AbortController | undefined
let taskPartySearchController: AbortController | undefined
function searchCustomers(value: string, target: 'filter' | 'task') {
  const isFilter = target === 'filter'
  const timer = isFilter ? partyFilterSearchTimer : taskPartySearchTimer
  const controller = isFilter ? partyFilterSearchController : taskPartySearchController
  if (timer) clearTimeout(timer)
  controller?.abort()
  const term = value.trim()
  if (term.length < 2) {
    if (isFilter) partyOptions.value = [{ label: 'Todos los clientes', value: 'ALL' }, ...customerSuggestions.value]
    else taskPartyOptions.value = [{ label: 'Sin cliente asociado', value: 'NONE' }, ...customerSuggestions.value]
    return
  }
  if (isFilter) partySearchLoading.value = true
  else taskPartySearchLoading.value = true
  const nextTimer = setTimeout(async () => {
    const nextController = new AbortController()
    if (isFilter) partyFilterSearchController = nextController
    else taskPartySearchController = nextController
    try {
      const results = await partiesService.search(term, ['CUSTOMER'], nextController.signal)
      const next = results.map(party => ({ label: party.name, value: party.id }))
      const selected = isFilter ? taskFilters.party_ids : [taskForm.party_id]
      const selectedIds = selected.filter(id => id !== 'ALL' && id !== 'NONE')
      const missingSelected = selectedIds.filter(id => !next.some(option => option.value === id))
      if (missingSelected.length) {
        next.unshift(...customerSuggestions.value.filter(option => missingSelected.includes(option.value)))
      }
      if (isFilter) partyOptions.value = [{ label: 'Todos los clientes', value: 'ALL' }, ...next]
      else taskPartyOptions.value = [{ label: 'Sin cliente asociado', value: 'NONE' }, ...next]
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        if (isFilter) partyOptions.value = [{ label: 'Todos los clientes', value: 'ALL' }, ...customerSuggestions.value]
        else taskPartyOptions.value = [{ label: 'Sin cliente asociado', value: 'NONE' }, ...customerSuggestions.value]
      }
    } finally {
      if (isFilter) partySearchLoading.value = false
      else taskPartySearchLoading.value = false
    }
  }, 220)
  if (isFilter) partyFilterSearchTimer = nextTimer
  else taskPartySearchTimer = nextTimer
}
watch(partyFilterSearch, value => searchCustomers(value, 'filter'))
watch(taskPartySearch, value => searchCustomers(value, 'task'))
watch(relationSearch, search => {
  const taskId = selectedTask.value?.id
  if (!taskId) return
  if (relationSearchTimer) clearTimeout(relationSearchTimer)
  relationSearchTimer = setTimeout(() => { void loadRelationCandidates(taskId, search) }, 250)
})

watch(boardId, async () => {
  if (loading.value || !boardId.value) return
  activeBoardTab.value = 'SUMMARY'
  if (route.query.board_id !== boardId.value) {
    const query = { ...route.query, board_id: boardId.value }
    void router.replace({ query })
  }
  restoreCollapsedClosedColumns()
  restoreBoardViewSettings()
  try {
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir el tablero', description: error?.data?.message ?? error.message, color: 'error' })
  }
})

watch(() => route.query.board_id, id => {
  if (typeof id === 'string' && id !== boardId.value && boards.value.some(item => item.id === id)) boardId.value = id
  else if (typeof id !== 'string' && route.path === '/erp/tasks') {
    boardId.value = ''
    board.value = null
    showTaskModal.value = false
    selectedTask.value = null
    boardWorkspaceExpanded.value = false
    boardSettingsOpen.value = false
    activeBoardTab.value = 'SUMMARY'
  }
})

watch([boardId, activeBoardTab], async ([id, tab]) => {
  const requestId = ++boardAttachmentsRequestId
  if (!id || !['ATTACHMENTS', 'DOCUMENTS'].includes(tab)) {
    boardAttachmentsLoading.value = false
    return
  }
  boardAttachmentsLoading.value = true
  try {
    const result = await photosService.getTaskBoardAttachments(id)
    if (requestId !== boardAttachmentsRequestId) return
    boardAttachments.value = result.items ?? []
    boardAttachmentsHasMore.value = !!result.has_more
    boardAttachmentsHasMoreTasks.value = !!result.has_more_tasks
  } catch (error: any) {
    if (requestId === boardAttachmentsRequestId) {
      boardAttachments.value = []
      toast.add({ title: 'No se pudieron cargar los adjuntos', description: error?.data?.message ?? error.message, color: 'error' })
    }
  } finally {
    if (requestId === boardAttachmentsRequestId) boardAttachmentsLoading.value = false
  }
})

watch([boardId, activeBoardTab], async ([id, tab]) => {
  if (!id || tab !== 'SUMMARY') return
  summaryActivityLoading.value = true
  await notificationFeed.refresh(50)
  summaryActivityLoading.value = false
})

watch(taskFilters, () => {
  if (loading.value || !boardId.value) return
  if (taskFilterReloadTimer) clearTimeout(taskFilterReloadTimer)
  taskFilterReloadTimer = setTimeout(() => {
    loadBoard().catch((error: any) => toast.add({ title: 'No se pudieron aplicar los filtros', description: error?.data?.message ?? error.message, color: 'error' }))
  }, taskFilters.search.trim() ? 250 : 0)
}, { deep: true })

watch(() => route.query.task_id, async taskId => {
  if (loading.value || typeof taskId !== 'string') return
  const requestedBoard = typeof route.query.board_id === 'string' ? route.query.board_id : ''
  if (requestedBoard && requestedBoard !== boardId.value && boards.value.some(item => item.id === requestedBoard)) {
    boardId.value = requestedBoard
    await nextTick()
  }
  try {
    await loadBoard()
    await openTaskFromRoute()
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  }
})

function openBoardModal() {
  taskPartySearch.value = ''
  taskKeyPrefixManuallyEdited.value = false
  Object.assign(boardForm, { name: '', task_key_prefix: '', description: '', party_id: taskFilters.party_ids.length === 1 ? taskFilters.party_ids[0] : 'NONE', columns: 'Pendiente\nEn curso\nEn revisión\nFinalizada' })
  showBoardModal.value = true
}

function suggestTaskKeyPrefix(name: string) {
  const stopWords = new Set(['Y', 'DE', 'DEL', 'LA', 'EL', 'EN', 'PARA', 'POR'])
  const words = (name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) ?? []).filter(word => !stopWords.has(word))
  return words.length > 1 ? (words.map(word => word[0]).join('').slice(0, 4) || 'TK') : (words[0] ?? 'TK').slice(0, 3)
}

watch(() => boardForm.name, name => {
  if (!taskKeyPrefixManuallyEdited.value) boardForm.task_key_prefix = suggestTaskKeyPrefix(name)
})

function closeBoardModal() { showBoardModal.value = false }
function closeTaskModal() {
  showTaskModal.value = false
  timeModalOpen.value = false
  taskRelationCreateOpen.value = false
  closeActionPanel()
  labelCreateModalOpen.value = false
  labelEditModalOpen.value = false
  clearAttachmentPreview()
  if (route.query.task_id) {
    const query = { ...route.query }
    delete query.task_id
    void router.replace({ query })
  }
}
function clearAttachmentPreview() {
  attachmentPreviewRequestId.value += 1
  if (attachmentPreviewUrl.value) URL.revokeObjectURL(attachmentPreviewUrl.value)
  attachmentPreviewUrl.value = ''
  previewAttachment.value = null
  attachmentPreviewLoading.value = false
  attachmentPreviewError.value = ''
}
async function openAttachmentPreview(file: any) {
  clearAttachmentPreview()
  previewAttachment.value = file
  attachmentPreviewLoading.value = true
  const requestId = ++attachmentPreviewRequestId.value
  try {
    const url = file.url || `/api/media/files/${file.file_id}/view`
    const blob = await photosService.getMediaBlob(url)
    if (!blob.size) throw new Error('El servidor devolvió un archivo vacío.')
    if (requestId !== attachmentPreviewRequestId.value) return
    if (blob.type && (!file.mime_type || file.mime_type === 'application/octet-stream')) file.mime_type = blob.type
    attachmentPreviewUrl.value = URL.createObjectURL(blob)
  } catch (error: any) {
    if (requestId === attachmentPreviewRequestId.value) attachmentPreviewError.value = error?.message || 'No se pudo cargar el archivo.'
  } finally {
    if (requestId === attachmentPreviewRequestId.value) attachmentPreviewLoading.value = false
  }
}
async function downloadTaskAttachment(file: any) {
  try {
    const blob = await photosService.getMediaBlob(file.download_url || `/api/media/files/${file.file_id}/download`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.file_name || 'adjunto'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error: any) {
    toast.add({ title: 'No se pudo descargar el adjunto', description: error?.message ?? 'Intentá nuevamente.', color: 'error' })
  }
}
function cancelQuickAdd() { quickAddColumnId.value = '' }
function cancelNewColumn() { showNewColumnForm.value = false }
function openNewColumnForm() { showNewColumnForm.value = true }
function toggleActionPanel(panel: NonNullable<typeof activeActionPanel.value>) {
  if (activeActionPanel.value === panel && actionModalOpen.value) {
    closeActionPanel()
    return
  }
  if (panel === 'labels') labelSearchTerm.value = ''
  activeActionPanel.value = panel
  actionModalOpen.value = true
}
function setActionPanel(panel: NonNullable<typeof activeActionPanel.value>) {
  if (panel === 'labels') labelSearchTerm.value = ''
  activeActionPanel.value = panel
  actionModalOpen.value = true
}
function closeActionPanel() {
  actionModalOpen.value = false
  activeActionPanel.value = null
  labelCreateModalOpen.value = false
  labelEditModalOpen.value = false
}
function toggleTaskLabel(labelId: string) {
  taskForm.label_ids = taskForm.label_ids.includes(labelId)
    ? taskForm.label_ids.filter(id => id !== labelId)
    : [...taskForm.label_ids, labelId]
}

async function createBoard() {
  if (boardForm.name.trim().length < 2) return
  saving.value = true
  try {
    const columns = boardForm.columns.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
    const created = await service.createBoard({ name: boardForm.name.trim(), task_key_prefix: boardForm.task_key_prefix.trim() || suggestTaskKeyPrefix(boardForm.name), description: boardForm.description.trim() || undefined, party_id: boardForm.party_id === 'NONE' ? null : boardForm.party_id, columns })
    toast.add({ title: 'Tablero creado', color: 'success' })
    showBoardModal.value = false
    await loadBoards()
    boardId.value = created.id
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo crear el tablero', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

function startQuickAdd(column: TaskColumn) {
  quickAddColumnId.value = column.id
  quickTaskTitle.value = ''
}

async function saveQuickTask(column: TaskColumn) {
  const title = quickTaskTitle.value.trim()
  if (!title || !boardId.value) return
  saving.value = true
  try {
    await service.createTask(boardId.value, {
      title,
      column_id: column.id,
      party_id: board.value?.party_id ?? (taskFilters.party_ids.length === 1 ? taskFilters.party_ids[0] : null),
      priority: 'NORMAL',
    })
    quickTaskTitle.value = ''
    quickAddColumnId.value = ''
    toast.add({ title: 'Tarjeta añadida', color: 'success' })
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo añadir la tarjeta', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function addColumn() {
  const name = newColumnName.value.trim()
  if (!name || !boardId.value) return
  creatingColumn.value = true
  try {
    await service.createColumn(boardId.value, name)
    newColumnName.value = ''
    showNewColumnForm.value = false
    toast.add({ title: 'Lista añadida', color: 'success' })
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo añadir la lista', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    creatingColumn.value = false
  }
}

async function copyColumn(column: TaskColumn) {
  try {
    const copied = await service.copyColumn(column.id)
    toast.add({ title: 'Lista copiada', description: `${copied.copied_tasks} tarjetas copiadas.`, color: 'success' })
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo copiar la lista', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function moveColumn(column: TaskColumn, position: number) {
  if (position < 0 || position >= (board.value?.columns.length ?? 0)) return
  try {
    await service.moveColumn(column.id, position)
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo mover la lista', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

function openMoveColumn(column: TaskColumn) {
  moveColumnSource.value = column
  moveColumnPosition.value = String(board.value?.columns.findIndex(item => item.id === column.id) ?? 0)
  showMoveColumnModal.value = true
}

async function confirmMoveColumn() {
  if (!moveColumnSource.value) return
  movingColumn.value = true
  try {
    await service.moveColumn(moveColumnSource.value.id, Number(moveColumnPosition.value))
    showMoveColumnModal.value = false
    toast.add({ title: 'Lista reubicada', color: 'success' })
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo mover la lista', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    movingColumn.value = false
  }
}

function openMoveTasks(column: TaskColumn) {
  moveTasksFrom.value = column
  moveTasksTargetId.value = board.value?.columns.find(item => item.id !== column.id)?.id ?? ''
  showMoveTasksModal.value = true
}

async function confirmMoveAllTasks() {
  if (!moveTasksFrom.value || !moveTasksTargetId.value) return
  movingAllTasks.value = true
  try {
    const result = await service.moveAllTasks(moveTasksFrom.value.id, moveTasksTargetId.value)
    toast.add({ title: 'Tarjetas movidas', description: `${result.moved_tasks} tarjetas trasladadas.`, color: 'success' })
    showMoveTasksModal.value = false
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudieron mover las tarjetas', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    movingAllTasks.value = false
  }
}

async function toggleColumnPreference(column: TaskColumn, key: 'is_pinned' | 'is_watching') {
  try {
    await service.updateColumnPreferences(column.id, { [key]: !column[key] })
    toast.add({ title: key === 'is_pinned' ? (column.is_pinned ? 'Lista desfijada' : 'Lista fijada') : (column.is_watching ? 'Dejaste de seguir la lista' : 'Ahora seguís esta lista'), color: 'success' })
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo actualizar la lista', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

function openNewTask(column: TaskColumn) {
  selectedTask.value = null
  comments.value = []
  workLogs.value = []
  totalWorkMinutes.value = 0
  directWorkMinutes.value = 0
  subtaskWorkMinutes.value = 0
  checklists.value = []
  taskSubtasks.value = []
  taskParent.value = null
  taskRelations.value = []
  relationCandidates.value = []
  subtaskTitleDraft.value = ''
  attachments.value = []
  activeActionPanel.value = null
  actionModalOpen.value = false
  descriptionEditing.value = false
  commentDraft.value = ''
  taskPartySearch.value = ''
  newLabelName.value = ''
  Object.assign(taskForm, {
    title: '', description: '', column_id: column.id,
    party_id: board.value?.party_id ?? (taskFilters.party_ids.length === 1 ? taskFilters.party_ids[0] : 'NONE'),
    assigned_to: 'NONE', start_at: '', due_at: '', priority: 'NORMAL',
    category_id: 'NONE',
    label_ids: [],
    members: [],
  })
  memberToAdd.value = 'NONE'
  memberRoleToAdd.value = 'COLLABORATOR'
  showTaskModal.value = true
  workLogMinutes.value = '30'
  workLogDescription.value = ''
}

function openEditTask(task: TaskRecord, columnId: string) {
  selectedTask.value = task
  comments.value = []
  workLogs.value = []
  totalWorkMinutes.value = 0
  directWorkMinutes.value = 0
  subtaskWorkMinutes.value = 0
  checklists.value = []
  taskSubtasks.value = []
  taskParent.value = null
  taskRelations.value = []
  relationCandidates.value = []
  subtaskTitleDraft.value = ''
  relationSearch.value = ''
  relationCandidateId.value = ''
  relationTypeDraft.value = 'BLOCKS'
  attachments.value = []
  activeActionPanel.value = null
  actionModalOpen.value = false
  descriptionEditing.value = false
  commentDraft.value = ''
  taskPartySearch.value = ''
  newLabelName.value = ''
  Object.assign(taskForm, {
    title: task.title,
    description: task.description ?? '',
    column_id: columnId,
    party_id: task.party?.id ?? board.value?.party_id ?? 'NONE',
    assigned_to: task.assigned_to ?? 'NONE',
    start_at: toDateTimeLocal(task.start_at),
    due_at: toDateTimeLocal(task.due_at),
    priority: task.priority,
    category_id: task.category?.id ?? task.category_id ?? 'NONE',
    label_ids: task.labels?.map(label => label.id) ?? [],
    members: task.members?.map(({ user_id, role }) => ({ user_id, role })) ?? [],
  })
  memberToAdd.value = 'NONE'
  memberRoleToAdd.value = 'COLLABORATOR'
  if (task.party && !customerSuggestions.value.some(option => option.value === task.party!.id)) {
    const option = { label: task.party.name, value: task.party.id }
    customerSuggestions.value.push(option)
    partyOptions.value.push(option)
    taskPartyOptions.value.push(option)
  }
  showTaskModal.value = true
  void loadComments(task.id)
  void loadWorkLogs(task.id)
  void loadChecklists(task.id)
  void loadTaskStructure(task.id)
  void loadAttachments(task.id)
}

function openBoardTask(row: BoardTaskRow) {
  activeBoardTab.value = 'BOARD'
  openEditTask(row.task, row.columnId)
}

async function openBoardTaskById(taskId: string) {
  try {
    const task = await service.getTask(taskId)
    const column = board.value?.columns.find(item => item.id === task.column_id)
    openEditTask(task, column?.id ?? task.column_id ?? '')
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

function toggleWorkspaceExpanded() {
  boardWorkspaceExpanded.value = !boardWorkspaceExpanded.value
}

function shiftCalendarMonth(offset: number) {
  calendarMonth.value = calendarView.value === 'WEEK'
    ? new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth(), calendarMonth.value.getDate() + offset * 7)
    : new Date(calendarMonth.value.getFullYear(), calendarMonth.value.getMonth() + offset, 1)
}

function setCalendarToday() {
  const today = new Date()
  calendarMonth.value = calendarView.value === 'WEEK' ? today : new Date(today.getFullYear(), today.getMonth(), 1)
}

function shiftTimeline(direction: number) {
  const anchor = calendarMonth.value
  const next = timelineScale.value === 'WEEK'
    ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + direction * 84)
    : timelineScale.value === 'QUARTER'
      ? new Date(anchor.getFullYear(), anchor.getMonth() + direction * 12, 1)
      : new Date(anchor.getFullYear(), anchor.getMonth() + direction * 3, 1)
  calendarMonth.value = next
}

function setTimelineToday() {
  const today = new Date()
  calendarMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
}

function timelineBarStyle(row: BoardTaskRow) {
  const { start, end } = timelineRange.value
  const startValue = row.task.start_at ?? row.task.due_at
  const endValue = row.task.due_at ?? row.task.start_at
  if (!startValue || !endValue) return { display: 'none' }
  const startTime = new Date(startValue).getTime()
  const endTime = Math.max(new Date(endValue).getTime(), startTime + 24 * 60 * 60 * 1000)
  const rangeStart = start.getTime()
  const rangeEnd = end.getTime()
  if (Number.isNaN(startTime) || startTime >= rangeEnd || endTime <= rangeStart) return { display: 'none' }
  const left = Math.max(0, (startTime - rangeStart) / (rangeEnd - rangeStart) * 100)
  const right = Math.min(100, (endTime - rangeStart) / (rangeEnd - rangeStart) * 100)
  return { left: `${left}%`, width: `${Math.max(1.5, right - left)}%` }
}

function calendarChangeView(view: 'MONTH' | 'WEEK') {
  if (calendarView.value === view) return
  calendarView.value = view
  const now = new Date()
  calendarMonth.value = view === 'WEEK' ? now : new Date(now.getFullYear(), now.getMonth(), 1)
}

function dateForCalendar(day: Date) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric' }).format(day)
}

async function loadTaskStructure(taskId: string) {
  try {
    const fullTask = await service.getTask(taskId)
    taskSubtasks.value = fullTask.subtasks ?? []
    taskParent.value = fullTask.parent_task ?? null
    taskRelations.value = fullTask.relations ?? []
    await loadRelationCandidates(taskId, relationSearch.value)
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar las subtareas y relaciones', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function loadRelationCandidates(taskId: string, search = '') {
  loadingRelationCandidates.value = true
  try {
    relationCandidates.value = await service.getTaskRelationCandidates(taskId, search)
  } catch (error: any) {
    toast.add({ title: 'No se pudieron buscar tareas relacionadas', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    loadingRelationCandidates.value = false
  }
}

async function addSubtask() {
  const parentTaskId = selectedTask.value?.id
  const title = subtaskTitleDraft.value.trim()
  if (!parentTaskId || title.length < 2 || creatingSubtask.value || !hasTaskPermission('tasks.create')) return
  creatingSubtask.value = true
  try {
    await service.createSubtask(parentTaskId, { title, category_id: subtaskCategoryDraft.value === 'NONE' ? null : subtaskCategoryDraft.value })
    subtaskTitleDraft.value = ''
    subtaskCategoryDraft.value = 'NONE'
    taskRelationCreateOpen.value = false
    await Promise.all([loadBoard(), loadTaskStructure(parentTaskId)])
    toast.add({ title: 'Subtarea creada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo crear la subtarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    creatingSubtask.value = false
  }
}

function openTaskRelationModal(mode: 'CREATE' | 'EXISTING') {
  relationModalMode.value = mode
  subtaskTitleDraft.value = ''
  subtaskCategoryDraft.value = 'NONE'
  relationTypeDraft.value = 'NONE'
  relationSearch.value = ''
  relationCandidateId.value = ''
  taskRelationCreateOpen.value = true
}

function taskKey(task: Pick<TaskRecord, 'id' | 'task_number' | 'board'>, fallbackPrefix = '') {
  const prefix = task.board?.task_key_prefix ?? fallbackPrefix
  return task.task_number && prefix ? `${prefix}${task.task_number}` : `#${task.id.slice(0, 8).toUpperCase()}`
}

function taskRelationLabel(relation: TaskRelation) {
  if (relation.relation_type === 'BLOCKS') return relation.direction === 'OUTGOING' ? 'Bloquea' : 'Bloqueada por'
  return relation.relation_type === 'COMPLEMENTS' ? 'Complementa' : 'Relacionada con'
}

async function addTaskRelation() {
  const taskId = selectedTask.value?.id
  const relationType = relationTypeDraft.value
  if (!taskId || !relationCandidateId.value || relationType === 'NONE' || savingTaskRelation.value) return
  savingTaskRelation.value = true
  try {
    await service.createTaskRelation(taskId, relationCandidateId.value, relationType)
    relationCandidateId.value = ''
    taskRelationCreateOpen.value = false
    await loadTaskStructure(taskId)
    toast.add({ title: 'Relación agregada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo relacionar la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    savingTaskRelation.value = false
  }
}

async function removeTaskRelation(relation: TaskRelation) {
  const taskId = selectedTask.value?.id
  if (!taskId || removingTaskRelation.value) return
  removingTaskRelation.value = relation.task.id
  try {
    await service.deleteTaskRelation(taskId, relation.task.id)
    taskRelations.value = taskRelations.value.filter(item => item.task.id !== relation.task.id)
    await loadRelationCandidates(taskId, relationSearch.value)
  } catch (error: any) {
    toast.add({ title: 'No se pudo quitar la relación', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    removingTaskRelation.value = ''
  }
}

async function openRelatedTask(taskId: string) {
  try {
    const task = await service.getTask(taskId)
    if (task.board_id !== boardId.value) {
      await router.push({ query: { ...route.query, board_id: task.board_id, task_id: task.id } })
      return
    }
    openEditTask(task, task.column_id ?? '')
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir la tarea relacionada', description: error?.data?.message ?? error.message, color: 'error' })
  }
}

async function loadChecklists(taskId: string) {
  try { checklists.value = await service.getChecklists(taskId) }
  catch (error: any) { toast.add({ title: 'No se pudieron cargar las checklist', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function loadAttachments(taskId: string) {
  try {
    const taskAttachments = await photosService.findMediaByEntity('task', taskId)
    if (selectedTask.value?.id === taskId) attachments.value = taskAttachments
  }
  catch (error: any) { toast.add({ title: 'No se pudieron cargar los adjuntos', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function createChecklist() {
  const taskId = selectedTask.value?.id
  const title = checklistTitle.value.trim()
  if (!taskId || !title || !canEditTask.value) return
  try {
    checklists.value.push(await service.createChecklist(taskId, title))
    checklistTitle.value = ''
    closeActionPanel()
  } catch (error: any) { toast.add({ title: 'No se pudo crear la checklist', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function addChecklistItem(checklist: TaskChecklist) {
  const content = checklistItemDrafts.value[checklist.id]?.trim()
  if (!content || !canEditTask.value) return
  try {
    checklist.items.push(await service.createChecklistItem(checklist.id, content))
    checklistItemDrafts.value[checklist.id] = ''
  } catch (error: any) { toast.add({ title: 'No se pudo agregar el elemento', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function updateChecklistItem(item: TaskChecklist['items'][number], patch: Record<string, any>) {
  try {
    const saved = await service.updateChecklistItem(item.id, patch)
    Object.assign(item, saved)
  } catch (error: any) { toast.add({ title: 'No se pudo actualizar el elemento', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function deleteChecklist(checklist: TaskChecklist) {
  if (!canEditTask.value) return
  try {
    await service.deleteChecklist(checklist.id)
    checklists.value = checklists.value.filter(item => item.id !== checklist.id)
  } catch (error: any) { toast.add({ title: 'No se pudo eliminar la checklist', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function deleteChecklistItem(checklist: TaskChecklist, itemId: string) {
  if (!canEditTask.value) return
  try {
    await service.deleteChecklistItem(itemId)
    checklist.items = checklist.items.filter(item => item.id !== itemId)
  } catch (error: any) { toast.add({ title: 'No se pudo quitar el elemento', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function convertChecklistItemToTask(checklist: TaskChecklist, item: TaskChecklist['items'][number]) {
  if (!canConvertChecklistItem.value || convertingChecklistItemId.value) return
  convertingChecklistItemId.value = item.id
  try {
    await service.convertChecklistItemToTask(item.id)
    checklist.items = checklist.items.filter(row => row.id !== item.id)
    await Promise.all([loadBoard(), selectedTask.value ? loadTaskStructure(selectedTask.value.id) : Promise.resolve()])
    toast.add({ title: 'Subtarea creada', description: 'El elemento se convirtió en una subtarea de esta tarea.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo convertir el elemento', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    convertingChecklistItemId.value = ''
  }
}

function checklistItemMenuItems(checklist: TaskChecklist, item: TaskChecklist['items'][number]) {
  const actions: Array<Array<Record<string, any>>> = []
  if (canConvertChecklistItem.value) {
    actions.push([{ label: 'Convertir en subtarea', icon: 'i-lucide-list-tree', onSelect: () => void convertChecklistItemToTask(checklist, item) }])
  }
  if (canEditTask.value) {
    actions.push([{ label: 'Eliminar', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => void deleteChecklistItem(checklist, item.id) }])
  }
  return actions.length ? actions : [[{ label: 'Tu rol solo puede consultar este elemento', icon: 'i-lucide-lock-keyhole', disabled: true }]]
}

function onChecklistDueChange(item: TaskChecklist['items'][number], event: Event) {
  const value = (event.target as HTMLInputElement).value
  void updateChecklistItem(item, { due_at: value ? new Date(`${value}T12:00:00`).toISOString() : null })
}

async function saveTaskDescription() {
  if (!selectedTask.value || !canEditTask.value) return
  descriptionSaving.value = true
  try {
    await service.updateTask(selectedTask.value.id, { description: taskForm.description.trim() || null })
    selectedTask.value.description = taskForm.description.trim() || null
    await loadBoard()
    descriptionEditing.value = false
    toast.add({ title: 'Descripción guardada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la descripción', description: error?.data?.message ?? error.message, color: 'error' })
  } finally { descriptionSaving.value = false }
}

function cancelTaskDescription() {
  taskForm.description = selectedTask.value?.description ?? ''
  descriptionEditing.value = false
}

function finishNewTaskDescription() { descriptionEditing.value = false }
function cancelNewTaskDescription() { taskForm.description = ''; descriptionEditing.value = false }

async function uploadTaskAttachment(event: Event) {
  const taskId = selectedTask.value?.id
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!taskId || !file || !canEditTask.value) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Archivo demasiado grande', description: 'El límite para adjuntos es 5 MB.', color: 'error' })
    return
  }
  uploadingAttachment.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    body.append('entity_type', 'task')
    body.append('entity_id', taskId)
    body.append('photo_type', 'attachment')
    await photosService.uploadMedia(body)
    await loadAttachments(taskId)
    toast.add({ title: 'Adjunto agregado', color: 'success' })
  } catch (error: any) { toast.add({ title: 'No se pudo adjuntar el archivo', description: error?.data?.message ?? error.message, color: 'error' }) }
  finally {
    uploadingAttachment.value = false
    if (event.target instanceof HTMLInputElement) event.target.value = ''
  }
}

async function removeAttachment(attachmentId: string) {
  const taskId = selectedTask.value?.id
  if (!taskId) return
  attachmentDeletingId.value = attachmentId
  try {
    await photosService.remove(attachmentId)
    if (selectedTask.value?.id === taskId) {
      attachments.value = attachments.value.filter(item => item.id !== attachmentId)
    }
    toast.add({ title: 'Adjunto quitado', color: 'success' })
  } catch (error: any) {
    // Si otro usuario ya quitó el adjunto, refrescar evita dejarlo visible en el modal.
    try {
      const latestAttachments = await photosService.findMediaByEntity('task', taskId)
      if (selectedTask.value?.id === taskId) attachments.value = latestAttachments
      if (!latestAttachments.some(item => item.id === attachmentId)) {
        toast.add({ title: 'El adjunto ya no estaba asociado', color: 'success' })
        return
      }
    } catch { /* conservar el error original si tampoco se puede refrescar */ }
    toast.add({ title: 'No se pudo quitar el adjunto', description: error?.data?.message ?? error.message, color: 'error' })
  }
  finally { attachmentDeletingId.value = '' }
}

async function loadComments(taskId: string) {
  commentsLoading.value = true
  try {
    comments.value = await service.getComments(taskId)
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar los comentarios', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    commentsLoading.value = false
  }
}

async function addLabel() {
  const name = newLabelName.value.trim()
  addingLabel.value = true
  try {
    const label = await service.createLabel({ ...(name ? { name } : {}), color: newLabelColor.value })
    if (!labels.value.some(item => item.id === label.id)) labels.value.push(label)
    if (!taskForm.label_ids.includes(label.id)) taskForm.label_ids.push(label.id)
    newLabelName.value = ''
    labelCreateModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'No se pudo crear la etiqueta', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    addingLabel.value = false
  }
}

function openTaskLabelEditor(label: TaskLabel) {
  editingLabelId.value = label.id
  editingLabelName.value = label.name ?? ''
  editingLabelColor.value = label.color
  labelEditModalOpen.value = true
}

async function saveTaskLabelEdit() {
  if (!editingLabelId.value) return
  updatingLabel.value = true
  try {
    const updated = await service.updateLabel(editingLabelId.value, { name: editingLabelName.value.trim() || null, color: editingLabelColor.value })
    const index = labels.value.findIndex(label => label.id === updated.id)
    if (index >= 0) labels.value.splice(index, 1, updated)
    labelEditModalOpen.value = false
    editingLabelId.value = ''
    toast.add({ title: 'Etiqueta actualizada', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo actualizar la etiqueta', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    updatingLabel.value = false
  }
}

async function addComment() {
  const taskId = selectedTask.value?.id
  const content = commentDraft.value.trim()
  if (!taskId || !content) return
  commentSaving.value = true
  try {
    await service.createComment(taskId, { content })
    commentDraft.value = ''
    await loadComments(taskId)
  } catch (error: any) {
    toast.add({ title: 'No se pudo publicar el comentario', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    commentSaving.value = false
  }
}

async function saveTask() {
  if (!taskForm.title.trim() || !taskForm.column_id || !boardId.value) return
  saving.value = true
  const payload: SaveTaskInput & { title: string; column_id: string } = {
    title: taskForm.title.trim(),
    description: taskForm.description.trim() || null,
    column_id: taskForm.column_id,
    party_id: selectedBoardParty.value?.id ?? (taskForm.party_id === 'NONE' ? null : taskForm.party_id),
    assigned_to: taskForm.assigned_to === 'NONE' ? null : taskForm.assigned_to,
    start_at: toIso(taskForm.start_at),
    due_at: toIso(taskForm.due_at),
    priority: taskForm.priority,
    category_id: taskForm.category_id === 'NONE' ? null : taskForm.category_id,
    label_ids: taskForm.label_ids,
    members: taskForm.members.filter(member => member.user_id !== taskForm.assigned_to),
  }
  try {
    if (selectedTask.value) await service.updateTask(selectedTask.value.id, payload)
    else await service.createTask(boardId.value, payload)
    toast.add({ title: selectedTask.value ? 'Tarea actualizada' : 'Tarea creada', color: 'success' })
    descriptionEditing.value = false
    closeTaskModal()
    try {
      await loadBoard()
    } catch (refreshError: any) {
      toast.add({ title: 'La tarea se guardó, pero no se actualizó el tablero', description: refreshError?.data?.message ?? refreshError.message, color: 'warning' })
    }
  } catch (error: any) {
    if (selectedTask.value && isWorkLogRequiredError(error)) requestRequiredWorkLog({ type: 'saveTask', taskId: selectedTask.value.id, payload })
    else toast.add({ title: 'No se pudo guardar la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function onDragEnd(event: { item?: HTMLElement; to?: HTMLElement; newIndex?: number }) {
  dragOverColumnId.value = ''
  const taskId = event.item?.dataset.taskId
  const targetColumnId = event.to?.closest<HTMLElement>('[data-task-column]')?.dataset.taskColumn
  if (!taskId || !targetColumnId || !board.value) return

  const targetColumn = board.value.columns.find(column => column.id === targetColumnId)
  const position = targetColumn?.tasks.findIndex(task => task.id === taskId) ?? -1
  if (!targetColumn || position < 0) {
    await loadBoard()
    return
  }

  moving.value = true
  try {
    await service.updateTask(taskId, { column_id: targetColumnId, position })
    await loadBoard()
  } catch (error: any) {
    await loadBoard()
    if (isWorkLogRequiredError(error)) requestRequiredWorkLog({ type: 'moveTask', taskId, columnId: targetColumnId, position })
    else toast.add({ title: 'No se pudo mover la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    moving.value = false
  }
}

async function toggleTaskCompletion(task: TaskRecord) {
  if (!hasTaskPermission('tasks.update') || completionTaskId.value) return
  const completed = !task.completed_at
  completionTaskId.value = task.id
  try {
    const result = await service.setTaskCompletion(task.id, completed)
    const source = board.value?.columns.find(column => column.tasks.some(item => item.id === task.id))
    const destination = board.value?.columns.find(column => column.id === result.column_id)
    const updatedTask = { ...task, completed_at: result.completed_at, position: result.position ?? task.position }
    const openTask = selectedTask.value
    if (openTask?.id === task.id) {
      selectedTask.value = { ...openTask, ...updatedTask }
      taskForm.column_id = result.column_id
    }
    if (source && destination && source.id !== destination.id) {
      source.tasks = source.tasks.filter(item => item.id !== task.id)
      source.total_tasks = Math.max(0, (source.total_tasks ?? source.tasks.length + 1) - 1)
      destination.total_tasks = (destination.total_tasks ?? destination.tasks.length) + 1
      destination.tasks.push(updatedTask)
      destination.tasks.sort((a, b) => a.position - b.position)
      if (destination.tasks.length > 100) {
        destination.tasks = destination.tasks.slice(0, 100)
        destination.limited = true
      }
    } else if (source) {
      const index = source.tasks.findIndex(item => item.id === task.id)
      if (index >= 0) source.tasks[index] = updatedTask
    }
    toast.add({ title: completed ? 'Tarea completada' : 'Tarea reabierta', color: 'success' })
  } catch (error: any) {
    if (isWorkLogRequiredError(error)) requestRequiredWorkLog({ type: 'completeTask', taskId: task.id, completed })
    else toast.add({ title: 'No se pudo actualizar la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    completionTaskId.value = ''
  }
}

function onDragMove(event: { to?: HTMLElement }) {
  const destination = event.to?.closest<HTMLElement>('[data-task-column]')
  dragOverColumnId.value = destination?.dataset.taskColumn ?? ''
  return true
}

function openDeleteTask() {
  showDeleteModal.value = true
}

function closeDeleteModal() { showDeleteModal.value = false }
function closeMoveTasksModal() { showMoveTasksModal.value = false }
function closeMoveColumnModal() { showMoveColumnModal.value = false }

async function deleteTask() {
  if (!selectedTask.value) return
  deleting.value = true
  try {
    await service.deleteTask(selectedTask.value.id)
    toast.add({ title: 'Tarea eliminada', color: 'success' })
    showDeleteModal.value = false
    showTaskModal.value = false
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo eliminar la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  refreshTimerDesktopNotificationPermission()
  boardViewClockTimer = setInterval(() => { boardViewClock.value = Date.now() }, 60_000)
  void load()
})
onBeforeUnmount(() => {
  if (boardViewClockTimer) clearInterval(boardViewClockTimer)
  if (partyFilterSearchTimer) clearTimeout(partyFilterSearchTimer)
  if (taskPartySearchTimer) clearTimeout(taskPartySearchTimer)
  if (taskFilterReloadTimer) clearTimeout(taskFilterReloadTimer)
  if (relationSearchTimer) clearTimeout(relationSearchTimer)
  partyFilterSearchController?.abort()
  taskPartySearchController?.abort()
  clearAttachmentPreview()
})
</script>

<template>
  <UPage :class="boardWorkspaceExpanded ? 'fixed inset-0 z-40 m-0 !block h-screen w-screen min-w-0 max-w-none overflow-y-auto overflow-x-clip bg-default px-2 pb-3 pt-2 sm:px-3' : 'mx-auto !block w-0 min-w-full max-w-full overflow-x-clip px-4 pb-10 sm:px-6'">
    <div class="flex flex-col" :class="boardWorkspaceExpanded ? 'min-h-[calc(100vh-6rem)] gap-3' : 'gap-5'">
    <AppPageHeader :title="boardTitle" description="Organizá el trabajo de la empresa y vinculá tareas con clientes cuando haga falta.">
      <template #links>
        <UButton v-if="board" :icon="boardWorkspaceExpanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" color="neutral" variant="outline" :aria-label="boardWorkspaceExpanded ? 'Salir de la vista expandida' : 'Expandir el tablero'" :title="boardWorkspaceExpanded ? 'Salir de la vista expandida' : 'Expandir el tablero'" @click="toggleWorkspaceExpanded" />
        <UButton v-if="hasTaskPermission('tasks.create')" label="Nuevo tablero" icon="i-lucide-plus" variant="outline" @click="openBoardModal" />
        <UPopover v-if="hasTaskPermission('tasks.update') || (!loading && isOwnerOrAdmin)" :content="{ align: 'end', sideOffset: 8 }">
          <UButton icon="i-lucide-settings-2" color="neutral" variant="outline" aria-label="Configuración de tareas" title="Configuración de tareas" />
          <template #content>
            <div class="flex w-64 flex-col gap-1 p-2">
              <p class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Configuración</p>
              <UButton v-if="hasTaskPermission('tasks.update')" label="Categorías" icon="i-lucide-tags" color="neutral" variant="ghost" class="justify-start" @click="showCategoriesModal = true" />
              <UButton v-if="hasTaskPermission('tasks.update') && board" label="Regla de tiempo del tablero" icon="i-lucide-clock-3" color="neutral" variant="ghost" class="justify-start" @click="openBoardSettings" />
              <UButton v-if="!loading && isOwnerOrAdmin" label="Avisos y WhatsApp" icon="i-lucide-bell" color="neutral" variant="ghost" class="justify-start" @click="openTaskNotificationSettings" />
            </div>
          </template>
        </UPopover>
      </template>
    </AppPageHeader>

    <UPageCard v-if="loading" variant="subtle" class="space-y-4">
      <USkeleton class="h-10 w-64" />
      <div class="grid gap-4 md:grid-cols-4"><USkeleton v-for="i in 4" :key="i" class="h-72" /></div>
    </UPageCard>

    <UPageCard v-if="!loading && !boards.length" variant="subtle" class="flex min-h-80 flex-col items-center justify-center text-center">
      <div class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10"><UIcon name="i-lucide-kanban-square" class="size-7 text-primary" /></div>
      <h2 class="text-lg font-semibold">Creá el primer tablero de esta empresa</h2>
      <p class="mt-1 max-w-md text-sm text-muted">Podés organizar tareas generales y asociar cada una a un cliente sin duplicar su ficha.</p>
      <UButton v-if="hasTaskPermission('tasks.create')" class="mt-5" label="Crear tablero" icon="i-lucide-plus" @click="openBoardModal" />
    </UPageCard>

    <UPageCard v-if="!loading && boards.length && isAllBoardsView" variant="subtle" class="w-full min-w-0 max-w-full space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><h2 class="text-lg font-semibold">Vista integrada</h2><p class="text-sm text-muted">Explorá los tableros de esta empresa y abrí el que quieras revisar.</p></div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_18rem]">
        <UInput v-model="allBoardsSearch" icon="i-lucide-search" placeholder="Buscar tableros…" aria-label="Buscar tableros" class="w-full" />
        <UFormField label="Cliente asociado al tablero"><USelectMenu v-model="allBoardsPartyId" :items="allBoardsPartyOptions" value-key="value" searchable placeholder="Todos los clientes" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
      </div>
      <p class="text-xs text-muted">{{ visibleAllBoards.length }} de {{ boards.length }} tableros</p>
      <div v-if="visibleAllBoards.length" class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button v-for="item in visibleAllBoards" :key="item.id" type="button" class="flex min-w-0 flex-col gap-4 rounded-xl border border-default bg-elevated/20 p-4 text-left transition hover:border-primary/50 hover:bg-elevated/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" @click="openBoardOverviewItem(item)">
          <div class="flex min-w-0 items-start gap-3"><span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-kanban" class="size-5" /></span><div class="min-w-0 flex-1"><h3 class="truncate font-semibold">{{ item.name }}</h3><p class="mt-1 truncate text-sm text-muted">{{ item.party?.name ?? 'Tablero general' }}</p></div><UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-muted" /></div>
          <p v-if="item.description" class="line-clamp-2 min-h-10 text-sm text-muted">{{ item.description }}</p>
          <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-default pt-3 text-xs text-muted"><span class="inline-flex items-center gap-1"><UIcon name="i-lucide-list-checks" class="size-3.5" />{{ item._count?.tasks ?? 0 }} tareas</span><span class="inline-flex items-center gap-1"><UIcon name="i-lucide-columns-3" class="size-3.5" />{{ item._count?.columns ?? 0 }} listas</span><span class="ml-auto rounded border border-default px-1.5 py-0.5 font-mono">{{ item.task_key_prefix }}</span></div>
        </button>
      </div>
      <div v-else class="rounded-lg border border-dashed border-default p-8 text-center text-sm text-muted">No hay tableros que coincidan con estos filtros.</div>
    </UPageCard>

    <UPageCard v-if="!loading && boards.length && !isAllBoardsView" variant="subtle" class="w-full min-w-0 max-w-full space-y-4" :class="boardWorkspaceExpanded ? 'min-h-[calc(100vh-10rem)]' : ''">
        <div class="grid min-w-0 grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_18rem]">
          <div class="min-w-0"><h2 class="truncate text-lg font-semibold">{{ board?.name ?? 'Tablero' }}</h2><p class="text-xs text-muted">{{ board?.task_key_prefix ? `Clave de tareas: ${board.task_key_prefix}1` : 'Espacio de trabajo del tablero' }}</p></div>
          <UFormField label="Clientes" class="w-full min-w-0">
            <USelectMenu v-model="taskFilters.party_ids" :items="clientFilterOptions" value-key="value" multiple searchable v-model:search-term="partyFilterSearch" :loading="partySearchLoading" placeholder="Todos los clientes" class="w-full min-w-0" :ui="selectMenuUi" />
          </UFormField>
        </div>
        <nav class="flex min-w-0 gap-1 overflow-x-auto border-b border-default" aria-label="Vistas del tablero">
          <button v-for="tab in boardTabs" :key="tab.id" type="button" class="inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition" :class="activeBoardTab === tab.id ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-default'" :aria-current="activeBoardTab === tab.id ? 'page' : undefined" @click="activeBoardTab = tab.id"><UIcon :name="tab.icon" class="size-4" />{{ tab.label }}<UBadge v-if="tab.id === 'ATTACHMENTS' && boardAttachments.length" color="neutral" variant="subtle" size="xs">{{ boardAttachments.length }}</UBadge></button>
        </nav>
        <div v-if="activeBoardTab === 'BOARD'" class="flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-wrap items-end gap-3">
          <UButton v-if="taskFilters.party_ids.length === 1" label="Ver ficha del cliente" icon="i-lucide-arrow-up-right" color="neutral" variant="outline" :to="`/erp/sales/customers/${taskFilters.party_ids[0]}`" />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div v-if="boardPeople.length" class="flex items-center -space-x-2" aria-label="Personas con tareas en este tablero">
            <button v-for="person in boardPeople" :key="person.id" type="button" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-primary/15 text-xs font-semibold text-primary transition hover:z-10 hover:scale-105" :class="taskFilters.member_ids.includes(person.id) ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''" :title="`Filtrar tareas de ${person.name}`" :aria-label="`Filtrar tareas de ${person.name}`" :aria-pressed="taskFilters.member_ids.includes(person.id)" @click="toggleBoardMemberFilter(person.id)">{{ person.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase() }}</button>
            <span v-if="boardPeopleExtraCount" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-elevated text-xs font-semibold text-muted" :title="`${boardPeopleExtraCount} personas más`">+{{ boardPeopleExtraCount }}</span>
          </div>
          <UPopover v-model:open="filterOpen" :content="{ align: 'end', sideOffset: 8 }">
            <UButton :label="activeBoardFilterCount ? `Filtrar · ${activeBoardFilterCount}` : 'Filtrar'" icon="i-lucide-list-filter" :color="activeBoardFilterCount ? 'primary' : 'neutral'" variant="outline" />
            <template #content>
              <div class="flex max-h-[min(60vh,42rem)] w-[min(22rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto overscroll-contain p-4">
                <div class="flex items-center justify-between"><h3 class="font-semibold">Filtrar tablero</h3><UButton label="Limpiar" color="neutral" variant="ghost" size="xs" :disabled="!activeBoardFilterCount" @click="resetBoardFilters" /></div>
                <UFormField label="Palabra clave" description="Busca tareas, personas, clientes, categorías y etiquetas."><UInput v-model="taskFilters.search" icon="i-lucide-search" placeholder="Buscar en las tareas…" class="w-full" /></UFormField>
                <UFormField label="Miembros"><USelectMenu v-model="taskFilters.member_ids" :items="boardFilterMemberOptions" value-key="value" multiple searchable placeholder="Todos los miembros" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Etiquetas"><USelectMenu v-model="taskFilters.label_ids" :items="labelOptions" value-key="value" multiple searchable placeholder="Todas las etiquetas" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Categorías"><USelectMenu v-model="taskFilters.category_ids" :items="categoryFilterOptions" value-key="value" multiple searchable placeholder="Todas las categorías" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Estado"><USelectMenu v-model="taskFilters.completion" :items="[{ label: 'Todas', value: 'ALL' }, { label: 'Pendientes', value: 'OPEN' }, { label: 'Completadas', value: 'COMPLETED' }]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Prioridad"><USelectMenu v-model="taskFilters.priority" :items="[{ label: 'Todas', value: 'ALL' }, { label: 'Baja', value: 'LOW' }, { label: 'Normal', value: 'NORMAL' }, { label: 'Alta', value: 'HIGH' }, { label: 'Urgente', value: 'URGENT' }]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Vencimiento"><USelectMenu v-model="taskFilters.due_status" :items="[{ label: 'Cualquier fecha', value: 'ALL' }, { label: 'Sin vencimiento', value: 'NO_DUE' }, { label: 'Vencidas', value: 'OVERDUE' }, { label: 'Vencen hoy', value: 'TODAY' }, { label: 'Vencen mañana', value: 'TOMORROW' }]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
              </div>
            </template>
          </UPopover>
          <UPopover v-model:open="boardViewSettingsOpen" :content="{ align: 'end', sideOffset: 8 }" :ui="{ content: 'overflow-y-auto overscroll-contain' }">
            <UButton icon="i-lucide-sliders-horizontal" color="neutral" variant="outline" aria-label="Configuración de la vista" title="Configuración de la vista" />
            <template #content>
              <div class="flex w-[min(25rem,calc(100vw-2rem))] flex-col gap-5 overflow-y-auto overscroll-contain p-4" :style="{ maxHeight: 'var(--reka-popper-available-height, calc(100dvh - 2rem))' }">
                <div class="flex items-center justify-between"><h3 class="font-semibold">Configuración de la vista</h3><UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" aria-label="Cerrar configuración" @click="boardViewSettingsOpen = false" /></div>
                <UFormField label="Ocultar actividades completadas después de">
                  <USelectMenu v-model="boardViewSettings.hideCompletedAfter" :items="[{ label: 'Nunca', value: 'NEVER' }, { label: 'Inmediatamente', value: 'IMMEDIATELY' }, { label: '1 día', value: 'DAY' }, { label: '1 semana', value: 'WEEK' }, { label: '1 mes', value: 'MONTH' }]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" @update:model-value="persistBoardViewSettings" />
                </UFormField>
                <label class="flex items-center justify-between gap-3 text-sm"><span>Ocultar listas finalizadas</span><USwitch :model-value="hideCompletedColumns" aria-label="Ocultar listas finalizadas" @update:model-value="persistHideCompletedColumns" /></label>
                <div class="flex flex-col gap-2">
                  <div><p class="text-sm font-semibold">Tamaño de la columna</p><p class="text-xs text-muted">Elegí si las columnas mantienen un ancho fijo o se adaptan al espacio disponible.</p></div>
                  <div class="grid grid-cols-2 gap-2 rounded-lg border border-default p-1">
                    <button type="button" class="flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-sm transition" :class="boardViewSettings.columnWidth === 'FIXED' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted hover:bg-elevated'" :aria-pressed="boardViewSettings.columnWidth === 'FIXED'" @click="setBoardViewSetting('columnWidth', 'FIXED')"><UIcon name="i-lucide-columns-3" class="size-5" />Fijo</button>
                    <button type="button" class="flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-sm transition" :class="boardViewSettings.columnWidth === 'FLEXIBLE' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted hover:bg-elevated'" :aria-pressed="boardViewSettings.columnWidth === 'FLEXIBLE'" @click="setBoardViewSetting('columnWidth', 'FLEXIBLE')"><UIcon name="i-lucide-panel-top" class="size-5" />Flexible</button>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <div><p class="text-sm font-semibold">Desplazamiento</p><p class="text-xs text-muted">Elegí si desplazarte por columnas individuales o por todo el tablero.</p></div>
                  <div class="grid grid-cols-2 gap-1 rounded-lg border border-default p-1">
                    <button type="button" class="rounded-md border px-2 py-2 text-sm transition" :class="boardViewSettings.scrollMode === 'COLUMNS' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted hover:bg-elevated'" :aria-pressed="boardViewSettings.scrollMode === 'COLUMNS'" @click="setBoardViewSetting('scrollMode', 'COLUMNS')">Por columnas</button>
                    <button type="button" class="rounded-md border px-2 py-2 text-sm transition" :class="boardViewSettings.scrollMode === 'BOARD' ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted hover:bg-elevated'" :aria-pressed="boardViewSettings.scrollMode === 'BOARD'" @click="setBoardViewSetting('scrollMode', 'BOARD')">Por todo el tablero</button>
                  </div>
                </div>
              </div>
            </template>
          </UPopover>
          <UButton v-if="hasTaskPermission('tasks.create')" label="Nueva tarea" icon="i-lucide-plus" :disabled="!board" @click="board?.columns[0] && openNewTask(board.columns[0])" />
        </div>
      </div>

      <template v-if="activeBoardTab === 'BOARD'">

      <UAlert v-if="taskFilters.party_ids.length" color="info" variant="subtle" icon="i-lucide-building-2" title="Clientes filtrados" description="El tablero muestra tareas asociadas a los clientes seleccionados. Quitá la selección para volver a ver todas." />
      <UAlert v-if="activeBoardFilterCount" color="info" variant="subtle" icon="i-lucide-list-filter" title="Filtros activos" description="El arrastre de tareas se pausa mientras ves resultados filtrados. Limpiá los filtros para volver a moverlas entre listas." />
      <UAlert v-if="moving" color="neutral" variant="subtle" icon="i-lucide-loader-circle" title="Guardando el nuevo estado…" />

      <div v-if="board" class="pb-2" :class="boardViewSettings.scrollMode === 'COLUMNS' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-auto'" :style="boardViewSettings.scrollMode === 'COLUMNS' ? { height: 'calc(100vh - 18rem)' } : undefined">
        <div class="grid gap-3" :class="[boardViewSettings.scrollMode === 'COLUMNS' ? 'h-full items-stretch' : 'items-start', boardViewSettings.columnWidth === 'FIXED' ? 'w-max min-w-max' : 'w-full min-w-full']" :style="{ gridTemplateColumns: boardGridTemplateColumns }">
          <section v-for="column in visibleBoardColumns" :key="column.id" :data-task-column="column.id" class="flex flex-col rounded-xl border border-default bg-elevated/25 transition-[background-color,border-color,box-shadow] duration-200" :class="[dragOverColumnId === column.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : '', isColumnCollapsed(column) ? 'h-full w-12 min-w-12 items-center' : boardViewSettings.scrollMode === 'COLUMNS' ? 'h-full min-h-0' : 'h-fit', !isColumnCollapsed(column) && boardViewSettings.columnWidth === 'FIXED' ? 'w-[340px] min-w-[340px]' : '', !isColumnCollapsed(column) && boardViewSettings.columnWidth === 'FLEXIBLE' ? 'w-full min-w-[275px]' : '']">
            <template v-if="isColumnCollapsed(column)">
              <div class="flex h-full flex-col items-center gap-3 py-3">
                <span class="[writing-mode:vertical-rl] rotate-180 truncate text-sm font-semibold" :title="column.name">{{ column.name }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">{{ column.total_tasks ?? column.tasks.length }}</UBadge>
                <UButton class="mt-auto" icon="i-lucide-arrow-left-right" color="neutral" variant="outline" size="sm" :aria-label="`Expandir ${column.name}`" :title="`Expandir ${column.name}`" @click="toggleColumnCollapsed(column)" />
              </div>
            </template>
            <template v-else>
            <header class="flex items-center justify-between gap-2 border-b border-default px-3 py-3">
              <div class="flex min-w-0 items-center gap-2"><span class="size-2.5 shrink-0 rounded-full" :class="column.is_closed ? 'bg-success' : column.color === 'warning' ? 'bg-warning' : column.color === 'info' ? 'bg-info' : 'bg-neutral-400'"/><h2 class="truncate font-semibold">{{ column.name }}</h2><UBadge color="neutral" variant="subtle">{{ column.total_tasks ?? column.tasks.length }}</UBadge><UIcon v-if="column.is_pinned" name="i-lucide-pin" class="size-3.5 text-primary"/><UIcon v-if="column.is_watching" name="i-lucide-eye" class="size-3.5 text-primary"/></div>
              <div class="flex shrink-0 items-center gap-1">
                <UButton icon="i-lucide-arrow-left-right" color="neutral" variant="ghost" size="sm" :aria-label="`Contraer ${column.name}`" :title="`Contraer ${column.name}`" @click="toggleColumnCollapsed(column)" />
                <UDropdownMenu :items="columnMenuItems(column)" :content="{ align: 'end' }">
                  <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="sm" :aria-label="`Acciones de ${column.name}`" title="Acciones de la lista" />
                </UDropdownMenu>
              </div>
            </header>
            <VueDraggable v-model="column.tasks" group="company-tasks" item-key="id" :disabled="activeBoardFilterCount > 0 || !hasTaskPermission('tasks.update') || moving" :animation="240" :delay="150" :fallback-tolerance="4" :touch-start-threshold="5" :force-fallback="true" :fallback-on-body="true" :swap-threshold="0.65" filter=".task-completion" :prevent-on-filter="false" class="flex min-h-12 flex-col gap-2 p-2" :class="boardViewSettings.scrollMode === 'COLUMNS' ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : ''" ghost-class="task-card-ghost" chosen-class="task-card-chosen" drag-class="task-card-drag" fallback-class="task-card-fallback" @move="onDragMove" @end="onDragEnd">
              <article v-for="task in column.tasks" v-show="!shouldHideCompletedTask(task)" :key="task.id" :data-task-id="task.id" class="task-card group relative w-full rounded-lg border border-default bg-default p-3 text-left shadow-sm" role="button" tabindex="0" @click="openEditTask(task, column.id)" @keydown.enter.self.prevent="openEditTask(task, column.id)" @keydown.space.self.prevent="openEditTask(task, column.id)">
                <div class="task-completion-slot absolute left-3 top-3 z-10 flex size-5 items-center justify-center">
                    <button v-if="hasTaskPermission('tasks.update')" type="button" class="task-completion flex size-5 shrink-0 scale-75 items-center justify-center rounded-full border border-muted text-transparent opacity-0 transition-[opacity,transform,color,background-color,border-color] duration-200 ease-out hover:border-success hover:bg-success hover:text-white group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :class="task.completed_at ? 'task-completion-done scale-100 border-success bg-success text-white opacity-100' : ''" :aria-label="task.completed_at ? `Reabrir ${task.title}` : `Marcar ${task.title} como completada`" :title="task.completed_at ? 'Reabrir tarea' : 'Marcar tarea como completada'" :aria-pressed="!!task.completed_at" :disabled="completionTaskId === task.id" @click.stop="toggleTaskCompletion(task)">
                      <UIcon v-if="task.completed_at || completionTaskId === task.id" :name="completionTaskId === task.id ? 'i-lucide-loader-circle' : 'i-lucide-check'" class="size-3" :class="completionTaskId === task.id ? 'animate-spin text-muted' : ''" />
                      <UIcon v-else name="i-lucide-check" class="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100" />
                    </button>
                    <span v-else class="flex size-5 shrink-0 items-center justify-center rounded-full border" :class="task.completed_at ? 'border-success bg-success text-white' : 'border-muted text-transparent'" :aria-label="task.completed_at ? 'Completada' : 'Pendiente'"><UIcon v-if="task.completed_at" name="i-lucide-check" class="size-3" /></span>
                </div>
                <div class="min-w-0">
                <div class="task-card-heading flex items-start justify-between gap-2" :class="task.completed_at ? 'task-card-heading-completed' : hasTaskPermission('tasks.update') ? 'task-card-heading-interactive' : ''"><div class="flex min-w-0 flex-1 items-start gap-2"><span class="mt-0.5 shrink-0 rounded border border-default px-1.5 py-0.5 font-mono text-[10px] leading-tight text-muted">{{ taskKey(task, board?.task_key_prefix ?? '') }}</span><p class="task-card-title min-w-0 flex-1 font-medium leading-snug" :class="task.completed_at ? 'text-muted line-through' : ''">{{ task.title }}</p></div><UBadge class="shrink-0" :color="task.completed_at ? 'success' : priorityColor(task.priority)" variant="subtle" size="xs">{{ task.completed_at ? 'Completada' : priorityLabel(task.priority) }}</UBadge></div>
                <p v-if="task.description" class="mt-2 line-clamp-2 text-xs text-muted">{{ descriptionPreview(task.description) }}</p>
                <div v-if="task.category" class="mt-2"><UBadge :color="categoryColor(task.category.color)" variant="subtle" size="xs">{{ task.category.name }}</UBadge></div>
                <div v-if="task.labels?.length" class="mt-2 flex flex-wrap gap-1.5"><span v-for="label in task.labels" :key="label.id" class="inline-flex min-h-6 min-w-8 max-w-36 items-center justify-center truncate rounded px-2 py-1 text-[11px] font-semibold" :style="labelChipStyle(label.color)" :title="label.name ?? `${labelColorName(label.color)} · solo color`" :aria-label="label.name ?? `${labelColorName(label.color)} · etiqueta sin nombre`"><template v-if="label.name">{{ label.name }}</template><span v-else class="sr-only">{{ labelColorName(label.color) }}</span></span></div>
                <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span v-if="task.party" class="inline-flex min-w-0 items-center gap-1"><UIcon name="i-lucide-building-2" class="size-3.5 shrink-0"/><span class="max-w-36 truncate">{{ task.party.name }}</span></span>
                  <span v-if="task.assignee" class="inline-flex min-w-0 items-center gap-1"><UIcon name="i-lucide-user-round" class="size-3.5 shrink-0"/><span class="max-w-28 truncate">{{ task.assignee.name }}</span></span>
                  <span v-for="member in task.members?.slice(0, 2)" :key="member.user_id" class="inline-flex min-w-0 items-center gap-1" :title="`${member.name} · ${taskMemberRoleLabel(member.role)}`"><UIcon name="i-lucide-users-round" class="size-3.5 shrink-0"/><span class="max-w-24 truncate">{{ member.name }}</span></span>
                  <span v-if="(task.members?.length ?? 0) > 2" class="text-muted">+{{ (task.members?.length ?? 0) - 2 }}</span>
                  <span v-if="task.due_at" class="inline-flex items-center gap-1" :class="isOverdue(task) ? 'text-error' : ''"><UIcon name="i-lucide-calendar-clock" class="size-3.5"/>{{ formatDueDate(task.due_at) }}</span>
                  <span v-if="task.checklist_count" class="inline-flex items-center gap-1"><UIcon name="i-lucide-list-checks" class="size-3.5"/>{{ task.checklist_count }}</span>
                  <span v-if="task.subtasks_count" class="inline-flex items-center gap-1" :title="`${task.subtasks_count} subtareas`"><UIcon name="i-lucide-list-tree" class="size-3.5"/>{{ task.subtasks_count }}</span>
                  <span v-if="task.comments_count" class="inline-flex items-center gap-1"><UIcon name="i-lucide-message-circle" class="size-3.5"/>{{ task.comments_count }}</span>
                </div>
                </div>
              </article>
              <div v-if="!column.tasks.some(task => !shouldHideCompletedTask(task))" class="flex items-center justify-center rounded-lg border border-dashed border-default px-3 py-8 text-center text-xs text-muted">{{ column.tasks.length ? 'Las tareas completadas están ocultas por la configuración de la vista.' : activeBoardFilterCount ? 'No hay tareas que coincidan con estos filtros.' : 'Soltá una tarea acá o creá una nueva.' }}</div>
            </VueDraggable>
              <form v-if="quickAddColumnId === column.id" class="mx-2 mb-2 space-y-2 rounded-lg bg-elevated p-2" @submit.prevent="saveQuickTask(column)">
              <UInput v-model="quickTaskTitle" autofocus maxlength="200" placeholder="Introduce un título para la tarjeta…" class="w-full" />
              <div class="flex items-center gap-2"><UButton type="submit" label="Añadir tarjeta" size="sm" :loading="saving" :disabled="quickTaskTitle.trim().length < 2"/><UButton type="button" icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Cancelar" @click="cancelQuickAdd"/></div>
            </form>
              <div v-else-if="hasTaskPermission('tasks.create')" class="flex items-center justify-between px-2 pb-2">
                <UButton label="Añade una tarjeta" icon="i-lucide-plus" color="neutral" variant="ghost" class="justify-start" @click="startQuickAdd(column)" />
                <UButton icon="i-lucide-square-plus" color="neutral" variant="ghost" :aria-label="`Crear tarea con detalles en ${column.name}`" title="Crear tarea con detalles" @click="openNewTask(column)" />
              </div>
            <p v-if="column.limited" class="px-3 pb-3 text-xs text-muted">Se muestran las primeras 100 tareas de esta columna.</p>
            </template>
          </section>
        <section v-if="hasTaskPermission('tasks.create')" class="flex min-h-20 flex-col rounded-xl border border-dashed border-default bg-elevated/20 p-2" :class="[boardViewSettings.scrollMode === 'COLUMNS' ? 'h-full min-h-0' : 'self-start', boardViewSettings.columnWidth === 'FIXED' ? 'w-[340px] min-w-[340px]' : 'w-full min-w-[275px]']">
          <form v-if="showNewColumnForm" class="space-y-2" @submit.prevent="addColumn">
            <UInput v-model="newColumnName" autofocus maxlength="80" placeholder="Introduce el nombre de la lista…" class="w-full" />
            <div class="flex items-center gap-2"><UButton type="submit" label="Añadir lista" size="sm" :loading="creatingColumn" :disabled="!newColumnName.trim()"/><UButton type="button" icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Cancelar" @click="cancelNewColumn"/></div>
          </form>
          <UButton v-else label="Añade otra lista" icon="i-lucide-plus" color="neutral" variant="ghost" class="justify-start" @click="openNewColumnForm" />
        </section>
        </div>
      </div>
      </template>
      <section v-else-if="activeBoardTab === 'SUMMARY'" class="flex min-w-0 flex-col gap-3">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <div class="flex items-center -space-x-2" aria-label="Filtrar resumen por persona">
            <button type="button" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-elevated text-muted transition hover:z-10 hover:scale-105" :class="taskFilters.member_ids.includes('NONE') ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''" title="Filtrar tareas sin miembros" aria-label="Filtrar tareas sin miembros" :aria-pressed="taskFilters.member_ids.includes('NONE')" @click="toggleBoardMemberFilter('NONE')"><UIcon name="i-lucide-user-round" class="size-4" /></button>
            <button v-for="person in summaryPeople" :key="person.id" type="button" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-primary/15 text-xs font-semibold text-primary transition hover:z-10 hover:scale-105" :class="taskFilters.member_ids.includes(person.id) ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''" :title="`Filtrar tareas de ${person.name}`" :aria-label="`Filtrar tareas de ${person.name}`" :aria-pressed="taskFilters.member_ids.includes(person.id)" @click="toggleBoardMemberFilter(person.id)">{{ person.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase() }}</button>
            <span v-if="summaryPeopleExtraCount" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-elevated text-xs font-semibold text-muted" :title="`${summaryPeopleExtraCount} personas más`">+{{ summaryPeopleExtraCount }}</span>
          </div>
          <UPopover v-model:open="filterOpen" :content="{ align: 'start', sideOffset: 8 }">
            <UButton :label="activeBoardFilterCount ? `Filtro · ${activeBoardFilterCount}` : 'Filtro'" icon="i-lucide-list-filter" :color="activeBoardFilterCount ? 'primary' : 'neutral'" variant="outline" />
            <template #content>
              <div class="flex max-h-[min(60vh,42rem)] w-[min(22rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto overscroll-contain p-4">
                <div class="flex items-center justify-between"><h3 class="font-semibold">Filtrar resumen</h3><UButton label="Limpiar" color="neutral" variant="ghost" size="xs" :disabled="!activeBoardFilterCount" @click="resetBoardFilters" /></div>
                <UFormField label="Palabra clave" description="Busca tareas, personas, clientes, categorías y etiquetas."><UInput v-model="taskFilters.search" icon="i-lucide-search" placeholder="Buscar en las tareas…" class="w-full" /></UFormField>
                <UFormField label="Persona asignada"><USelectMenu v-model="taskFilters.member_ids" :items="boardFilterMemberOptions" value-key="value" multiple searchable placeholder="Todas las personas" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Etiquetas"><USelectMenu v-model="taskFilters.label_ids" :items="labelOptions" value-key="value" multiple searchable placeholder="Todas las etiquetas" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Categorías"><USelectMenu v-model="taskFilters.category_ids" :items="categoryFilterOptions" value-key="value" multiple searchable placeholder="Todas las categorías" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Estado"><USelectMenu v-model="taskFilters.completion" :items="[{ label: 'Todos los estados', value: 'ALL' }, { label: 'Pendientes', value: 'OPEN' }, { label: 'Completadas', value: 'COMPLETED' } ]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Prioridad"><USelectMenu v-model="taskFilters.priority" :items="[{ label: 'Todas', value: 'ALL' }, { label: 'Baja', value: 'LOW' }, { label: 'Normal', value: 'NORMAL' }, { label: 'Alta', value: 'HIGH' }, { label: 'Urgente', value: 'URGENT' }]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
                <UFormField label="Vencimiento"><USelectMenu v-model="taskFilters.due_status" :items="[{ label: 'Cualquier fecha', value: 'ALL' }, { label: 'Sin vencimiento', value: 'NO_DUE' }, { label: 'Vencidas', value: 'OVERDUE' }, { label: 'Vencen hoy', value: 'TODAY' }, { label: 'Vencen mañana', value: 'TOMORROW' }]" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
              </div>
            </template>
          </UPopover>
        </div>
        <div class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UPageCard v-for="metric in boardSummaryMetrics" :key="metric.label" variant="subtle" class="bg-elevated/30"><div class="flex items-center gap-3"><span class="flex size-11 items-center justify-center rounded-xl bg-muted/50"><UIcon :name="metric.icon" class="size-5 text-primary"/></span><div><p class="text-2xl font-semibold">{{ metric.value }}</p><p class="text-sm font-medium">{{ metric.label }}</p><p class="text-xs text-muted">{{ metric.detail }}</p></div></div></UPageCard>
        <UPageCard variant="subtle" class="min-w-0 min-h-[22rem] sm:col-span-2"><h3 class="font-semibold">Resumen de estado</h3><p class="text-sm text-muted">Distribución de las tareas por lista.</p><div class="mt-5 flex min-h-64 flex-wrap items-center justify-center gap-8 lg:justify-around"><div class="relative size-56 shrink-0 rounded-full p-8" :style="boardStatusChartStyle"><div class="flex size-full flex-col items-center justify-center rounded-full bg-default text-center"><span class="text-4xl font-semibold">{{ boardSummary.total }}</span><span class="max-w-28 text-sm font-medium text-muted">Tareas en el tablero</span></div></div><div class="flex min-w-40 flex-col gap-3"> <div v-for="(status, index) in boardStatusSummary" :key="status.id" class="flex items-center gap-2 text-sm"><span class="size-3 shrink-0 rounded-sm" :style="{ backgroundColor: boardStatusColors[index % boardStatusColors.length] }"/><span class="min-w-0 flex-1 truncate">{{ status.name }}</span><span class="text-muted">{{ status.count }}</span></div><p v-if="!boardStatusSummary.length" class="text-sm text-muted">Este tablero todavía no tiene listas.</p></div></div></UPageCard>
        <UPageCard variant="subtle" class="min-w-0 min-h-[22rem] sm:col-span-2"><div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold">Actividad reciente</h3><p class="text-sm text-muted">Avisos de tareas de este tablero que te involucran.</p></div><UIcon name="i-lucide-activity" class="size-5 shrink-0 text-muted"/></div><div v-if="summaryActivityLoading" class="mt-4 flex flex-col gap-3"><USkeleton v-for="item in 3" :key="item" class="h-14 w-full"/></div><div v-else-if="recentBoardActivities.length" class="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto pr-1"><button v-for="activity in recentBoardActivities" :key="activity.id" type="button" class="flex min-w-0 items-start gap-3 rounded-lg p-2 text-left transition hover:bg-elevated/60" @click="activity.target_path && router.push(activity.target_path)"><span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{{ (activity.actor?.name ?? 'Sistema').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase() }}</span><span class="min-w-0 flex-1"><span class="block text-sm"><strong>{{ activity.actor?.name ?? 'Sistema' }}</strong> {{ activity.title.toLocaleLowerCase('es') }}</span><span class="block truncate text-sm text-primary">{{ activity.message }}</span><span class="mt-1 block text-xs text-muted">{{ formatCommentDate(activity.created_at) }}</span></span><UIcon name="i-lucide-arrow-up-right" class="mt-1 size-4 shrink-0 text-muted"/></button></div><div v-else class="flex min-h-56 flex-col items-center justify-center text-center"><UIcon name="i-lucide-message-square-text" class="size-9 text-muted"/><p class="mt-3 font-medium">Aún no hay actividad reciente</p><p class="mt-1 text-sm text-muted">Los avisos relacionados con tareas del tablero aparecerán acá.</p></div></UPageCard>
        <UPageCard variant="subtle" class="min-w-0 min-h-[22rem] sm:col-span-2"><h3 class="font-semibold">Desglose de prioridad</h3><p class="text-sm text-muted">Distribución de la prioridad de las tareas visibles.</p><div class="mt-5 flex h-56 items-end justify-around gap-3 border-b border-default px-2 pb-2"><div v-for="item in boardPrioritySummary" :key="item.value" class="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2"><span class="text-sm text-muted">{{ item.count }}</span><span class="flex w-full max-w-16 items-end justify-center rounded-t bg-muted/50" :style="{ height: '72%' }"><span class="w-full rounded-t bg-primary/60" :style="{ height: `${item.percent}%` }"/></span><div class="flex items-center gap-1 text-xs text-muted"><UIcon :name="item.icon" class="size-3.5" :class="item.value === 'URGENT' ? 'text-error' : item.value === 'HIGH' ? 'text-warning' : item.value === 'LOW' ? 'text-info' : 'text-muted'"/><span>{{ item.label }}</span></div></div></div></UPageCard>
        <UPageCard variant="subtle" class="min-w-0 min-h-[22rem] sm:col-span-2"><h3 class="font-semibold">Tipos de trabajo</h3><p class="text-sm text-muted">Tareas agrupadas por categoría.</p><div v-if="boardCategorySummary.length" class="mt-5 flex max-h-64 flex-col gap-4 overflow-y-auto pr-1"><div v-for="category in boardCategorySummary" :key="category.name" class="grid grid-cols-[minmax(6rem,0.8fr)_minmax(0,2fr)_2.5rem] items-center gap-3 text-sm"><span class="truncate">{{ category.name }}</span><span class="h-4 overflow-hidden rounded bg-muted/50"><span class="block h-full bg-primary/60" :style="{ width: `${category.percent}%` }"/></span><span class="text-right text-muted">{{ category.count }}</span></div></div><p v-else class="mt-8 text-center text-sm text-muted">Todavía no hay categorías para mostrar.</p></UPageCard>
        <UPageCard variant="subtle" class="min-w-0 min-h-[22rem] sm:col-span-2"><h3 class="font-semibold">Carga de trabajo del equipo</h3><p class="text-sm text-muted">Distribución de las tareas por responsable.</p><div v-if="boardAssigneeSummary.length" class="mt-5 flex max-h-64 flex-col gap-4 overflow-y-auto pr-1"><div v-for="person in boardAssigneeSummary" :key="person.name" class="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,2fr)_2.5rem] items-center gap-3 text-sm"><span class="truncate">{{ person.name }}</span><span class="h-4 overflow-hidden rounded bg-muted/50"><span class="block h-full bg-primary/60" :style="{ width: `${person.percent}%` }"/></span><span class="text-right text-muted">{{ person.count }}</span></div></div><p v-else class="mt-8 text-center text-sm text-muted">No hay tareas para distribuir.</p></UPageCard>
        <UPageCard variant="subtle" class="flex min-w-0 min-h-[22rem] flex-col sm:col-span-2"><h3 class="font-semibold">Tableros relacionados</h3><p class="text-sm text-muted">Cambiá de espacio para revisar el trabajo relacionado de la empresa.</p><div v-if="relatedTaskBoards.length" class="mt-4 flex flex-col gap-2"><button v-for="item in relatedTaskBoards" :key="item.id" type="button" class="flex items-center gap-3 rounded-lg border border-default p-3 text-left transition hover:bg-elevated/50" @click="router.push({ path: '/erp/tasks', query: { board_id: item.id } })"><span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-kanban" class="size-5"/></span><span class="min-w-0 flex-1"><span class="block truncate font-medium">{{ item.name }}</span><span class="block truncate text-xs text-muted">{{ item.party?.name ?? 'Tablero general' }}</span></span><UIcon name="i-lucide-arrow-up-right" class="size-4 text-muted"/></button></div><div v-else class="flex flex-1 flex-col items-center justify-center text-center"><UIcon name="i-lucide-waypoints" class="size-10 text-muted"/><p class="mt-3 font-medium">No hay otros tableros</p><UButton v-if="hasTaskPermission('tasks.create')" class="mt-3" label="Crear tablero" icon="i-lucide-plus" color="neutral" variant="outline" @click="openBoardModal"/></div></UPageCard>
        </div>
      </section>
      <section v-else-if="activeBoardTab === 'LIST'" class="min-w-0 overflow-x-auto">
        <div class="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <UInput v-model="boardListSearch" icon="i-lucide-search" placeholder="Buscar actividad…" class="w-full max-w-sm" aria-label="Buscar en todas las tareas de la lista" clearable />
          <UDropdownMenu :items="boardListMenuItems" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis" color="neutral" variant="outline" aria-label="Más opciones de la lista" title="Más opciones" />
          </UDropdownMenu>
        </div>
        <AsteriskTable :storage-key="`tasks-board-${boardId}-list`" :data="visibleBoardListRows" :columns="boardTaskColumns" :filter-fields="[]" :sort-fields="boardTaskSortFields" :get-row-id="(row: BoardTaskRow) => row.id" :on-row-click="openBoardTask" :table-min-width="1100" />
      </section>
      <section v-else-if="activeBoardTab === 'TIMELINE'" class="flex min-w-0 max-w-full flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2"><UInput v-model="timelineSearch" icon="i-lucide-search" placeholder="Buscar en el cronograma…" class="w-full sm:w-56"/><div class="flex items-center -space-x-2"><button v-for="person in boardPeople" :key="person.id" type="button" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-primary/15 text-xs font-semibold text-primary" :class="timelineMemberId === person.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''" :title="`Filtrar ${person.name}`" @click="timelineMemberId = timelineMemberId === person.id ? 'ALL' : person.id">{{ person.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase() }}</button></div><USelectMenu v-model="timelineMemberId" :items="[{ label: 'Todas las personas', value: 'ALL' }, { label: 'Sin asignar', value: 'NONE' }, ...members.map(member => ({ label: member.name, value: member.id }))]" value-key="value" class="w-48" :ui="selectMenuUi" aria-label="Filtrar por persona"/></div>
          <div class="flex min-w-0 max-w-full flex-wrap items-center gap-1 rounded-lg border border-default p-1"><UButton label="Hoy" color="neutral" variant="ghost" size="sm" @click="setTimelineToday"/><UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" size="sm" aria-label="Período anterior" @click="shiftTimeline(-1)"/><span class="min-w-36 px-2 text-center text-sm font-medium capitalize">{{ timelinePeriods[0]?.label }} – {{ timelinePeriods[timelinePeriods.length - 1]?.label }}</span><UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" size="sm" aria-label="Período siguiente" @click="shiftTimeline(1)"/><USelectMenu v-model="timelineScale" :items="[{ label: 'Semanas', value: 'WEEK' }, { label: 'Meses', value: 'MONTH' }, { label: 'Trimestres', value: 'QUARTER' }]" value-key="value" class="w-32" :ui="selectMenuUi" aria-label="Escala del cronograma"/></div>
        </div>
        <div class="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-default">
          <div class="min-w-[1250px]">
            <div class="grid grid-cols-[minmax(18rem,2fr)_9rem_12rem_minmax(42rem,4fr)] border-b border-default bg-elevated/60 text-xs font-semibold text-muted">
              <div class="px-3 py-3">Actividad</div><div class="border-l border-default px-3 py-3">Estado</div><div class="border-l border-default px-3 py-3">Persona asignada</div>
              <div class="relative h-10 border-l border-default"> <div v-for="period in timelinePeriods" :key="period.label" class="absolute inset-y-0 flex items-center justify-center overflow-hidden border-l border-default px-1 capitalize" :style="{ left: `${period.left}%`, width: `${period.width}%` }">{{ period.label }}</div></div>
            </div>
            <div v-for="row in timelineVisibleRows" :key="row.id" class="grid min-h-12 grid-cols-[minmax(18rem,2fr)_9rem_12rem_minmax(42rem,4fr)] border-b border-default/70 text-sm last:border-b-0 hover:bg-elevated/30">
              <button type="button" class="flex min-w-0 items-center gap-2 px-3 text-left" @click="openBoardTask(row)"><span class="shrink-0 rounded border border-default px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ row.key }}</span><span class="truncate" :class="row.task.completed_at ? 'text-muted line-through' : ''">{{ row.title }}</span></button>
              <div class="flex items-center border-l border-default px-2"><UBadge :color="row.task.completed_at || board?.columns.find(column => column.id === row.columnId)?.is_closed ? 'success' : 'neutral'" variant="subtle" size="xs" class="max-w-full truncate">{{ row.list }}</UBadge></div>
              <div class="flex min-w-0 items-center gap-2 border-l border-default px-2"><span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{{ row.assignee === 'Sin asignar' ? '○' : row.assignee.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase() }}</span><span class="truncate">{{ row.assignee }}</span></div>
              <div class="relative min-h-12 border-l border-default">
                <span v-for="period in timelinePeriods" :key="period.label" class="pointer-events-none absolute inset-y-0 border-l border-default/70" :style="{ left: `${period.left}%` }" />
                <div v-if="timelineTodayPosition !== null" class="absolute inset-y-0 z-10 w-px bg-primary" :style="{ left: `${timelineTodayPosition}%` }"><span class="absolute -top-1 -left-1.5 size-3 rotate-45 bg-primary" /></div>
                <button v-if="row.task.start_at || row.task.due_at" type="button" class="absolute top-1/2 z-20 h-7 -translate-y-1/2 truncate rounded-md border border-success/40 bg-success/25 px-2 text-left text-xs font-medium text-success transition hover:brightness-110" :style="timelineBarStyle(row)" :title="`${row.title} · ${formatDueDate(row.task.start_at)} — ${formatDueDate(row.task.due_at)}`" @click="openBoardTask(row)">{{ row.title }}</button>
              </div>
            </div>
            <p v-if="!timelineVisibleRows.length" class="p-8 text-center text-sm text-muted">No hay tareas que coincidan con esta búsqueda.</p>
          </div>
        </div>
      </section>
      <section v-else-if="activeBoardTab === 'CALENDAR'" class="flex min-w-0 max-w-full flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2"><UInput v-model="calendarSearch" icon="i-lucide-search" placeholder="Buscar en el calendario…" class="w-full sm:w-56"/><div class="flex items-center -space-x-2"><button v-for="person in boardPeople" :key="person.id" type="button" class="flex size-8 items-center justify-center rounded-full border-2 border-default bg-primary/15 text-xs font-semibold text-primary" :class="calendarMemberId === person.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''" :title="`Filtrar ${person.name}`" @click="calendarMemberId = calendarMemberId === person.id ? 'ALL' : person.id">{{ person.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase() }}</button></div><USelectMenu v-model="calendarMemberId" :items="[{ label: 'Todas las personas', value: 'ALL' }, { label: 'Sin asignar', value: 'NONE' }, ...members.map(member => ({ label: member.name, value: member.id }))]" value-key="value" class="w-48" :ui="selectMenuUi" aria-label="Filtrar por persona"/></div>
          <div class="flex items-center gap-1 rounded-lg border border-default p-1"><UButton label="Hoy" color="neutral" variant="ghost" size="sm" @click="setCalendarToday"/><UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" size="sm" aria-label="Período anterior" @click="shiftCalendarMonth(-1)"/><span class="min-w-28 px-2 text-center text-sm font-medium capitalize">{{ calendarHeading }}</span><UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" size="sm" aria-label="Período siguiente" @click="shiftCalendarMonth(1)"/><USelectMenu :model-value="calendarView" :items="[{ label: 'Mes', value: 'MONTH' }, { label: 'Semana', value: 'WEEK' }]" value-key="value" class="w-28" :ui="selectMenuUi" aria-label="Período del calendario" @update:model-value="calendarChangeView"/></div>
        </div>
        <div class="max-h-[70vh] w-full min-w-0 max-w-full overflow-auto overscroll-contain rounded-lg border border-default">
          <div class="min-w-[900px]">
            <div class="grid grid-cols-7 border-b border-default bg-elevated/60 text-center text-xs font-semibold text-muted"><span v-for="day in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="day" class="border-r border-default px-2 py-3 last:border-r-0">{{ day }}</span></div>
            <div v-for="(week, weekIndex) in calendarWeeks" :key="weekIndex" class="border-b border-default last:border-b-0">
              <div class="grid grid-cols-7 border-b border-default/60"><div v-for="cell in week.cells" :key="cell.dateKey" class="h-9 border-r border-default/60 px-2 py-1.5 text-xs last:border-r-0" :class="cell.inMonth ? '' : 'text-muted/60'"><span class="inline-flex min-w-5 justify-center rounded" :class="cell.date.toDateString() === new Date().toDateString() ? 'bg-primary px-1 text-white' : ''">{{ dateForCalendar(cell.date) }}</span></div></div>
              <div class="relative" :style="{ minHeight: `${Math.max(48, (Math.max(0, ...week.bars.map(bar => bar.lane + 1))) * 26 + 8)}px` }">
                <div class="pointer-events-none absolute inset-0 grid grid-cols-7"><span v-for="n in 7" :key="n" class="border-r border-default/60 last:border-r-0"/></div>
                <button v-for="bar in week.bars" :key="bar.id" type="button" class="absolute z-10 h-6 truncate border-y border-success/30 px-2 text-left text-xs font-medium" :class="[bar.task.completed_at ? 'bg-success/30 text-success' : 'bg-primary/20 text-primary', bar.continuesBefore ? 'rounded-l-none' : 'rounded-l-md', bar.continuesAfter ? 'rounded-r-none' : 'rounded-r-md']" :style="{ left: `${bar.column / week.cells.length * 100}%`, width: `${bar.span / week.cells.length * 100}%`, top: `${4 + bar.lane * 26}px` }" :title="`${bar.key} · ${bar.title} · ${formatDueDate(bar.task.start_at)} — ${formatDueDate(bar.task.due_at)}`" @click="openBoardTask(bar)"><span v-if="!bar.continuesBefore">{{ bar.task.completed_at ? '☑ ' : '' }}{{ bar.key }} {{ bar.title }}</span></button>
              </div>
            </div>
            <p v-if="!calendarWeeks.some(week => week.bars.length)" class="p-8 text-center text-sm text-muted">No hay tareas con fechas que coincidan con estos filtros.</p>
          </div>
        </div>
      </section>
      <section v-else-if="activeBoardTab === 'DOCUMENTS' || activeBoardTab === 'ATTACHMENTS'" class="flex flex-col gap-3">
        <USkeleton v-if="boardAttachmentsLoading" class="h-24 w-full" />
        <UAlert v-else-if="boardAttachmentsHasMore || boardAttachmentsHasMoreTasks" color="warning" variant="subtle" title="Listado parcial" description="El tablero tiene más adjuntos de los que se muestran en esta vista. Abrí la tarea para consultar todos sus archivos." />
        <div v-if="!boardAttachmentsLoading && (activeBoardTab === 'ATTACHMENTS' ? attachmentRows : documentRows).length" class="flex flex-col gap-2">
          <div v-for="file in (activeBoardTab === 'ATTACHMENTS' ? attachmentRows : documentRows)" :key="file.id" class="flex min-w-0 items-center gap-3 rounded-lg border border-default p-3"><UIcon :name="file.mime_type === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-paperclip'" class="size-5 shrink-0 text-primary"/><div class="min-w-0 flex-1"><p class="truncate font-medium">{{ file.file_name }}</p><button v-if="file.task" type="button" class="text-xs text-primary hover:underline" @click="openBoardTaskById(file.task.id)">{{ file.task.key }} · {{ file.task.title }}</button></div><UButton v-if="file.mime_type === 'application/pdf' || file.mime_type?.startsWith('image/')" icon="i-lucide-eye" color="neutral" variant="ghost" aria-label="Previsualizar adjunto" @click="openAttachmentPreview(file)"/><UButton icon="i-lucide-download" color="neutral" variant="ghost" aria-label="Descargar adjunto" @click="downloadTaskAttachment(file)"/></div>
        </div>
        <p v-else-if="!boardAttachmentsLoading" class="rounded-lg border border-dashed border-default p-8 text-center text-sm text-muted">{{ activeBoardTab === 'DOCUMENTS' ? 'Este tablero todavía no tiene documentos PDF.' : 'Este tablero todavía no tiene archivos adjuntos.' }}</p>
      </section>
    </UPageCard>
    </div>
  </UPage>

  <UModal v-model:open="taskNotificationSettingsOpen" title="Avisos de tareas" description="Configurá la campanita y los avisos por WhatsApp." :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <label class="flex items-center gap-3"><USwitch v-model="taskNotificationSettings.in_app_enabled" :disabled="!taskNotificationSettingsLoaded" /><span><span class="block font-medium">Notificaciones en la campanita</span><span class="block text-sm text-muted">Asignaciones, miembros asociados, comentarios, menciones y cambios realizados por otras personas.</span></span></label>
        </div>
        <div class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <label class="flex items-center gap-3"><USwitch v-model="taskNotificationSettings.task_changes_enabled" :disabled="!taskNotificationSettingsLoaded" /><span><span class="block font-medium">Avisar cambios a las personas relacionadas</span><span class="block text-sm text-muted">Notifica al creador, responsable y miembros cuando se edita, mueve, completa o reabre una tarea. No avisa a quien realizó la acción. Aplica a campanita y WhatsApp.</span></span></label>
          <UButton label="Guardar" icon="i-lucide-save" :loading="savingTaskNotificationSettings" :disabled="!taskNotificationSettingsLoaded" @click="saveTaskNotificationSettings" />
        </div>
        <UAlert v-if="taskNotificationSettingsError" color="warning" variant="subtle" title="No se pudo cargar la preferencia" :description="taskNotificationSettingsError" />
        <UAlert v-if="whatsappModuleRefreshError" color="warning" variant="subtle" title="No se pudo verificar WhatsApp" :description="whatsappModuleRefreshError" />
        <div class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-message-circle" class="mt-0.5 size-5 shrink-0" :class="whatsappModuleEnabled ? 'text-success' : 'text-muted'" />
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium">Avisos por WhatsApp</p>
                <UBadge :color="whatsappModuleChecking ? 'neutral' : whatsappModuleEnabled ? 'success' : 'neutral'" variant="subtle">{{ whatsappModuleChecking ? 'Verificando…' : whatsappModuleRefreshError ? 'Estado no disponible' : whatsappModuleEnabled ? 'Módulo habilitado' : 'Módulo sin habilitar' }}</UBadge>
              </div>
              <p class="mt-1 text-sm text-muted">{{ whatsappModuleChecking ? 'Consultando los módulos activos de la empresa…' : whatsappModuleRefreshError ? 'Volvé a abrir esta configuración para intentar consultar el estado.' : whatsappModuleEnabled ? 'Además del módulo, activá el canal y la categoría Tareas en Configuración de WhatsApp. El destinatario debe tener un celular en formato internacional y aceptar los avisos.' : 'WhatsApp está disponible como módulo opcional para esta empresa.' }}</p>
            </div>
          </div>
          <UButton v-if="whatsappModuleEnabled && !whatsappModuleChecking" label="Configurar WhatsApp" icon="i-lucide-settings-2" color="neutral" variant="outline" to="/settings/whatsapp" />
          <UButton v-else-if="!whatsappModuleChecking && !whatsappModuleRefreshError && canManagePlatformModules" label="Habilitar WhatsApp" icon="i-lucide-puzzle" color="neutral" variant="outline" to="/settings/platform-plans" />
          <span v-else-if="!whatsappModuleChecking && !whatsappModuleRefreshError" class="text-sm text-muted">Solicitá la activación al administrador de la plataforma.</span>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end"><UButton label="Cerrar" color="neutral" variant="outline" @click="taskNotificationSettingsOpen = false" /></div>
    </template>
  </UModal>

  <UModal v-model:open="showCategoriesModal" title="Categorías de tareas" description="Clasificá las tareas con categorías de esta empresa. Las categorías archivadas siguen visibles en tareas anteriores." :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
        <form class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" @submit.prevent="addCategory">
          <UInput v-model="newCategoryName" maxlength="60" placeholder="Nueva categoría" class="w-full" />
          <USelectMenu v-model="newCategoryColor" :items="labelColorOptions" value-key="value" class="w-full min-w-0" :ui="selectMenuUi" aria-label="Color de la categoría" />
          <UButton type="submit" label="Agregar" icon="i-lucide-plus" :loading="savingCategory" :disabled="!newCategoryName.trim()" />
        </form>
        <div v-if="categories.length" class="divide-y divide-default rounded-lg border border-default px-3">
          <div v-for="category in categories" :key="category.id" class="flex flex-wrap items-center gap-2 py-2.5">
            <UBadge :color="categoryColor(category.color)" variant="subtle">{{ category.name }}</UBadge>
            <UInput v-model="categoryNameDrafts[category.id]" maxlength="60" class="min-w-36 flex-1" :disabled="!category.active" :aria-label="`Nombre de ${category.name}`" />
            <USelectMenu v-if="category.active" v-model="categoryColorDrafts[category.id]" :items="labelColorOptions" value-key="value" class="w-full min-w-0 sm:w-32" :ui="selectMenuUi" :aria-label="`Color de ${category.name}`" />
            <UButton v-if="category.active" label="Guardar" color="neutral" variant="outline" size="sm" :loading="updatingCategoryId === category.id" :disabled="!categoryNameDrafts[category.id]?.trim() || (categoryNameDrafts[category.id] === category.name && categoryColorDrafts[category.id] === category.color)" @click="saveCategory(category)" />
            <UButton :label="category.active ? 'Archivar' : 'Reactivar'" :color="category.active ? 'neutral' : 'primary'" variant="outline" size="sm" :loading="updatingCategoryId === category.id" @click="toggleCategoryActive(category)" />
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed border-default p-4 text-sm text-muted">Todavía no hay categorías. Al cargar el tablero se agregan algunas sugeridas que podés editar o archivar.</p>
      </div>
    </template>
    <template #footer><div class="flex justify-end"><UButton label="Cerrar" color="neutral" variant="outline" @click="showCategoriesModal = false" /></div></template>
  </UModal>

  <UModal v-model:open="boardSettingsOpen" title="Regla de registro de tiempo" description="La regla se aplica solo a este tablero." :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div class="flex flex-col gap-3">
        <label class="flex items-start gap-3 rounded-lg border border-default p-4">
          <USwitch v-model="boardAllowTimerDraft" />
          <span><span class="block font-medium">Permitir temporizador en las tareas</span><span class="mt-1 block text-sm text-muted">Cada persona puede iniciar, pausar y finalizar el tiempo desde una tarea. Al finalizar, se suma al historial de tiempo insumido.</span></span>
        </label>
        <UFormField label="Tope máximo del temporizador" description="Al alcanzar el límite, se detiene automáticamente y guarda el tiempo con una nota de autoapagado.">
          <USelectMenu v-model="boardTimerMaxHoursDraft" :items="Array.from({ length: 8 }, (_, index) => ({ label: `${index + 1} ${index === 0 ? 'hora' : 'horas'}`, value: index + 1 }))" value-key="value" class="w-full" :ui="selectMenuUi" />
        </UFormField>
        <div v-if="boardAllowTimerDraft" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div class="min-w-0"><p class="font-medium">Aviso en el escritorio</p><p class="text-sm text-muted">Puede avisar cuando la aplicación esté en otra pestaña, si el navegador concede permiso. Para abrirla, hay que hacer clic en el aviso.</p></div>
          <UButton v-if="timerDesktopNotificationPermission === 'default'" label="Habilitar aviso" icon="i-lucide-bell-ring" color="neutral" variant="outline" @click="requestTimerDesktopNotifications" />
          <UBadge v-else :color="timerDesktopNotificationPermission === 'granted' ? 'success' : 'neutral'" variant="subtle">{{ timerDesktopNotificationPermission === 'granted' ? 'Habilitado' : timerDesktopNotificationPermission === 'denied' ? 'Bloqueado en el navegador' : 'No disponible' }}</UBadge>
        </div>
        <label class="flex items-start gap-3 rounded-lg border border-default p-4">
          <USwitch v-model="boardRequireWorkLogDraft" />
          <span><span class="block font-medium">Exigir tiempo al cambiar de estado</span><span class="mt-1 block text-sm text-muted">Al mover, completar o reabrir una tarea, se deberá indicar cuánto tiempo llevó el trabajo. También se puede seguir registrando tiempo manualmente desde el detalle.</span></span>
        </label>
      </div>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="boardSettingsOpen = false"/><UButton label="Guardar regla" icon="i-lucide-save" :loading="savingBoardSettings" @click="saveBoardSettings" /></div></template>
  </UModal>

  <UModal v-model:open="showRequiredWorkLogModal" title="Registrar tiempo para cambiar el estado" description="Indicá cuánto trabajo se invirtió en esta tarea antes de aplicar el cambio." :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Tiempo insumido (minutos)" description="Por ejemplo, 45 minutos o 90 minutos."><UInput v-model="requiredWorkLogMinutes" type="number" min="1" max="1440" step="1" class="w-full" /></UFormField>
        <UFormField label="Detalle (opcional)"><UTextarea v-model="requiredWorkLogDescription" maxlength="500" :rows="2" placeholder="¿En qué se trabajó?" class="w-full" /></UFormField>
      </div>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" :disabled="submittingRequiredWorkLog" @click="showRequiredWorkLogModal = false; pendingWorkLogAction = null"/><UButton label="Registrar y continuar" icon="i-lucide-check" :loading="submittingRequiredWorkLog" :disabled="!Number.isInteger(Number(requiredWorkLogMinutes)) || Number(requiredWorkLogMinutes) < 1 || Number(requiredWorkLogMinutes) > 1440" @click="submitRequiredWorkLog" /></div></template>
  </UModal>

  <UModal v-model:open="showBoardModal" title="Crear tablero" description="Podés tener varios tableros por cliente o crear uno general para la empresa." :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Nombre del tablero" required><UInput v-model="boardForm.name" maxlength="120" placeholder="Ej.: Seguimiento comercial" class="w-full" /></UFormField>
        <UFormField label="Prefijo de tareas" description="Se sugiere desde el nombre del tablero. Podés ajustarlo ahora; después queda fijo. Por ejemplo: DY1, DY2, DY3."><UInput v-model="boardForm.task_key_prefix" maxlength="8" placeholder="Ej.: DY" class="w-full uppercase" @update:model-value="taskKeyPrefixManuallyEdited = true" /></UFormField>
        <UFormField label="Descripción"><UTextarea v-model="boardForm.description" maxlength="500" :rows="2" class="w-full" /></UFormField>
        <UFormField label="Cliente asociado" description="Podés crear varios tableros para el mismo cliente."><USelectMenu v-model="boardForm.party_id" :items="taskPartyOptions" value-key="value" searchable v-model:search-term="taskPartySearch" :loading="taskPartySearchLoading" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
        <UFormField label="Columnas iniciales" description="Una columna por línea; entre 2 y 12 columnas."><UTextarea v-model="boardForm.columns" :rows="5" class="w-full" /></UFormField>
      </div>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeBoardModal"/><UButton label="Crear tablero" icon="i-lucide-plus" :loading="saving" :disabled="boardForm.name.trim().length < 2" @click="createBoard"/></div></template>
  </UModal>

  <UModal v-model:open="showTaskModal" :title="selectedTask ? 'Detalle de la tarea' : 'Nueva tarea'" description="Organizá responsables, fechas, etiquetas y comentarios." :ui="{ content: 'sm:max-w-6xl' }">
    <template #header>
      <div class="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <h2 class="truncate text-lg font-semibold">{{ selectedTask ? 'Detalle de la tarea' : 'Nueva tarea' }}</h2>
            <UBadge v-if="selectedTask" color="neutral" variant="subtle" class="shrink-0 font-mono">{{ taskKey(selectedTask, board?.task_key_prefix ?? '') }}</UBadge>
          </div>
          <p class="text-sm text-muted">Organizá responsables, fechas, etiquetas y comentarios.</p>
        </div>
        <UFormField v-if="selectedTask" label="Lista" class="w-full min-w-0 sm:w-52 sm:shrink-0">
          <USelectMenu v-model="taskForm.column_id" :items="board?.columns.map(column => ({ label: column.name, value: column.id })) ?? []" value-key="value" :disabled="!canEditTask" class="w-full min-w-0" :ui="selectMenuUi" aria-label="Lista de la tarea" />
        </UFormField>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" class="self-end sm:self-center" aria-label="Cerrar detalle de la tarea" @click="showTaskModal = false" />
      </div>
    </template>
    <template #body>
      <div class="grid max-h-[78vh] gap-6 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div class="flex min-w-0 flex-col gap-5">
          <div class="flex min-w-0 flex-wrap items-end gap-3">
            <button v-if="selectedTask" type="button" class="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color,transform] duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" :class="selectedTask.completed_at ? 'border-success bg-success text-white' : 'border-muted text-transparent hover:border-success hover:bg-success/15'" :aria-label="selectedTask.completed_at ? 'Reabrir tarea' : 'Marcar tarea como completada'" :aria-pressed="!!selectedTask.completed_at" :title="selectedTask.completed_at ? 'Reabrir tarea' : 'Marcar tarea como completada'" :disabled="!hasTaskPermission('tasks.update') || completionTaskId === selectedTask.id" @click="toggleTaskCompletion(selectedTask)"><UIcon v-if="completionTaskId === selectedTask.id" name="i-lucide-loader-circle" class="size-4 animate-spin text-muted"/><UIcon v-else-if="selectedTask.completed_at" name="i-lucide-check" class="size-4"/></button>
            <span v-else class="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-muted/60" aria-hidden="true" />
            <UInput v-model="taskForm.title" :disabled="!canEditTask" maxlength="200" placeholder="Título de la tarea" class="min-w-0 flex-1 text-lg font-semibold" />
          </div>

          <section v-if="!selectedTask" class="grid min-w-0 gap-3 sm:grid-cols-2">
            <UFormField label="Lista" class="min-w-0"><USelectMenu v-model="taskForm.column_id" :items="board?.columns.map(column => ({ label: column.name, value: column.id })) ?? []" value-key="value" :disabled="!canEditTask" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
            <UFormField label="Responsable" class="min-w-0"><USelectMenu v-model="taskForm.assigned_to" :items="memberOptions" value-key="value" searchable :disabled="!canEditTask" class="w-full min-w-0" :ui="selectMenuUi" /></UFormField>
          </section>

          <div v-if="canEditTask" class="flex flex-wrap gap-2">
            <UButton label="Cliente" icon="i-lucide-building-2" color="neutral" variant="outline" @click="toggleActionPanel('client')" />
            <UButton label="Añadir" icon="i-lucide-plus" color="neutral" variant="outline" @click="toggleActionPanel('add')" />
            <UButton v-if="!selectedTaskLabels.length" label="Etiquetas" icon="i-lucide-tag" color="neutral" variant="outline" @click="toggleActionPanel('labels')" />
            <UButton v-if="selectedTask" label="Checklist" icon="i-lucide-list-checks" color="neutral" variant="outline" @click="toggleActionPanel('checklist')" />
            <UButton label="Miembros" icon="i-lucide-user-round-plus" color="neutral" variant="outline" @click="toggleActionPanel('members')" />
            <input v-if="selectedTask" ref="attachmentInput" type="file" class="hidden" :accept="attachmentAccept" :disabled="!canEditTask" @change="uploadTaskAttachment" />
          </div>
          <div v-if="selectedTaskLabels.length" class="flex min-w-0 flex-wrap items-center gap-2">
            <template v-for="label in selectedTaskLabels" :key="label.id">
              <span class="inline-flex min-h-8 min-w-12 max-w-48 items-center justify-center truncate rounded-md px-3 py-1.5 text-xs font-semibold" :style="labelChipStyle(label.color)" :title="label.name ?? `${labelColorName(label.color)} · solo color`" :aria-label="label.name ?? `${labelColorName(label.color)} · etiqueta sin nombre`">
                <template v-if="label.name">{{ label.name }}</template>
                <span v-else class="sr-only">{{ labelColorName(label.color) }}</span>
              </span>
            </template>
            <UButton v-if="canEditTask" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" class="size-8 justify-center p-0" aria-label="Agregar o quitar etiquetas" title="Etiquetas" @click="toggleActionPanel('labels')" />
          </div>
          <div v-if="canEditTask && (taskForm.category_id === 'NONE' || !taskForm.start_at || !taskForm.due_at)" class="flex min-w-0 flex-wrap items-center gap-2">
            <UButton v-if="taskForm.category_id === 'NONE'" label="Categoría" icon="i-lucide-tag" color="neutral" variant="outline" size="sm" @click="setActionPanel('category')" />
            <UButton v-if="!taskForm.start_at" label="Inicio" icon="i-lucide-calendar-days" color="neutral" variant="outline" size="sm" @click="setActionPanel('start')" />
            <UButton v-if="!taskForm.due_at" label="Vencimiento" icon="i-lucide-calendar-clock" color="neutral" variant="outline" size="sm" @click="setActionPanel('due')" />
          </div>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <UButton v-if="taskForm.category_id !== 'NONE'" :label="`Categoría · ${categories.find(category => category.id === taskForm.category_id)?.name ?? 'Sin categoría'}`" icon="i-lucide-tag" :color="categoryColor(categories.find(category => category.id === taskForm.category_id)?.color ?? 'neutral')" variant="subtle" size="sm" :disabled="!canEditTask" @click="setActionPanel('category')" />
            <UButton :label="`Prioridad · ${priorityOptions.find(option => option.value === taskForm.priority)?.label ?? 'Normal'}`" icon="i-lucide-flag" :color="taskForm.priority === 'URGENT' ? 'error' : taskForm.priority === 'HIGH' ? 'warning' : 'neutral'" variant="subtle" size="sm" :disabled="!canEditTask" @click="setActionPanel('priority')" />
            <UButton v-if="taskForm.start_at" :label="`Inicio · ${formatDueDate(taskForm.start_at)}`" icon="i-lucide-calendar-days" color="neutral" variant="subtle" size="sm" :disabled="!canEditTask" @click="setActionPanel('start')" />
            <UButton v-if="taskForm.due_at" :label="`Vencimiento · ${formatDueDate(taskForm.due_at)}`" icon="i-lucide-calendar-clock" :color="selectedTask && isOverdue(selectedTask) ? 'error' : 'neutral'" variant="subtle" size="sm" :disabled="!canEditTask" @click="setActionPanel('due')" />
          </div>
          <UBadge v-if="taskForm.party_id !== 'NONE'" color="neutral" variant="subtle" class="w-fit"><UIcon name="i-lucide-building-2" class="mr-1 size-3"/>{{ selectedTaskPartyOption?.label ?? selectedBoardParty?.name ?? 'Cliente asociado' }}</UBadge>
          <p v-if="selectedBoardParty" class="text-xs text-muted">El cliente está fijado por este tablero.</p>

          <UModal :open="actionModalOpen" :title="actionPanelTitle" :ui="{ overlay: 'z-[10010]', content: activeActionPanel === 'labels' ? 'z-[10011] sm:max-w-sm' : ['category', 'priority', 'start', 'due'].includes(activeActionPanel ?? '') ? 'z-[10011] sm:max-w-md' : 'z-[10011] sm:max-w-2xl' }" @update:open="open => { if (!open) closeActionPanel() }">
            <template #header>
              <div class="flex w-full items-center gap-3">
                <h2 class="min-w-0 flex-1 text-lg font-semibold">{{ actionPanelTitle }}</h2>
                <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Cerrar ventana de acciones" @click="closeActionPanel" />
              </div>
            </template>
            <template #body>
            <div class="space-y-3">
            <div v-if="activeActionPanel === 'add'" class="grid gap-2 sm:grid-cols-2">
              <UButton label="Cliente" icon="i-lucide-building-2" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('client')" />
              <UButton label="Etiquetas" icon="i-lucide-tag" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('labels')" />
              <UButton v-if="selectedTask" label="Checklist" icon="i-lucide-list-checks" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('checklist')" />
              <UButton label="Miembros" icon="i-lucide-user-round-plus" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('members')" />
              <UButton v-if="selectedTask" label="Adjunto" icon="i-lucide-paperclip" color="neutral" variant="ghost" class="justify-start" :loading="uploadingAttachment" :disabled="!canEditTask" @click="attachmentInput?.click()" />
            </div>
            <div v-else-if="activeActionPanel === 'labels'" class="space-y-3">
              <UInput v-model="labelSearchTerm" icon="i-lucide-search" placeholder="Buscar etiquetas…" class="w-full" />
              <div>
                <p class="mb-2 text-xs font-semibold text-muted">Etiquetas</p>
                <div v-if="filteredTaskLabels.length" class="max-h-72 space-y-1 overflow-y-auto pr-1">
                  <div v-for="label in filteredTaskLabels" :key="label.id" class="group flex items-center gap-2">
                    <button type="button" class="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" :aria-pressed="taskForm.label_ids.includes(label.id)" :disabled="!canEditTask" @click="toggleTaskLabel(label.id)">
                      <span class="flex size-5 shrink-0 items-center justify-center rounded border border-default transition-colors" :class="taskForm.label_ids.includes(label.id) ? 'border-primary bg-primary text-inverted' : 'group-hover:border-primary/70'"><UIcon v-if="taskForm.label_ids.includes(label.id)" name="i-lucide-check" class="size-3.5" /></span>
                      <span class="flex h-10 min-w-0 flex-1 items-center rounded-md px-3 text-sm font-semibold" :style="labelChipStyle(label.color)" :title="`Color: ${labelColorName(label.color).toLocaleLowerCase('es')}, título: ${label.name ? `“${label.name}”` : 'sin título'}`">
                        <span v-if="label.name" class="truncate">{{ label.name }}</span>
                        <span v-else class="sr-only">{{ labelColorName(label.color) }} · solo color</span>
                      </span>
                    </button>
                    <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" :disabled="!canEditTask" :aria-label="`Editar etiqueta ${label.name ?? labelColorName(label.color)}`" :title="`Editar etiqueta ${label.name ?? labelColorName(label.color)}`" @click="openTaskLabelEditor(label)" />
                  </div>
                </div>
                <p v-else class="py-3 text-sm text-muted">{{ labels.length ? 'No hay etiquetas que coincidan con la búsqueda.' : 'Todavía no hay etiquetas.' }}</p>
              </div>
              <UButton v-if="canEditTask" label="Crear una etiqueta nueva" icon="i-lucide-plus" color="neutral" variant="outline" class="w-full justify-center" @click="labelCreateModalOpen = true" />
            </div>
            <div v-else-if="activeActionPanel === 'category'">
              <UFormField label="Categoría"><USelectMenu v-model="taskForm.category_id" :items="[{ label: 'Sin categoría', value: 'NONE' }, ...categoryOptions]" value-key="value" :disabled="!canEditTask" class="w-full min-w-0" :ui="stackedModalSelectMenuUi" placeholder="Elegir categoría" /></UFormField>
            </div>
            <div v-else-if="activeActionPanel === 'priority'">
              <UFormField label="Prioridad"><USelectMenu v-model="taskForm.priority" :items="priorityOptions" value-key="value" :disabled="!canEditTask" class="w-full min-w-0" :ui="stackedModalSelectMenuUi" /></UFormField>
            </div>
            <div v-else-if="activeActionPanel === 'start'">
              <UFormField label="Inicio"><UInput v-model="taskForm.start_at" type="datetime-local" :disabled="!canEditTask" class="w-full" /></UFormField>
            </div>
            <div v-else-if="activeActionPanel === 'due'">
              <UFormField label="Vencimiento"><UInput v-model="taskForm.due_at" type="datetime-local" :disabled="!canEditTask" class="w-full" /></UFormField>
            </div>
            <form v-else-if="activeActionPanel === 'checklist'" class="flex gap-2" @submit.prevent="createChecklist">
              <UInput v-model="checklistTitle" maxlength="120" placeholder="Título de la checklist" class="min-w-0 flex-1" :disabled="!canEditTask" />
              <UButton type="submit" label="Añadir" icon="i-lucide-plus" :disabled="!checklistTitle.trim() || !canEditTask" />
            </form>
            <div v-else-if="activeActionPanel === 'members'" class="space-y-2">
              <UFormField label="Responsable principal" description="Es la persona responsable de gestionar la tarea.">
              <USelectMenu v-model="taskForm.assigned_to" :items="memberOptions" value-key="value" searchable :disabled="!canEditTask" class="w-full min-w-0" :ui="selectMenuUi" placeholder="Buscar miembros" />
              </UFormField>
              <div class="space-y-3 border-t border-default pt-3">
                <div>
                  <p class="text-sm font-medium">Miembros asociados</p>
                  <p class="text-xs text-muted">Sumá varias personas y definí su participación en esta tarea.</p>
                </div>
                <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                  <USelectMenu v-model="memberToAdd" :items="taskMemberOptions" value-key="value" searchable :disabled="!canEditTask || taskMemberOptions.length <= 1" class="w-full min-w-0" :ui="selectMenuUi" placeholder="Buscar persona" />
                  <USelectMenu v-model="memberRoleToAdd" :items="taskMemberRoleOptions" value-key="value" :disabled="!canEditTask || memberToAdd === 'NONE'" class="w-full min-w-0" :ui="selectMenuUi" aria-label="Rol en la tarea" />
                  <UButton label="Agregar" icon="i-lucide-user-round-plus" :disabled="!canEditTask || memberToAdd === 'NONE'" @click="addTaskMember" />
                </div>
                <div v-if="taskForm.members.length" class="divide-y divide-default rounded-lg border border-default px-3">
                  <div v-for="member in taskForm.members" :key="member.user_id" class="flex flex-wrap items-center gap-2 py-2.5">
                    <UIcon name="i-lucide-user-round" class="size-4 text-muted" />
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ members.find(person => person.id === member.user_id)?.name ?? 'Usuario de la empresa' }}</span>
                    <USelectMenu v-model="member.role" :items="taskMemberRoleOptions" value-key="value" :disabled="!canEditTask" class="w-full min-w-0 sm:w-36" :ui="selectMenuUi" aria-label="Rol del miembro" />
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" :disabled="!canEditTask" :aria-label="`Quitar ${members.find(person => person.id === member.user_id)?.name ?? 'miembro'}`" @click="removeTaskMember(member.user_id)" />
                  </div>
                </div>
                <p v-else class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Todavía no hay miembros asociados.</p>
                <p class="text-xs text-muted">Los roles organizan la participación en la tarea; los permisos de acceso siguen dependiendo del rol de la empresa.</p>
              </div>
            </div>
            <div v-else-if="activeActionPanel === 'client'" class="space-y-3">
              <UFormField label="Cliente asociado" :description="selectedBoardParty ? 'El cliente queda fijado por este tablero.' : 'Elegí un cliente para asociarlo a la tarea.'">
                <USelectMenu v-model="taskForm.party_id" :items="taskPartyOptions" value-key="value" searchable v-model:search-term="taskPartySearch" :loading="taskPartySearchLoading" :disabled="!!selectedBoardParty || !canEditTask" class="w-full min-w-0" :ui="selectMenuUi" placeholder="Buscar cliente" />
              </UFormField>
              <p class="text-xs text-muted">El cliente seleccionado se guarda junto con la tarea.</p>
            </div>
            </div>
            </template>
          </UModal>

          <UModal v-model:open="labelCreateModalOpen" title="Crear una etiqueta nueva" description="Elegí un color y, si querés, agregá un nombre." :ui="{ overlay: 'z-[10020]', content: 'z-[10021] sm:max-w-md' }">
            <template #body>
              <div class="flex flex-col gap-4">
                <UFormField label="Nombre (opcional)" description="Dejalo vacío para crear una etiqueta de solo color.">
                  <UInput v-model="newLabelName" maxlength="50" placeholder="Ej.: ELEGANTES" class="w-full" />
                </UFormField>
                <UFormField label="Color">
                  <div class="flex flex-wrap gap-2">
                    <button v-for="option in labelColorOptions" :key="option.value" type="button" class="flex size-9 items-center justify-center rounded-md transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :style="{ backgroundColor: option.background, color: option.foreground }" :class="newLabelColor === option.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-default' : 'ring-1 ring-white/10'" :aria-pressed="newLabelColor === option.value" :aria-label="option.label" :title="option.label" @click="newLabelColor = option.value"><UIcon v-if="newLabelColor === option.value" name="i-lucide-check" class="size-4" /></button>
                  </div>
                </UFormField>
                <div class="flex min-h-10 items-center rounded-md px-3 text-sm font-semibold" :style="labelChipStyle(newLabelColor)">{{ newLabelName.trim() || 'Vista previa de etiqueta solo color' }}</div>
              </div>
            </template>
            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton label="Cancelar" color="neutral" variant="outline" :disabled="addingLabel" @click="labelCreateModalOpen = false" />
                <UButton label="Crear etiqueta" icon="i-lucide-plus" :loading="addingLabel" @click="addLabel" />
              </div>
            </template>
          </UModal>

          <UModal v-model:open="labelEditModalOpen" title="Editar etiqueta" description="Cambiá el color o el nombre de esta etiqueta." :ui="{ overlay: 'z-[10020]', content: 'z-[10021] sm:max-w-md' }">
            <template #body>
              <div class="flex flex-col gap-4">
                <UFormField label="Nombre (opcional)" description="Dejalo vacío para que se muestre solo el color.">
                  <UInput v-model="editingLabelName" maxlength="50" placeholder="Ej.: ELEGANTES" class="w-full" />
                </UFormField>
                <UFormField label="Color">
                  <div class="flex flex-wrap gap-2">
                    <button v-for="option in labelColorOptions" :key="option.value" type="button" class="flex size-9 items-center justify-center rounded-md transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :style="{ backgroundColor: option.background, color: option.foreground }" :class="editingLabelColor === option.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-default' : 'ring-1 ring-white/10'" :aria-pressed="editingLabelColor === option.value" :aria-label="option.label" :title="option.label" @click="editingLabelColor = option.value"><UIcon v-if="editingLabelColor === option.value" name="i-lucide-check" class="size-4" /></button>
                  </div>
                </UFormField>
                <div class="flex min-h-10 items-center rounded-md px-3 text-sm font-semibold" :style="labelChipStyle(editingLabelColor)">{{ editingLabelName.trim() || 'Vista previa de etiqueta solo color' }}</div>
              </div>
            </template>
            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton label="Cancelar" color="neutral" variant="outline" :disabled="updatingLabel" @click="labelEditModalOpen = false" />
                <UButton label="Guardar cambios" icon="i-lucide-check" :loading="updatingLabel" @click="saveTaskLabelEdit" />
              </div>
            </template>
          </UModal>

          <div v-if="taskForm.assigned_to !== 'NONE' || taskForm.members.length" class="space-y-1.5">
            <p class="text-xs font-medium text-muted">Personas asociadas</p>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-if="taskForm.assigned_to !== 'NONE'" color="primary" variant="subtle"><UIcon name="i-lucide-user-round-check" class="mr-1 size-3"/>{{ members.find(member => member.id === taskForm.assigned_to)?.name ?? 'Responsable principal' }} · Responsable</UBadge>
              <UBadge v-for="member in taskForm.members" :key="member.user_id" color="neutral" variant="subtle"><UIcon name="i-lucide-users-round" class="mr-1 size-3"/>{{ members.find(person => person.id === member.user_id)?.name ?? 'Miembro' }} · {{ taskMemberRoleLabel(member.role) }}</UBadge>
            </div>
          </div>
          <div v-if="selectedTask" class="flex flex-wrap items-center gap-2">
            <UButton icon="i-lucide-clock-3" :label="`Tiempo · ${formatWorkedTime(totalWorkMinutes)}`" color="neutral" variant="outline" @click="timeModalOpen = true" />
            <UBadge v-if="selectedTaskTimer" :color="taskTimer.timer?.paused ? 'warning' : 'success'" variant="subtle"><UIcon name="i-lucide-timer" class="mr-1 size-3.5"/>{{ formatTimerDuration(taskTimer.elapsedSeconds) }} · {{ taskTimer.timer?.paused ? 'Pausado' : 'Corriendo' }}</UBadge>
          </div>

          <UModal v-model:open="timeModalOpen" title="Tiempo insumido" description="Temporizador, registro manual e historial de la tarea." :ui="{ overlay: 'z-[9000]', content: 'z-[9001] sm:max-w-2xl' }">
            <template #body>
              <div class="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
                <div v-if="selectedTask?.subtasks_count" class="grid gap-2 rounded-lg border border-default bg-elevated/30 p-3 text-sm sm:grid-cols-3">
                  <div><p class="text-xs text-muted">Esta tarea</p><p class="font-semibold">{{ formatWorkedTime(directWorkMinutes) }}</p></div>
                  <div><p class="text-xs text-muted">Subtareas</p><p class="font-semibold">{{ formatWorkedTime(subtaskWorkMinutes) }}</p></div>
                  <div><p class="text-xs text-muted">Total acumulado</p><p class="font-semibold text-primary">{{ formatWorkedTime(totalWorkMinutes) }}</p></div>
                  <p class="text-xs text-muted sm:col-span-3">El total de la tarea suma sus registros y los de todas sus subtareas.</p>
                </div>
                <div v-if="board?.allow_task_timer" class="flex flex-wrap items-center gap-3 rounded-lg border border-default bg-elevated/30 p-3">
                  <template v-if="selectedTaskTimer">
                    <span class="font-mono text-lg font-semibold tabular-nums" :class="taskTimer.timer?.paused ? 'text-warning' : 'text-success'">{{ formatTimerDuration(taskTimer.elapsedSeconds) }}</span>
                    <UBadge :color="taskTimer.timer?.paused ? 'warning' : 'success'" variant="subtle">{{ taskTimer.timer?.paused ? 'Pausado' : 'Corriendo' }}</UBadge>
                    <div class="ml-auto flex items-center gap-2">
                      <UButton :label="taskTimer.timer?.paused ? 'Reanudar' : 'Pausar'" :icon="taskTimer.timer?.paused ? 'i-lucide-play' : 'i-lucide-pause'" color="neutral" variant="outline" size="sm" :disabled="!canEditTask" @click="toggleSelectedTaskTimer" />
                      <UButton label="Finalizar" icon="i-lucide-square" color="error" variant="outline" size="sm" :loading="taskTimer.finishDialogLoading" :disabled="!canEditTask || taskTimer.finishDialogLoading" @click="finishSelectedTaskTimer" />
                    </div>
                  </template>
                  <template v-else>
                    <span class="min-w-0 flex-1 text-sm text-muted">{{ anotherTaskTimerRunning ? `Ya tenés un temporizador abierto en “${taskTimer.timer?.task_title}”. Finalizalo desde el indicador para iniciar este.` : 'Iniciá el temporizador cuando empieces a trabajar.' }}</span>
                    <UButton label="Iniciar temporizador" icon="i-lucide-play" :disabled="anotherTaskTimerRunning || !canEditTask" @click="startSelectedTaskTimer" />
                  </template>
                </div>
                <form v-if="canEditTask" class="grid gap-2 rounded-lg border border-default p-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]" @submit.prevent="addWorkLog">
                  <UFormField label="Minutos" class="min-w-0"><UInput v-model="workLogMinutes" type="number" min="1" max="1440" step="1" class="w-full" /></UFormField>
                  <UFormField label="Detalle (opcional)" class="min-w-0"><UInput v-model="workLogDescription" maxlength="500" placeholder="Análisis, reunión, desarrollo…" class="w-full" /></UFormField>
                  <div class="flex items-end"><UButton type="submit" label="Registrar" icon="i-lucide-plus" :loading="addingWorkLog" :disabled="!Number.isInteger(Number(workLogMinutes)) || Number(workLogMinutes) < 1 || Number(workLogMinutes) > 1440" /></div>
                </form>
                <div v-if="workLogs.length" class="divide-y divide-default rounded-lg border border-default px-3">
                  <article v-for="log in workLogs" :key="log.id" class="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2.5 text-sm">
                    <UBadge color="primary" variant="subtle" size="xs">{{ formatWorkedTime(log.minutes) }}</UBadge><span class="font-medium">{{ log.user_name }}</span><time class="text-xs text-muted">{{ formatCommentDate(log.created_at) }}</time><p v-if="log.description" class="basis-full text-xs text-muted">{{ log.description }}</p>
                  </article>
                </div>
                <p v-else class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Todavía no se registró tiempo directamente en esta tarea.</p>
                <p v-if="workLogsLimited" class="text-xs text-muted">Se muestran los últimos 200 registros directos; el total acumulado incluye todo el historial y las subtareas.</p>
              </div>
            </template>
          </UModal>

          <div class="flex items-center gap-2 border-t border-default pt-4"><UIcon name="i-lucide-align-left" class="size-5 text-muted"/><h3 class="font-semibold">Descripción</h3></div>
          <TaskDescriptionEditor v-model="taskForm.description" v-model:editing="descriptionEditing" :disabled="!canEditTask" :members="members" />
          <div v-if="descriptionEditing && canEditTask" class="flex flex-wrap items-center gap-2">
            <template v-if="selectedTask">
              <UButton label="Guardar" icon="i-lucide-check" :loading="descriptionSaving" @click="saveTaskDescription" />
              <UButton label="Cancelar" color="neutral" variant="ghost" :disabled="descriptionSaving" @click="cancelTaskDescription" />
            </template>
            <template v-else>
              <UButton label="Listo" icon="i-lucide-check" @click="finishNewTaskDescription" />
              <UButton label="Cancelar" color="neutral" variant="ghost" @click="cancelNewTaskDescription" />
            </template>
          </div>

          <section v-if="selectedTask && checklists.length" class="space-y-3 border-t border-default pt-4">
            <div class="flex items-center justify-between"><div class="flex items-center gap-2"><UIcon name="i-lucide-list-checks" class="size-5 text-muted"/><h3 class="font-semibold">Checklist</h3></div><UButton v-if="canEditTask" label="Añadir checklist" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" @click="setActionPanel('checklist')"/></div>
            <article v-for="checklist in checklists" :key="checklist.id" class="space-y-3 rounded-lg border border-default p-3">
              <header class="flex items-center gap-2"><h4 class="min-w-0 flex-1 font-medium">{{ checklist.title }}</h4><span class="text-xs text-muted">{{ checklistSummary(checklist) }}</span><UButton v-if="canEditTask" icon="i-lucide-trash-2" color="neutral" variant="ghost" size="xs" aria-label="Eliminar checklist" @click="deleteChecklist(checklist)"/></header>
              <div v-if="checklist.items.length" class="h-1.5 overflow-hidden rounded-full bg-elevated"><div class="h-full rounded-full bg-success transition-all" :style="{ width: `${checklist.items.length ? checklist.items.filter(item => item.completed).length / checklist.items.length * 100 : 0}%` }"/></div>
              <div v-for="item in checklist.items" :key="item.id" class="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-elevated/70 focus-within:bg-elevated/70">
                <UCheckbox :model-value="item.completed" :disabled="!canEditTask" @update:model-value="updateChecklistItem(item, { completed: !!$event })" />
                <span class="min-w-0 flex-1 text-sm" :class="item.completed ? 'text-muted line-through' : ''">{{ item.content }}</span>
                <UBadge v-if="item.assigned_to" color="neutral" variant="subtle" size="xs" class="hidden max-w-28 truncate sm:inline-flex">{{ members.find(member => member.id === item.assigned_to)?.name ?? 'Asignado' }}</UBadge>
                <UBadge v-if="item.due_at" color="neutral" variant="subtle" size="xs" class="hidden sm:inline-flex">{{ new Date(item.due_at).toLocaleDateString('es-AR') }}</UBadge>
                <div v-if="canEditTask || canConvertChecklistItem" class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
                  <UPopover v-if="canEditTask" v-model:open="checklistDateOpen[item.id]" :content="{ align: 'end', sideOffset: 6 }">
                    <UButton icon="i-lucide-clock-3" color="neutral" variant="ghost" size="xs" :aria-label="item.due_at ? 'Cambiar vencimiento' : 'Definir vencimiento'" title="Fecha de vencimiento" />
                    <template #content>
                      <div class="flex items-center gap-2 p-3">
                        <UInput :model-value="item.due_at?.slice(0, 10) ?? ''" type="date" size="sm" aria-label="Vencimiento del elemento" @change="onChecklistDueChange(item, $event); checklistDateOpen[item.id] = false" />
                        <UButton v-if="item.due_at" icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Quitar vencimiento" @click="updateChecklistItem(item, { due_at: null }); checklistDateOpen[item.id] = false" />
                      </div>
                    </template>
                  </UPopover>
                  <UPopover v-if="canEditTask" v-model:open="checklistMemberOpen[item.id]" :content="{ align: 'end', sideOffset: 6 }">
                    <UButton icon="i-lucide-user-round-plus" color="neutral" variant="ghost" size="xs" :aria-label="item.assigned_to ? 'Cambiar responsable' : 'Asignar responsable'" title="Responsable" />
                    <template #content>
                      <div class="w-64 p-3">
                        <USelectMenu :model-value="item.assigned_to ?? 'NONE'" :items="memberOptions" value-key="value" searchable size="sm" class="w-full min-w-0" :ui="selectMenuUi" aria-label="Responsable del elemento" @update:model-value="updateChecklistItem(item, { assigned_to: $event === 'NONE' ? null : $event }); checklistMemberOpen[item.id] = false" />
                      </div>
                    </template>
                  </UPopover>
                  <UDropdownMenu :items="checklistItemMenuItems(checklist, item)" :content="{ align: 'end' }">
                    <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="xs" aria-label="Acciones del elemento" title="Acciones del elemento" :loading="convertingChecklistItemId === item.id" />
                  </UDropdownMenu>
                </div>
              </div>
              <form v-if="canEditTask" class="flex gap-2" @submit.prevent="addChecklistItem(checklist)"><UInput v-model="checklistItemDrafts[checklist.id]" placeholder="Añadir un elemento" class="min-w-0 flex-1" maxlength="500"/><UButton type="submit" label="Añadir" size="sm" :disabled="!checklistItemDrafts[checklist.id]?.trim()"/></form>
              <p v-else-if="!checklist.items.length" class="text-sm text-muted">Esta checklist todavía no tiene elementos.</p>
            </article>
            <p v-if="!checklists.length" class="text-sm text-muted">Añadí elementos para organizar el trabajo en pasos.</p>
          </section>

          <section v-if="selectedTask && (linkedTaskRows.length || canEditTask || hasTaskPermission('tasks.create'))" class="space-y-3 border-t border-default pt-4">
            <div class="flex flex-wrap items-center gap-2">
              <UButton v-if="canEditTask" label="Añadir un archivo adjunto" icon="i-lucide-paperclip" color="neutral" variant="outline" size="sm" :loading="uploadingAttachment" @click="attachmentInput?.click()" />
              <template v-if="!linkedTaskRows.length">
                <UButton v-if="hasTaskPermission('tasks.create')" label="Añadir subtarea" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" @click="openTaskRelationModal('CREATE')" />
                <UButton v-if="canEditTask" label="Añadir actividad vinculada" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" @click="openTaskRelationModal('EXISTING')" />
              </template>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="linkedTaskRows.length" type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="linkedActivitiesOpen = !linkedActivitiesOpen"><span class="font-semibold">Actividades vinculadas</span><UBadge color="neutral" variant="subtle">{{ linkedTaskRows.length }}</UBadge><UIcon :name="linkedActivitiesOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 shrink-0 text-muted" /></button>
              <span v-else class="min-w-0 flex-1 font-semibold">Actividades vinculadas</span>
              <UButton v-if="(canEditTask || hasTaskPermission('tasks.create')) && linkedTaskRows.length" icon="i-lucide-plus" color="neutral" variant="ghost" size="sm" aria-label="Añadir actividad secundaria" title="Añadir actividad secundaria" @click="openTaskRelationModal(canEditTask ? 'EXISTING' : 'CREATE')" />
            </div>
            <div v-if="linkedTaskRows.length && linkedActivitiesOpen" class="overflow-x-auto rounded-lg border border-default">
              <div class="min-w-[820px]">
                <div class="grid grid-cols-[9rem_minmax(16rem,1fr)_8rem_10rem_9rem] border-b border-default bg-elevated/40 px-3 py-2 text-xs font-semibold text-muted">
                  <span>Relación</span><span>Actividad</span><span>Prioridad</span><span>Persona asignada</span><span>Estado</span>
                </div>
                <div v-for="row in linkedTaskRows" :key="row.id" class="grid grid-cols-[9rem_minmax(16rem,1fr)_8rem_10rem_9rem] items-center border-b border-default px-3 py-2.5 text-sm last:border-b-0">
                  <span class="truncate text-muted">{{ row.relation }}</span>
                  <button type="button" class="flex min-w-0 items-center gap-2 text-left hover:text-primary" :title="`${row.task.board.name} · ${row.task.column.name} · ${row.task.id}`" @click="openRelatedTask(row.task.id)">
                    <span class="shrink-0 font-mono text-xs text-primary">{{ taskKey(row.task) }}</span><span class="truncate font-medium">{{ row.task.title }}</span>
                  </button>
                  <span class="truncate">{{ priorityOptions.find(option => option.value === row.task.priority)?.label ?? 'Normal' }}</span>
                  <span class="truncate" :title="members.find(member => member.id === row.task.assigned_to)?.name ?? 'Sin asignar'">{{ row.task.assigned_to ? members.find(member => member.id === row.task.assigned_to)?.name ?? 'Usuario asignado' : 'Sin asignar' }}</span>
                  <UBadge :color="row.task.completed_at ? 'success' : 'neutral'" variant="subtle" class="w-fit max-w-full truncate">{{ row.task.completed_at ? 'Finalizada' : row.task.column.name }}</UBadge>
                </div>
              </div>
            </div>
          </section>

          <UModal v-model:open="taskRelationCreateOpen" :title="relationModalMode === 'CREATE' ? 'Añadir actividad secundaria' : 'Añadir actividad vinculada'" description="Creá una subtarea o relacioná una actividad existente." :ui="{ overlay: 'z-[10040]', content: 'z-[10041] sm:max-w-xl' }">
            <template #body>
              <div class="flex flex-col gap-3">
                <div class="grid rounded-lg bg-elevated p-1" :class="hasTaskPermission('tasks.create') && canEditTask ? 'grid-cols-2' : 'grid-cols-1'">
                  <button v-if="hasTaskPermission('tasks.create')" type="button" class="rounded-md px-3 py-2 text-sm font-medium transition-colors" :class="relationModalMode === 'CREATE' ? 'bg-default text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'" @click="relationModalMode = 'CREATE'">Crear nuevo</button>
                  <button v-if="canEditTask" type="button" class="rounded-md px-3 py-2 text-sm font-medium transition-colors" :class="relationModalMode === 'EXISTING' ? 'bg-default text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'" @click="relationModalMode = 'EXISTING'">Añadir existente</button>
                </div>
                <template v-if="relationModalMode === 'CREATE'">
                  <UFormField label="Nombre de la tarea" required><UInput v-model="subtaskTitleDraft" maxlength="200" placeholder="Pon un nombre a esta tarea" class="w-full" @keydown.enter.prevent="addSubtask" /></UFormField>
                  <UFormField v-if="subtaskCategoryOptions.length" label="Categoría"><USelectMenu v-model="subtaskCategoryDraft" :items="[{ label: 'Sin categoría', value: 'NONE' }, ...subtaskCategoryOptions]" value-key="value" class="w-full min-w-0" :ui="{ ...selectMenuUi, content: 'z-[10050] max-w-[calc(100vw-2rem)]' }" /></UFormField>
                  <p class="text-xs text-muted">Se agregará como subtarea en la misma lista y con el mismo cliente.</p>
                </template>
                <template v-else>
                  <UFormField label="Definir relación"><USelectMenu v-model="relationTypeDraft" :items="taskRelationOptions" value-key="value" placeholder="Definir relación" class="w-full min-w-0" :ui="{ ...selectMenuUi, content: 'z-[10050] max-w-[calc(100vw-2rem)]' }" /></UFormField>
                  <UFormField label="Buscar actividad"><UInput v-model="relationSearch" icon="i-lucide-search" placeholder="Busca tareas o pega una clave como DY1" class="w-full" /></UFormField>
                  <div class="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-default p-1">
                    <div v-if="loadingRelationCandidates" class="flex items-center gap-2 p-3 text-sm text-muted"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />Buscando actividades…</div>
                    <button v-for="candidate in relationCandidates" :key="candidate.id" type="button" class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-elevated" :class="relationCandidateId === candidate.id ? 'bg-primary/10' : ''" @click="relationCandidateId = relationCandidateId === candidate.id ? '' : candidate.id">
                      <span class="flex size-4 shrink-0 items-center justify-center rounded border" :class="relationCandidateId === candidate.id ? 'border-primary bg-primary text-inverted' : 'border-muted'"><UIcon v-if="relationCandidateId === candidate.id" name="i-lucide-check" class="size-3" /></span>
                      <span class="shrink-0 font-mono text-xs text-primary">{{ taskKey(candidate) }}</span><span class="min-w-0 flex-1 truncate text-sm">{{ candidate.title }}</span><span class="max-w-24 truncate text-xs text-muted">{{ candidate.board.name }}</span>
                    </button>
                    <p v-if="!loadingRelationCandidates && !relationCandidates.length" class="p-3 text-sm text-muted">No hay otras tareas disponibles con esa búsqueda.</p>
                  </div>
                </template>
              </div>
            </template>
            <template #footer>
              <div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" :disabled="savingTaskRelation || creatingSubtask" @click="taskRelationCreateOpen = false" /><UButton v-if="relationModalMode === 'CREATE'" label="Crear subtarea" icon="i-lucide-plus" :loading="creatingSubtask" :disabled="subtaskTitleDraft.trim().length < 2 || creatingSubtask" @click="addSubtask" /><UButton v-else label="Vincular actividad" icon="i-lucide-link" :loading="savingTaskRelation" :disabled="!relationCandidateId || relationTypeDraft === 'NONE' || savingTaskRelation" @click="addTaskRelation" /></div>
            </template>
          </UModal>
          <section v-if="selectedTask && attachments.length" class="space-y-3 border-t border-default pt-4">
            <div class="flex items-center gap-2"><UIcon name="i-lucide-paperclip" class="size-5 text-muted"/><h3 class="font-semibold">Adjuntos</h3><UBadge color="neutral" variant="subtle">{{ attachments.length }}</UBadge></div>
            <article v-for="file in attachments" :key="file.id" class="flex min-w-0 items-center gap-3 rounded-lg border border-default p-2.5">
              <button type="button" class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-elevated" :aria-label="`Previsualizar ${file.file_name}`" @click="openAttachmentPreview(file)"><img v-if="file.thumb_url" :src="file.thumb_url" :alt="file.file_name" class="size-full object-cover"/><UIcon v-else :name="file.mime_type === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-file'" class="size-6 text-muted"/></button>
              <div class="min-w-0 flex-1"><button type="button" class="block max-w-full truncate text-left text-sm font-medium hover:text-primary" @click="openAttachmentPreview(file)">{{ file.file_name }}</button><p class="text-xs text-muted">{{ formatFileSize(file.file_size) }}</p></div>
              <UButton icon="i-lucide-eye" color="neutral" variant="ghost" size="sm" :aria-label="`Ver ${file.file_name}`" @click="openAttachmentPreview(file)"/><UButton icon="i-lucide-download" color="neutral" variant="ghost" size="sm" :aria-label="`Descargar ${file.file_name}`" @click="downloadTaskAttachment(file)"/><UButton v-if="canEditTask" icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" :loading="attachmentDeletingId === file.id" :aria-label="`Quitar ${file.file_name}`" @click="removeAttachment(file.id)"/>
            </article>
          </section>

        </div>

        <section class="flex min-h-72 min-w-0 flex-col gap-3 border-t border-default pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-message-square-text" class="size-4" />Comentarios y actividad</div>
          <UTextarea v-if="selectedTask && hasTaskPermission('tasks.comment')" v-model="commentDraft" :rows="3" maxlength="5000" placeholder="Escribí un comentario…" />
          <div v-if="selectedTask && hasTaskPermission('tasks.comment')" class="flex justify-end"><UButton label="Publicar comentario" icon="i-lucide-send" size="sm" :loading="commentSaving" :disabled="!commentDraft.trim()" @click="addComment" /></div>
          <p v-else-if="!selectedTask" class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Guardá la tarea para iniciar la conversación.</p>
          <p v-else class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Tu rol permite consultar esta tarea, pero no agregar comentarios.</p>
          <div class="space-y-3 rounded-lg border border-default p-3">
            <div v-if="commentsLoading" class="flex items-center gap-2 text-sm text-muted"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />Cargando comentarios…</div>
            <p v-else-if="selectedTask && !comments.length" class="py-6 text-center text-sm text-muted">Todavía no hay comentarios.</p>
            <article v-for="comment in comments" :key="comment.id" class="flex gap-2.5">
              <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{{ comment.author?.name?.slice(0, 1) ?? 'U' }}</div>
              <div class="min-w-0 flex-1 rounded-lg bg-elevated/50 p-2.5">
                <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2"><span class="text-sm font-medium">{{ comment.author?.name ?? 'Usuario' }}</span><time class="text-xs text-muted">{{ formatCommentDate(comment.created_at) }}</time></div>
                <p class="whitespace-pre-wrap break-words text-sm">{{ comment.content }}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-between gap-2">
        <UButton v-if="selectedTask && hasTaskPermission('tasks.delete')" label="Eliminar" icon="i-lucide-trash-2" color="error" variant="outline" @click="openDeleteTask" />
        <span v-else />
        <div class="ml-auto flex gap-2"><UButton label="Cerrar" color="neutral" variant="outline" @click="closeTaskModal"/><UButton v-if="canEditTask" :label="selectedTask ? 'Guardar cambios' : 'Crear tarea'" icon="i-lucide-check" :loading="saving" :disabled="taskForm.title.trim().length < 2" @click="saveTask"/></div>
      </div>
    </template>
  </UModal>

  <UModal :open="!!previewAttachment" :title="previewAttachment?.file_name || 'Vista previa del adjunto'" :ui="{ content: 'sm:max-w-5xl' }" @update:open="open => !open && clearAttachmentPreview()">
    <template #body>
      <div v-if="previewAttachment" class="space-y-3">
        <div v-if="attachmentPreviewLoading" class="flex min-h-64 items-center justify-center gap-3 text-muted"><UIcon name="i-lucide-loader-circle" class="size-8 animate-spin"/>Cargando adjunto…</div>
        <UAlert v-else-if="attachmentPreviewError" color="error" variant="soft" icon="i-lucide-circle-alert" title="No se pudo mostrar el adjunto" :description="attachmentPreviewError" />
        <img v-else-if="attachmentPreviewUrl && (previewAttachment.mime_type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(previewAttachment.file_name || ''))" :src="attachmentPreviewUrl" :alt="previewAttachment.file_name" class="max-h-[72vh] w-full rounded-lg bg-muted/20 object-contain" />
        <iframe v-else-if="attachmentPreviewUrl && (previewAttachment.mime_type === 'application/pdf' || /\.pdf$/i.test(previewAttachment.file_name || ''))" :src="attachmentPreviewUrl" class="h-[72vh] w-full rounded-lg border border-default" title="Vista previa del PDF" />
        <div v-else-if="attachmentPreviewUrl" class="space-y-3 rounded-lg border border-default p-6 text-center"><UIcon name="i-lucide-file" class="mx-auto size-10 text-muted"/><p>Este tipo de archivo no tiene vista previa. Descargalo para abrirlo.</p><UButton label="Descargar adjunto" icon="i-lucide-download" @click="downloadTaskAttachment(previewAttachment)" /></div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="showDeleteModal" title="Eliminar tarea" description="La tarea dejará de aparecer en los tableros de esta empresa.">
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeDeleteModal"/><UButton label="Eliminar tarea" color="error" icon="i-lucide-trash-2" :loading="deleting" @click="deleteTask"/></div></template>
  </UModal>

  <UModal v-model:open="showMoveTasksModal" title="Mover todas las tarjetas" :description="moveTasksFrom ? `Se moverán todas las tarjetas de “${moveTasksFrom.name}”, incluso las que el filtro actual no muestre.` : undefined" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <UFormField label="Lista de destino" class="min-w-0"><USelectMenu v-model="moveTasksTargetId" :items="board?.columns.filter(column => column.id !== moveTasksFrom?.id).map(column => ({ label: column.name, value: column.id })) ?? []" value-key="value" class="w-full min-w-0" :ui="selectMenuUi"/></UFormField>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeMoveTasksModal"/><UButton label="Mover tarjetas" icon="i-lucide-list-end" :loading="movingAllTasks" :disabled="!moveTasksTargetId" @click="confirmMoveAllTasks"/></div></template>
  </UModal>

  <UModal v-model:open="showMoveColumnModal" title="Mover lista" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <UFormField label="Nueva ubicación" class="min-w-0"><USelectMenu v-model="moveColumnPosition" :items="columnMoveOptions" value-key="value" class="w-full min-w-0" :ui="selectMenuUi"/></UFormField>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeMoveColumnModal"/><UButton label="Mover lista" icon="i-lucide-arrow-right-left" :loading="movingColumn" @click="confirmMoveColumn"/></div></template>
  </UModal>
</template>

<style scoped>
:deep(.task-card-ghost) {
  opacity: 0.68 !important;
  transform: none !important;
  border: 2px dashed var(--ui-primary) !important;
  border-radius: 0.75rem !important;
  background: color-mix(in srgb, var(--ui-primary) 8%, var(--ui-bg-elevated)) !important;
  box-shadow: none !important;
}

:deep(.task-card-ghost:hover) {
  transform: none !important;
}

:deep(.task-card) {
  appearance: none;
  cursor: grab;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

:deep(.task-card:hover) {
  transform: translateY(-1px) rotate(-0.25deg);
  border-color: color-mix(in srgb, var(--ui-primary) 55%, var(--ui-border)) !important;
  background: var(--ui-bg-elevated) !important;
  box-shadow: 0 6px 16px rgb(0 0 0 / 16%) !important;
}

:deep(.task-card:focus-visible) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

:deep(.task-card-heading) {
  padding-left: 0;
  transition: padding-left 220ms ease-out;
}

:deep(.task-card-heading-completed) {
  padding-left: 2rem;
}

:deep(.task-card:hover .task-card-heading-interactive),
:deep(.task-card:focus-within .task-card-heading-interactive) {
  padding-left: 2rem;
}

@media (hover: none) {
  :deep(.task-card-heading-interactive) {
    padding-left: 2rem;
  }

  :deep(.task-completion:not(.task-completion-done)) {
    opacity: 1;
    transform: scale(1);
  }

  :deep(.task-completion:not(.task-completion-done) svg) {
    opacity: 1;
  }
}

:deep(.task-card-chosen) {
  cursor: grabbing;
  border-color: var(--ui-primary) !important;
  box-shadow: 0 8px 22px rgb(0 0 0 / 22%) !important;
}

:deep(.task-card-drag),
:deep(.task-card-fallback) {
  opacity: 0.96 !important;
  cursor: grabbing !important;
  transform: rotate(1deg) scale(1.02) !important;
  border-color: var(--ui-primary) !important;
  box-shadow: 0 14px 32px rgb(0 0 0 / 30%) !important;
}
</style>
