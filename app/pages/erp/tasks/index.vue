<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { useTasksService, type SaveTaskInput, type TaskBoard, type TaskChecklist, type TaskColumn, type TaskComment, type TaskLabel, type TaskMember, type TaskMemberInput, type TaskMemberRole, type TaskNotificationSettings, type TaskRecord } from '~/modulos/erp/tasks/tasks.service'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { usePlatformModulesStore } from '~/modulos/platform-modules/platform-modules.store'
import { usePhotosService } from '~/modulos/logistica/media/photos/photos.service'
import TaskDescriptionEditor from '~/components/erp/tasks/TaskDescriptionEditor.vue'

definePageMeta({ middleware: ['auth'] })
useHead({ title: 'Tareas | AsteriskSuite' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()
const platformModules = usePlatformModulesStore()
const { isOwnerOrAdmin } = useCompanyRole()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const hasTaskPermission = (permission: string) => auth.selectedCompany?.role === 'OWNER' || hasPermission(permission)
const service = useTasksService()
const partiesService = useBusinessPartiesService()
const photosService = usePhotosService()

const boards = ref<TaskBoard[]>([])
const members = ref<TaskMember[]>([])
const labels = ref<TaskLabel[]>([])
const comments = ref<TaskComment[]>([])
const checklists = ref<TaskChecklist[]>([])
const attachments = ref<any[]>([])
const checklistTitle = ref('')
const checklistItemDrafts = ref<Record<string, string>>({})
const checklistDateOpen = reactive<Record<string, boolean>>({})
const checklistMemberOpen = reactive<Record<string, boolean>>({})
const convertingChecklistItemId = ref('')
const activeActionPanel = ref<'add' | 'labels' | 'dates' | 'checklist' | 'members' | 'client' | null>(null)
const actionModalOpen = ref(false)
const attachmentInput = ref<HTMLInputElement | null>(null)
const uploadingAttachment = ref(false)
const attachmentDeletingId = ref('')
const board = ref<(TaskBoard & { columns: TaskColumn[] }) | null>(null)
const boardId = ref('')
const partyFilter = ref('ALL')
const partyOptions = ref<Array<{ label: string; value: string }>>([{ label: 'Todos los clientes', value: 'ALL' }])
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
const taskNotificationSettings = reactive<TaskNotificationSettings>({ in_app_enabled: true })
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
const newLabelName = ref('')
const newLabelColor = ref('warning')
const commentDraft = ref('')
const showBoardModal = ref(false)
const showTaskModal = ref(false)
const showDeleteModal = ref(false)
const selectedTask = ref<TaskRecord | null>(null)
const boardForm = reactive({ name: '', description: '', party_id: 'NONE', columns: 'Pendiente\nEn curso\nEn revisión\nFinalizada' })
const taskForm = reactive({
  title: '',
  description: '',
  column_id: '',
  party_id: 'NONE',
  assigned_to: 'NONE',
  start_at: '',
  due_at: '',
  priority: 'NORMAL' as TaskRecord['priority'],
  label_ids: [] as string[],
  members: [] as TaskMemberInput[],
})
const memberToAdd = ref('NONE')
const memberRoleToAdd = ref<TaskMemberRole>('COLLABORATOR')

const boardOptions = computed(() => boards.value.map(item => ({ label: `${item.name}${item.party ? ` · ${item.party.name}` : item.is_default ? ' · Principal' : ''}`, value: item.id })))
const memberOptions = computed(() => [{ label: 'Sin asignar', value: 'NONE' }, ...members.value.map(member => ({ label: member.name, value: member.id }))])
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
const whatsappModule = computed(() => platformModules.modules.find(module => module.code === 'WHATSAPP') ?? null)
const whatsappModuleEnabled = computed(() => whatsappModule.value?.enabled === true)
const canManagePlatformModules = computed(() => ['PLATFORM_OWNER', 'PLATFORM_ADMIN'].includes(auth.user?.role ?? ''))
const selectedTaskPartyOption = computed(() => taskPartyOptions.value.find(option => option.value === taskForm.party_id) ?? customerSuggestions.value.find(option => option.value === taskForm.party_id))
const labelOptions = computed(() => labels.value.map(label => ({ label: label.name, value: label.id })))
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
  { label: 'Naranja', value: 'warning' },
  { label: 'Rojo', value: 'error' },
  { label: 'Azul', value: 'info' },
  { label: 'Verde', value: 'success' },
  { label: 'Violeta', value: 'primary' },
  { label: 'Gris', value: 'neutral' },
]
const actionPanelTitle = computed(() => {
  switch (activeActionPanel.value) {
    case 'add': return 'Añadir a la tarea'
    case 'labels': return 'Etiquetas'
    case 'dates': return 'Fechas'
    case 'checklist': return 'Añadir checklist'
    case 'members': return 'Miembros'
    case 'client': return 'Cliente asociado'
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
      { label: 'Mover todas las tarjetas de esta lista…', icon: 'i-lucide-list-end', disabled: (column.total_tasks ?? column.tasks.length) === 0 || columns.length < 2, onSelect: () => openMoveTasks(column) },
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

function labelBackgroundClass(color: string) {
  return ({
    primary: 'bg-primary/30', success: 'bg-success/30', info: 'bg-info/30',
    warning: 'bg-warning/30', error: 'bg-error/30', neutral: 'bg-neutral/30',
  } as const)[color as 'primary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'] ?? 'bg-primary/30'
}

async function loadBoards() {
  boards.value = await service.getBoards()
  const requestedId = typeof route.query.board_id === 'string' ? route.query.board_id : ''
  const requestedPartyId = typeof route.query.party_id === 'string' ? route.query.party_id : ''
  const chosen = boards.value.find(item => item.id === requestedId)
    ?? boards.value.find(item => item.party_id === requestedPartyId)
    ?? boards.value.find(item => item.is_default)
    ?? boards.value[0]
  boardId.value = chosen?.id ?? ''
}

async function loadBoard() {
  if (!boardId.value) {
    board.value = null
    return
  }
  board.value = await service.getBoard(boardId.value, partyFilter.value === 'ALL' ? undefined : partyFilter.value)
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
      partyFilter.value = party.id
    }
    const results = await Promise.all([loadBoards(), service.getMembers(), service.getLabels()])
    members.value = results[1]
    labels.value = results[2]
    try {
      const notificationSettings = await service.getNotificationSettings()
      taskNotificationSettings.in_app_enabled = notificationSettings.in_app_enabled
      taskNotificationSettingsLoaded.value = true
      taskNotificationSettingsError.value = ''
    } catch (error: any) {
      // Una preferencia de avisos no debe impedir que se abra el tablero.
      taskNotificationSettingsLoaded.value = false
      taskNotificationSettingsError.value = error?.data?.message ?? 'No se pudieron cargar las preferencias de avisos.'
    }
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
    taskNotificationSettingsLoaded.value = true
    taskNotificationSettingsError.value = ''
    toast.add({ title: 'Preferencia guardada', description: saved.in_app_enabled ? 'Los eventos de tareas llegarán a la campanita.' : 'Se pausaron los avisos internos de tareas para esta empresa.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    savingTaskNotificationSettings.value = false
  }
}

let partyFilterSearchTimer: ReturnType<typeof setTimeout> | undefined
let taskPartySearchTimer: ReturnType<typeof setTimeout> | undefined
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
      const selected = isFilter ? partyFilter.value : taskForm.party_id
      if (selected !== 'ALL' && selected !== 'NONE' && !next.some(option => option.value === selected)) {
        next.unshift(...customerSuggestions.value.filter(option => option.value === selected))
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

watch([boardId, partyFilter], async () => {
  if (loading.value || !boardId.value) return
  try {
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo abrir el tablero', description: error?.data?.message ?? error.message, color: 'error' })
  }
})

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
  Object.assign(boardForm, { name: '', description: '', party_id: partyFilter.value === 'ALL' ? 'NONE' : partyFilter.value, columns: 'Pendiente\nEn curso\nEn revisión\nFinalizada' })
  showBoardModal.value = true
}

function closeBoardModal() { showBoardModal.value = false }
function closeTaskModal() {
  showTaskModal.value = false
  closeActionPanel()
  if (route.query.task_id) {
    const query = { ...route.query }
    delete query.task_id
    void router.replace({ query })
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
  activeActionPanel.value = panel
  actionModalOpen.value = true
}
function setActionPanel(panel: NonNullable<typeof activeActionPanel.value>) {
  activeActionPanel.value = panel
  actionModalOpen.value = true
}
function closeActionPanel() {
  actionModalOpen.value = false
  activeActionPanel.value = null
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
    const created = await service.createBoard({ name: boardForm.name.trim(), description: boardForm.description.trim() || undefined, party_id: boardForm.party_id === 'NONE' ? null : boardForm.party_id, columns })
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
      party_id: board.value?.party_id ?? (partyFilter.value === 'ALL' ? null : partyFilter.value),
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
  checklists.value = []
  attachments.value = []
  activeActionPanel.value = null
  actionModalOpen.value = false
  descriptionEditing.value = false
  commentDraft.value = ''
  taskPartySearch.value = ''
  newLabelName.value = ''
  Object.assign(taskForm, {
    title: '', description: '', column_id: column.id,
    party_id: board.value?.party_id ?? (partyFilter.value === 'ALL' ? 'NONE' : partyFilter.value),
    assigned_to: 'NONE', start_at: '', due_at: '', priority: 'NORMAL',
    label_ids: [],
    members: [],
  })
  memberToAdd.value = 'NONE'
  memberRoleToAdd.value = 'COLLABORATOR'
  showTaskModal.value = true
}

function openEditTask(task: TaskRecord, columnId: string) {
  selectedTask.value = task
  comments.value = []
  checklists.value = []
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
  void loadChecklists(task.id)
  void loadAttachments(task.id)
}

async function loadChecklists(taskId: string) {
  try { checklists.value = await service.getChecklists(taskId) }
  catch (error: any) { toast.add({ title: 'No se pudieron cargar las checklist', description: error?.data?.message ?? error.message, color: 'error' }) }
}

async function loadAttachments(taskId: string) {
  try { attachments.value = await photosService.findMediaByEntity('task', taskId) }
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
    await loadBoard()
    toast.add({ title: 'Tarea creada', description: 'El elemento se movió a la lista actual del tablero.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo convertir el elemento', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    convertingChecklistItemId.value = ''
  }
}

function checklistItemMenuItems(checklist: TaskChecklist, item: TaskChecklist['items'][number]) {
  const actions: Array<Array<Record<string, any>>> = []
  if (canConvertChecklistItem.value) {
    actions.push([{ label: 'Convertir a tarea', icon: 'i-lucide-square-arrow-out-up-right', onSelect: () => void convertChecklistItemToTask(checklist, item) }])
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
  attachmentDeletingId.value = attachmentId
  try {
    await photosService.remove(attachmentId)
    attachments.value = attachments.value.filter(item => item.id !== attachmentId)
    toast.add({ title: 'Adjunto quitado', color: 'success' })
  } catch (error: any) { toast.add({ title: 'No se pudo quitar el adjunto', description: error?.data?.message ?? error.message, color: 'error' }) }
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
  if (!name) return
  addingLabel.value = true
  try {
    const label = await service.createLabel({ name, color: newLabelColor.value })
    if (!labels.value.some(item => item.id === label.id)) labels.value.push(label)
    if (!taskForm.label_ids.includes(label.id)) taskForm.label_ids.push(label.id)
    newLabelName.value = ''
  } catch (error: any) {
    toast.add({ title: 'No se pudo crear la etiqueta', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    addingLabel.value = false
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
    label_ids: taskForm.label_ids,
    members: taskForm.members.filter(member => member.user_id !== taskForm.assigned_to),
  }
  try {
    if (selectedTask.value) await service.updateTask(selectedTask.value.id, payload)
    else await service.createTask(boardId.value, payload)
    toast.add({ title: selectedTask.value ? 'Tarea actualizada' : 'Tarea creada', color: 'success' })
    await loadBoard()
    descriptionEditing.value = false
    if (!selectedTask.value) showTaskModal.value = false
    else {
      selectedTask.value = board.value?.columns.flatMap(column => column.tasks).find(task => task.id === selectedTask.value?.id) ?? selectedTask.value
      taskForm.members = taskForm.members.filter(member => member.user_id !== taskForm.assigned_to)
      if (selectedTask.value) await loadComments(selectedTask.value.id)
    }
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function onTaskChange(columnId: string, event: any) {
  const moved = event.added?.element ?? event.moved?.element
  if (!moved) return
  moving.value = true
  try {
    await service.updateTask(moved.id, { column_id: columnId, position: event.added?.newIndex ?? event.moved?.newIndex ?? 0 })
    await loadBoard()
  } catch (error: any) {
    toast.add({ title: 'No se pudo mover la tarea', description: error?.data?.message ?? error.message, color: 'error' })
    await loadBoard()
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
    toast.add({ title: 'No se pudo actualizar la tarea', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    completionTaskId.value = ''
  }
}

function onDragMove(event: { to?: HTMLElement }) {
  const destination = event.to?.closest<HTMLElement>('[data-task-column]')
  dragOverColumnId.value = destination?.dataset.taskColumn ?? ''
  return true
}

function onDragEnd() {
  dragOverColumnId.value = ''
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

onMounted(load)
onBeforeUnmount(() => {
  if (partyFilterSearchTimer) clearTimeout(partyFilterSearchTimer)
  if (taskPartySearchTimer) clearTimeout(taskPartySearchTimer)
  partyFilterSearchController?.abort()
  taskPartySearchController?.abort()
})
</script>

<template>
  <UPage class="mx-auto !block w-0 min-w-full max-w-full overflow-x-clip px-4 pb-10 sm:px-6">
    <div class="flex flex-col gap-5">
    <AppPageHeader title="Tareas" description="Organizá el trabajo de la empresa y vinculá tareas con clientes cuando haga falta.">
      <template #links>
        <UButton v-if="hasTaskPermission('tasks.create')" label="Nuevo tablero" icon="i-lucide-plus" variant="outline" @click="openBoardModal" />
        <UButton v-if="!loading && isOwnerOrAdmin" icon="i-lucide-settings-2" color="neutral" variant="outline" aria-label="Configurar avisos de tareas" title="Configurar avisos de tareas" @click="taskNotificationSettingsOpen = true" />
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

    <UPageCard v-if="!loading && boards.length" variant="subtle" class="min-w-0 space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Tablero" class="w-64 max-w-full"><USelectMenu v-model="boardId" :items="boardOptions" value-key="value" /></UFormField>
          <UFormField label="Cliente" class="w-72 max-w-full">
            <USelectMenu v-model="partyFilter" :items="partyOptions" value-key="value" searchable v-model:search-term="partyFilterSearch" :loading="partySearchLoading" placeholder="Todos los clientes" />
          </UFormField>
          <UButton v-if="partyFilter !== 'ALL'" label="Ver ficha del cliente" icon="i-lucide-arrow-up-right" color="neutral" variant="outline" :to="`/erp/sales/customers/${partyFilter}`" />
        </div>
        <UButton v-if="hasTaskPermission('tasks.create')" label="Nueva tarea" icon="i-lucide-plus" :disabled="!board" @click="board?.columns[0] && openNewTask(board.columns[0])" />
      </div>

      <UAlert v-if="partyFilter !== 'ALL'" color="info" variant="subtle" icon="i-lucide-user-round" title="Vista de cliente" description="El tablero está filtrado para mostrar solo las tareas asociadas a este cliente. Las tareas generales siguen disponibles al quitar el filtro." />
      <UAlert v-if="moving" color="neutral" variant="subtle" icon="i-lucide-loader-circle" title="Guardando el nuevo estado…" />

      <div v-if="board" class="overflow-x-auto pb-2">
        <div class="grid min-w-max items-start gap-3" :style="{ gridTemplateColumns: `repeat(${board.columns.length + 1}, minmax(275px, 1fr))` }">
          <section v-for="column in board.columns" :key="column.id" :data-task-column="column.id" class="flex h-fit w-[min(82vw,340px)] self-start flex-col rounded-xl border border-default bg-elevated/25 transition-[background-color,border-color,box-shadow] duration-200" :class="dragOverColumnId === column.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''">
            <header class="flex items-center justify-between gap-2 border-b border-default px-3 py-3">
              <div class="flex min-w-0 items-center gap-2"><span class="size-2.5 shrink-0 rounded-full" :class="column.is_closed ? 'bg-success' : column.color === 'warning' ? 'bg-warning' : column.color === 'info' ? 'bg-info' : 'bg-neutral-400'"/><h2 class="truncate font-semibold">{{ column.name }}</h2><UBadge color="neutral" variant="subtle">{{ column.total_tasks ?? column.tasks.length }}</UBadge><UIcon v-if="column.is_pinned" name="i-lucide-pin" class="size-3.5 text-primary"/><UIcon v-if="column.is_watching" name="i-lucide-eye" class="size-3.5 text-primary"/></div>
              <div class="flex shrink-0 items-center">
                <UDropdownMenu :items="columnMenuItems(column)" :content="{ align: 'end' }">
                  <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="sm" :aria-label="`Acciones de ${column.name}`" title="Acciones de la lista" />
                </UDropdownMenu>
              </div>
            </header>
            <VueDraggable v-model="column.tasks" group="company-tasks" item-key="id" :animation="240" :force-fallback="true" :fallback-on-body="true" :swap-threshold="0.65" filter=".task-completion" :prevent-on-filter="false" class="flex min-h-12 flex-col gap-2 p-2" ghost-class="task-card-ghost" chosen-class="task-card-chosen" drag-class="task-card-drag" fallback-class="task-card-fallback" @move="onDragMove" @end="onDragEnd" @change="onTaskChange(column.id, $event)">
              <article v-for="task in column.tasks" :key="task.id" class="task-card group relative w-full rounded-lg border border-default bg-default p-3 text-left shadow-sm" role="button" tabindex="0" @click="openEditTask(task, column.id)" @keydown.enter.self.prevent="openEditTask(task, column.id)" @keydown.space.self.prevent="openEditTask(task, column.id)">
                <div class="task-completion-slot absolute left-3 top-3 z-10 flex size-5 items-center justify-center">
                    <button v-if="hasTaskPermission('tasks.update')" type="button" class="task-completion flex size-5 shrink-0 scale-75 items-center justify-center rounded-full border border-muted text-transparent opacity-0 transition-[opacity,transform,color,background-color,border-color] duration-200 ease-out hover:border-success hover:bg-success hover:text-white group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :class="task.completed_at ? 'task-completion-done scale-100 border-success bg-success text-white opacity-100' : ''" :aria-label="task.completed_at ? `Reabrir ${task.title}` : `Marcar ${task.title} como completada`" :title="task.completed_at ? 'Reabrir tarea' : 'Marcar tarea como completada'" :aria-pressed="!!task.completed_at" :disabled="completionTaskId === task.id" @click.stop="toggleTaskCompletion(task)">
                      <UIcon v-if="task.completed_at || completionTaskId === task.id" :name="completionTaskId === task.id ? 'i-lucide-loader-circle' : 'i-lucide-check'" class="size-3" :class="completionTaskId === task.id ? 'animate-spin text-muted' : ''" />
                      <UIcon v-else name="i-lucide-check" class="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100" />
                    </button>
                    <span v-else class="flex size-5 shrink-0 items-center justify-center rounded-full border" :class="task.completed_at ? 'border-success bg-success text-white' : 'border-muted text-transparent'" :aria-label="task.completed_at ? 'Completada' : 'Pendiente'"><UIcon v-if="task.completed_at" name="i-lucide-check" class="size-3" /></span>
                </div>
                <div class="min-w-0">
                    <div class="flex items-start justify-between gap-2"><p class="task-card-title min-w-0 flex-1 font-medium leading-snug" :class="task.completed_at ? 'text-muted line-through task-title-shifted' : hasTaskPermission('tasks.update') ? 'task-title-interactive' : ''">{{ task.title }}</p><UBadge class="shrink-0" :color="task.completed_at ? 'success' : priorityColor(task.priority)" variant="subtle" size="xs">{{ task.completed_at ? 'Completada' : priorityLabel(task.priority) }}</UBadge></div>
                <p v-if="task.description" class="mt-2 line-clamp-2 text-xs text-muted">{{ descriptionPreview(task.description) }}</p>
                <div v-if="task.labels?.length" class="mt-2 flex flex-wrap gap-1.5"><UBadge v-for="label in task.labels" :key="label.id" :color="labelColor(label.color)" variant="subtle" size="xs">{{ label.name }}</UBadge></div>
                <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span v-if="task.party" class="inline-flex min-w-0 items-center gap-1"><UIcon name="i-lucide-building-2" class="size-3.5 shrink-0"/><span class="max-w-36 truncate">{{ task.party.name }}</span></span>
                  <span v-if="task.assignee" class="inline-flex min-w-0 items-center gap-1"><UIcon name="i-lucide-user-round" class="size-3.5 shrink-0"/><span class="max-w-28 truncate">{{ task.assignee.name }}</span></span>
                  <span v-for="member in task.members?.slice(0, 2)" :key="member.user_id" class="inline-flex min-w-0 items-center gap-1" :title="`${member.name} · ${taskMemberRoleLabel(member.role)}`"><UIcon name="i-lucide-users-round" class="size-3.5 shrink-0"/><span class="max-w-24 truncate">{{ member.name }}</span></span>
                  <span v-if="(task.members?.length ?? 0) > 2" class="text-muted">+{{ (task.members?.length ?? 0) - 2 }}</span>
                  <span v-if="task.due_at" class="inline-flex items-center gap-1" :class="isOverdue(task) ? 'text-error' : ''"><UIcon name="i-lucide-calendar-clock" class="size-3.5"/>{{ formatDueDate(task.due_at) }}</span>
                  <span v-if="task.checklist_count" class="inline-flex items-center gap-1"><UIcon name="i-lucide-list-checks" class="size-3.5"/>{{ task.checklist_count }}</span>
                  <span v-if="task.comments_count" class="inline-flex items-center gap-1"><UIcon name="i-lucide-message-circle" class="size-3.5"/>{{ task.comments_count }}</span>
                </div>
                </div>
              </article>
              <div v-if="!column.tasks.length" class="flex items-center justify-center rounded-lg border border-dashed border-default px-3 py-8 text-center text-xs text-muted">Soltá una tarea acá o creá una nueva.</div>
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
          </section>
        <section v-if="hasTaskPermission('tasks.create')" class="flex min-h-20 w-[min(82vw,340px)] self-start flex-col rounded-xl border border-dashed border-default bg-elevated/20 p-2">
          <form v-if="showNewColumnForm" class="space-y-2" @submit.prevent="addColumn">
            <UInput v-model="newColumnName" autofocus maxlength="80" placeholder="Introduce el nombre de la lista…" class="w-full" />
            <div class="flex items-center gap-2"><UButton type="submit" label="Añadir lista" size="sm" :loading="creatingColumn" :disabled="!newColumnName.trim()"/><UButton type="button" icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Cancelar" @click="cancelNewColumn"/></div>
          </form>
          <UButton v-else label="Añade otra lista" icon="i-lucide-plus" color="neutral" variant="ghost" class="justify-start" @click="openNewColumnForm" />
        </section>
        </div>
      </div>
      <div v-else class="flex h-56 items-center justify-center text-sm text-muted">Seleccioná o creá un tablero.</div>
    </UPageCard>
    </div>
  </UPage>

  <UModal v-model:open="taskNotificationSettingsOpen" title="Avisos de tareas" description="Configurá la campanita y los avisos por WhatsApp." :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <label class="flex items-center gap-3"><USwitch v-model="taskNotificationSettings.in_app_enabled" :disabled="!taskNotificationSettingsLoaded" /><span><span class="block font-medium">Notificaciones en la campanita</span><span class="block text-sm text-muted">Asignaciones, miembros asociados, comentarios y nuevas menciones.</span></span></label>
          <UButton label="Guardar" icon="i-lucide-save" :loading="savingTaskNotificationSettings" :disabled="!taskNotificationSettingsLoaded" @click="saveTaskNotificationSettings" />
        </div>
        <UAlert v-if="taskNotificationSettingsError" color="warning" variant="subtle" title="No se pudo cargar la preferencia" :description="taskNotificationSettingsError" />
        <div class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-message-circle" class="mt-0.5 size-5 shrink-0" :class="whatsappModuleEnabled ? 'text-success' : 'text-muted'" />
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium">Avisos por WhatsApp</p>
                <UBadge :color="whatsappModuleEnabled ? 'success' : 'neutral'" variant="subtle">{{ whatsappModuleEnabled ? 'Módulo habilitado' : 'Módulo sin habilitar' }}</UBadge>
              </div>
              <p class="mt-1 text-sm text-muted">{{ whatsappModuleEnabled ? 'Configurá los avisos y cada usuario debe tener número y consentimiento activos.' : 'WhatsApp está disponible como módulo opcional para esta empresa.' }}</p>
            </div>
          </div>
          <UButton v-if="whatsappModuleEnabled" label="Configurar WhatsApp" icon="i-lucide-settings-2" color="neutral" variant="outline" to="/settings/whatsapp" />
          <UButton v-else-if="canManagePlatformModules" label="Habilitar WhatsApp" icon="i-lucide-puzzle" color="neutral" variant="outline" to="/settings/platform-plans" />
          <span v-else class="text-sm text-muted">Solicitá la activación al administrador de la plataforma.</span>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end"><UButton label="Cerrar" color="neutral" variant="outline" @click="taskNotificationSettingsOpen = false" /></div>
    </template>
  </UModal>

  <UModal v-model:open="showBoardModal" title="Crear tablero" description="Podés tener varios tableros por cliente o crear uno general para la empresa." :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Nombre del tablero" required><UInput v-model="boardForm.name" maxlength="120" placeholder="Ej.: Seguimiento comercial" class="w-full" /></UFormField>
        <UFormField label="Descripción"><UTextarea v-model="boardForm.description" maxlength="500" :rows="2" class="w-full" /></UFormField>
        <UFormField label="Cliente asociado" description="Podés crear varios tableros para el mismo cliente."><USelectMenu v-model="boardForm.party_id" :items="taskPartyOptions" value-key="value" searchable v-model:search-term="taskPartySearch" :loading="taskPartySearchLoading" class="w-full" /></UFormField>
        <UFormField label="Columnas iniciales" description="Una columna por línea; entre 2 y 12 columnas."><UTextarea v-model="boardForm.columns" :rows="5" class="w-full" /></UFormField>
      </div>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeBoardModal"/><UButton label="Crear tablero" icon="i-lucide-plus" :loading="saving" :disabled="boardForm.name.trim().length < 2" @click="createBoard"/></div></template>
  </UModal>

  <UModal v-model:open="showTaskModal" :title="selectedTask ? 'Detalle de la tarea' : 'Nueva tarea'" description="Organizá responsables, fechas, etiquetas y comentarios." :ui="{ content: 'sm:max-w-6xl' }">
    <template #body>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div class="flex max-h-[72vh] flex-col gap-5 overflow-y-auto pr-1">
          <div class="flex items-center gap-4">
            <button v-if="selectedTask" type="button" class="flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color,transform] duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60" :class="selectedTask.completed_at ? 'border-success bg-success text-white' : 'border-muted text-transparent hover:border-success hover:bg-success/15'" :aria-label="selectedTask.completed_at ? 'Reabrir tarea' : 'Marcar tarea como completada'" :aria-pressed="!!selectedTask.completed_at" :title="selectedTask.completed_at ? 'Reabrir tarea' : 'Marcar tarea como completada'" :disabled="!hasTaskPermission('tasks.update') || completionTaskId === selectedTask.id" @click="toggleTaskCompletion(selectedTask)"><UIcon v-if="completionTaskId === selectedTask.id" name="i-lucide-loader-circle" class="size-4 animate-spin text-muted"/><UIcon v-else-if="selectedTask.completed_at" name="i-lucide-check" class="size-4"/></button>
            <span v-else class="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-muted/60" aria-hidden="true" />
            <UInput v-model="taskForm.title" :disabled="!canEditTask" maxlength="200" placeholder="Título de la tarea" class="w-full text-lg font-semibold" />
          </div>

          <div v-if="canEditTask" class="flex flex-wrap gap-2">
            <UButton label="Cliente" icon="i-lucide-building-2" color="neutral" variant="outline" @click="toggleActionPanel('client')" />
            <UButton label="Añadir" icon="i-lucide-plus" color="neutral" variant="outline" @click="toggleActionPanel('add')" />
            <UButton label="Etiquetas" icon="i-lucide-tag" color="neutral" variant="outline" @click="toggleActionPanel('labels')" />
            <UButton label="Fechas" icon="i-lucide-clock-3" color="neutral" variant="outline" @click="toggleActionPanel('dates')" />
            <UButton v-if="selectedTask" label="Checklist" icon="i-lucide-list-checks" color="neutral" variant="outline" @click="toggleActionPanel('checklist')" />
            <UButton label="Miembros" icon="i-lucide-user-round-plus" color="neutral" variant="outline" @click="toggleActionPanel('members')" />
            <input v-if="selectedTask" ref="attachmentInput" type="file" class="hidden" :accept="attachmentAccept" :disabled="!canEditTask" @change="uploadTaskAttachment" />
          </div>
          <UBadge v-if="taskForm.party_id !== 'NONE'" color="neutral" variant="subtle" class="w-fit"><UIcon name="i-lucide-building-2" class="mr-1 size-3"/>{{ selectedTaskPartyOption?.label ?? selectedBoardParty?.name ?? 'Cliente asociado' }}</UBadge>
          <p v-if="selectedBoardParty" class="text-xs text-muted">El cliente está fijado por este tablero.</p>

          <UModal v-model:open="actionModalOpen" :title="actionPanelTitle" description="Configurá este dato sin salir del detalle de la tarea." :ui="{ content: 'sm:max-w-xl' }">
            <template #body>
            <div v-if="activeActionPanel === 'add'" class="grid gap-2 sm:grid-cols-2">
              <UButton label="Cliente" icon="i-lucide-building-2" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('client')" />
              <UButton label="Etiquetas" icon="i-lucide-tag" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('labels')" />
              <UButton label="Fechas" icon="i-lucide-clock-3" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('dates')" />
              <UButton v-if="selectedTask" label="Checklist" icon="i-lucide-list-checks" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('checklist')" />
              <UButton label="Miembros" icon="i-lucide-user-round-plus" color="neutral" variant="ghost" class="justify-start" @click="setActionPanel('members')" />
              <UButton v-if="selectedTask" label="Adjunto" icon="i-lucide-paperclip" color="neutral" variant="ghost" class="justify-start" :loading="uploadingAttachment" :disabled="!canEditTask" @click="attachmentInput?.click()" />
            </div>
            <div v-else-if="activeActionPanel === 'labels'" class="space-y-3">
              <div v-if="labels.length" class="grid gap-2 sm:grid-cols-2">
                <button v-for="label in labels" :key="label.id" type="button" class="flex items-center gap-2 rounded-lg border border-default p-2 text-left transition hover:bg-elevated" :disabled="!canEditTask" @click="toggleTaskLabel(label.id)">
                  <span class="flex size-5 items-center justify-center rounded border border-default" :class="taskForm.label_ids.includes(label.id) ? 'bg-primary text-white' : ''"><UIcon v-if="taskForm.label_ids.includes(label.id)" name="i-lucide-check" class="size-3"/></span>
                  <span class="h-5 flex-1 rounded px-2" :class="labelBackgroundClass(label.color)">{{ label.name }}</span>
                </button>
              </div>
              <p v-else class="text-sm text-muted">Todavía no hay etiquetas. Creá la primera abajo.</p>
              <div v-if="canEditTask" class="flex flex-wrap gap-2 border-t border-default pt-3">
                <UInput v-model="newLabelName" placeholder="Crear una etiqueta nueva" maxlength="50" class="min-w-0 flex-1" @keydown.enter.prevent="addLabel" />
                <USelectMenu v-model="newLabelColor" :items="labelColorOptions" value-key="value" class="w-32" aria-label="Color de etiqueta" />
                <UButton label="Crear" icon="i-lucide-plus" :loading="addingLabel" :disabled="!newLabelName.trim()" @click="addLabel" />
              </div>
            </div>
            <div v-else-if="activeActionPanel === 'dates'" class="grid gap-3 sm:grid-cols-2">
              <UFormField label="Fecha de inicio"><UInput v-model="taskForm.start_at" type="datetime-local" :disabled="!canEditTask" class="w-full" /></UFormField>
              <UFormField label="Fecha de vencimiento"><UInput v-model="taskForm.due_at" type="datetime-local" :disabled="!canEditTask" class="w-full" /></UFormField>
              <p class="text-xs text-muted sm:col-span-2">Las fechas se guardan al presionar “Guardar cambios”.</p>
            </div>
            <form v-else-if="activeActionPanel === 'checklist'" class="flex gap-2" @submit.prevent="createChecklist">
              <UInput v-model="checklistTitle" maxlength="120" placeholder="Título de la checklist" class="min-w-0 flex-1" :disabled="!canEditTask" />
              <UButton type="submit" label="Añadir" icon="i-lucide-plus" :disabled="!checklistTitle.trim() || !canEditTask" />
            </form>
            <div v-else-if="activeActionPanel === 'members'" class="space-y-2">
              <UFormField label="Responsable principal" description="Es la persona responsable de gestionar la tarea.">
              <USelectMenu v-model="taskForm.assigned_to" :items="memberOptions" value-key="value" searchable :disabled="!canEditTask" class="w-full" placeholder="Buscar miembros" />
              </UFormField>
              <div class="space-y-3 border-t border-default pt-3">
                <div>
                  <p class="text-sm font-medium">Miembros asociados</p>
                  <p class="text-xs text-muted">Sumá varias personas y definí su participación en esta tarea.</p>
                </div>
                <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                  <USelectMenu v-model="memberToAdd" :items="taskMemberOptions" value-key="value" searchable :disabled="!canEditTask || taskMemberOptions.length <= 1" class="w-full" placeholder="Buscar persona" />
                  <USelectMenu v-model="memberRoleToAdd" :items="taskMemberRoleOptions" value-key="value" :disabled="!canEditTask || memberToAdd === 'NONE'" class="w-full" aria-label="Rol en la tarea" />
                  <UButton label="Agregar" icon="i-lucide-user-round-plus" :disabled="!canEditTask || memberToAdd === 'NONE'" @click="addTaskMember" />
                </div>
                <div v-if="taskForm.members.length" class="divide-y divide-default rounded-lg border border-default px-3">
                  <div v-for="member in taskForm.members" :key="member.user_id" class="flex flex-wrap items-center gap-2 py-2.5">
                    <UIcon name="i-lucide-user-round" class="size-4 text-muted" />
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ members.find(person => person.id === member.user_id)?.name ?? 'Usuario de la empresa' }}</span>
                    <USelectMenu v-model="member.role" :items="taskMemberRoleOptions" value-key="value" :disabled="!canEditTask" class="w-36" aria-label="Rol del miembro" />
                    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" :disabled="!canEditTask" :aria-label="`Quitar ${members.find(person => person.id === member.user_id)?.name ?? 'miembro'}`" @click="removeTaskMember(member.user_id)" />
                  </div>
                </div>
                <p v-else class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Todavía no hay miembros asociados.</p>
                <p class="text-xs text-muted">Los roles organizan la participación en la tarea; los permisos de acceso siguen dependiendo del rol de la empresa.</p>
              </div>
            </div>
            <div v-else-if="activeActionPanel === 'client'" class="space-y-3">
              <UFormField label="Cliente asociado" :description="selectedBoardParty ? 'El cliente queda fijado por este tablero.' : 'Elegí un cliente para asociarlo a la tarea.'">
                <USelectMenu v-model="taskForm.party_id" :items="taskPartyOptions" value-key="value" searchable v-model:search-term="taskPartySearch" :loading="taskPartySearchLoading" :disabled="!!selectedBoardParty || !canEditTask" class="w-full" placeholder="Buscar cliente" />
              </UFormField>
              <p class="text-xs text-muted">El cliente seleccionado se guarda junto con la tarea.</p>
            </div>
            </template>
            <template #footer><div class="flex w-full justify-end"><UButton :label="activeActionPanel === 'add' ? 'Cerrar' : 'Listo'" icon="i-lucide-check" @click="closeActionPanel"/></div></template>
          </UModal>

          <div v-if="taskForm.label_ids.length" class="flex flex-wrap gap-2">
            <UBadge v-for="labelId in taskForm.label_ids" :key="labelId" :color="labelColor(labels.find(label => label.id === labelId)?.color ?? 'primary')" variant="subtle">{{ labels.find(label => label.id === labelId)?.name }}</UBadge>
          </div>
          <div v-if="taskForm.assigned_to !== 'NONE' || taskForm.members.length" class="space-y-1.5">
            <p class="text-xs font-medium text-muted">Personas asociadas</p>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-if="taskForm.assigned_to !== 'NONE'" color="primary" variant="subtle"><UIcon name="i-lucide-user-round-check" class="mr-1 size-3"/>{{ members.find(member => member.id === taskForm.assigned_to)?.name ?? 'Responsable principal' }} · Responsable</UBadge>
              <UBadge v-for="member in taskForm.members" :key="member.user_id" color="neutral" variant="subtle"><UIcon name="i-lucide-users-round" class="mr-1 size-3"/>{{ members.find(person => person.id === member.user_id)?.name ?? 'Miembro' }} · {{ taskMemberRoleLabel(member.role) }}</UBadge>
            </div>
          </div>
          <div v-if="taskForm.start_at || taskForm.due_at" class="flex flex-wrap gap-2 text-sm"><UBadge v-if="taskForm.start_at" color="neutral" variant="subtle">Inicio · {{ formatDueDate(taskForm.start_at) }}</UBadge><UBadge v-if="taskForm.due_at" :color="selectedTask && isOverdue(selectedTask) ? 'error' : 'neutral'" variant="subtle">Vence · {{ formatDueDate(taskForm.due_at) }}</UBadge></div>

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
                        <USelectMenu :model-value="item.assigned_to ?? 'NONE'" :items="memberOptions" value-key="value" searchable size="sm" class="w-full" aria-label="Responsable del elemento" @update:model-value="updateChecklistItem(item, { assigned_to: $event === 'NONE' ? null : $event }); checklistMemberOpen[item.id] = false" />
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

          <section v-if="selectedTask && attachments.length" class="space-y-3 border-t border-default pt-4">
            <div class="flex items-center gap-2"><UIcon name="i-lucide-paperclip" class="size-5 text-muted"/><h3 class="font-semibold">Adjuntos</h3><UBadge color="neutral" variant="subtle">{{ attachments.length }}</UBadge><UButton v-if="canEditTask" label="Añadir" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" class="ml-auto" :loading="uploadingAttachment" @click="attachmentInput?.click()"/></div>
            <article v-for="file in attachments" :key="file.id" class="flex min-w-0 items-center gap-3 rounded-lg border border-default p-2.5">
              <a :href="file.thumb_url || file.url" target="_blank" rel="noopener" class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-elevated" :aria-label="`Previsualizar ${file.file_name}`"><img v-if="file.thumb_url" :src="file.thumb_url" class="size-full object-cover"/><UIcon v-else :name="file.mime_type === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-image'" class="size-6 text-muted"/></a>
              <div class="min-w-0 flex-1"><a :href="file.url" target="_blank" rel="noopener" class="block truncate text-sm font-medium hover:text-primary">{{ file.file_name }}</a><p class="text-xs text-muted">{{ formatFileSize(file.file_size) }}</p></div>
              <UButton icon="i-lucide-eye" color="neutral" variant="ghost" size="sm" :to="file.url" target="_blank" :aria-label="`Ver ${file.file_name}`"/><UButton icon="i-lucide-download" color="neutral" variant="ghost" size="sm" :to="file.download_url" :aria-label="`Descargar ${file.file_name}`"/><UButton v-if="canEditTask" icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" :loading="attachmentDeletingId === file.id" :aria-label="`Quitar ${file.file_name}`" @click="removeAttachment(file.id)"/>
            </article>
          </section>

          <div class="grid gap-4 border-t border-default pt-4 sm:grid-cols-2">
            <UFormField label="Prioridad"><USelectMenu v-model="taskForm.priority" :items="priorityOptions" value-key="value" :disabled="!canEditTask" class="w-full" /></UFormField>
            <UFormField label="Lista"><USelectMenu v-model="taskForm.column_id" :items="board?.columns.map(column => ({ label: column.name, value: column.id })) ?? []" value-key="value" :disabled="!canEditTask" class="w-full" /></UFormField>
          </div>
          <div v-if="!selectedTask" class="grid gap-4 sm:grid-cols-3"><UFormField label="Responsable"><USelectMenu v-model="taskForm.assigned_to" :items="memberOptions" value-key="value" searchable :disabled="!canEditTask" class="w-full" /></UFormField><UFormField label="Inicio"><UInput v-model="taskForm.start_at" type="datetime-local" :disabled="!canEditTask" class="w-full" /></UFormField><UFormField label="Vencimiento"><UInput v-model="taskForm.due_at" type="datetime-local" :disabled="!canEditTask" class="w-full" /></UFormField></div>
        </div>

        <section class="flex max-h-[68vh] min-h-72 flex-col gap-3 border-t border-default pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-message-square-text" class="size-4" />Comentarios y actividad</div>
          <UTextarea v-if="selectedTask && hasTaskPermission('tasks.comment')" v-model="commentDraft" :rows="3" maxlength="5000" placeholder="Escribí un comentario…" />
          <div v-if="selectedTask && hasTaskPermission('tasks.comment')" class="flex justify-end"><UButton label="Publicar comentario" icon="i-lucide-send" size="sm" :loading="commentSaving" :disabled="!commentDraft.trim()" @click="addComment" /></div>
          <p v-else-if="!selectedTask" class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Guardá la tarea para iniciar la conversación.</p>
          <p v-else class="rounded-lg bg-elevated/40 p-3 text-sm text-muted">Tu rol permite consultar esta tarea, pero no agregar comentarios.</p>
          <div class="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-default p-3">
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

  <UModal v-model:open="showDeleteModal" title="Eliminar tarea" description="La tarea dejará de aparecer en los tableros de esta empresa.">
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeDeleteModal"/><UButton label="Eliminar tarea" color="error" icon="i-lucide-trash-2" :loading="deleting" @click="deleteTask"/></div></template>
  </UModal>

  <UModal v-model:open="showMoveTasksModal" title="Mover todas las tarjetas" :description="moveTasksFrom ? `Se moverán todas las tarjetas de “${moveTasksFrom.name}”, incluso las que el filtro actual no muestre.` : undefined" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <UFormField label="Lista de destino"><USelectMenu v-model="moveTasksTargetId" :items="board?.columns.filter(column => column.id !== moveTasksFrom?.id).map(column => ({ label: column.name, value: column.id })) ?? []" value-key="value" class="w-full"/></UFormField>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="outline" @click="closeMoveTasksModal"/><UButton label="Mover tarjetas" icon="i-lucide-list-end" :loading="movingAllTasks" :disabled="!moveTasksTargetId" @click="confirmMoveAllTasks"/></div></template>
  </UModal>

  <UModal v-model:open="showMoveColumnModal" title="Mover lista" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <UFormField label="Nueva ubicación"><USelectMenu v-model="moveColumnPosition" :items="columnMoveOptions" value-key="value" class="w-full"/></UFormField>
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

:deep(.task-card-title) {
  transition: transform 220ms ease-out;
}

:deep(.task-title-shifted) {
  transform: translateX(2rem);
}

:deep(.task-card:hover .task-title-interactive),
:deep(.task-card:focus-within .task-title-interactive) {
  transform: translateX(2rem);
}

@media (hover: none) {
  :deep(.task-title-interactive) {
    transform: translateX(2rem);
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
