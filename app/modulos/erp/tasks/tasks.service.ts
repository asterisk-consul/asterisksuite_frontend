export interface TaskMember {
  id: string
  name: string
}

export type TaskMemberRole = 'COLLABORATOR' | 'REVIEWER' | 'OBSERVER'

export interface TaskMemberAssignment {
  user_id: string
  name: string
  role: TaskMemberRole
}

export interface TaskMemberInput {
  user_id: string
  role: TaskMemberRole
}

export interface TaskParty {
  id: string
  name: string
}

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface TaskCategory extends TaskLabel {
  active: boolean
}

export interface TaskComment {
  id: string
  content: string
  created_at: string
  created_by: string
  author: TaskMember | null
}

export interface TaskRecord {
  id: string
  board_id?: string
  column_id?: string
  title: string
  description: string | null
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  assigned_to: string | null
  start_at?: string | null
  assignee?: TaskMember | null
  members?: TaskMemberAssignment[]
  due_at: string | null
  position: number
  created_at?: string
  updated_at?: string
  completed_at?: string | null
  party?: TaskParty | null
  labels?: TaskLabel[]
  category?: TaskCategory | null
  category_id?: string | null
  comments_count?: number
  checklist_count?: number
  board?: { name: string }
  column?: { name: string; is_closed: boolean }
}

export interface TaskColumn {
  id: string
  name: string
  position: number
  color: string | null
  is_closed: boolean
  is_pinned?: boolean
  is_watching?: boolean
  total_tasks?: number
  tasks: TaskRecord[]
  limited?: boolean
}

export interface TaskBoard {
  id: string
  name: string
  description: string | null
  party_id?: string | null
  category_id?: string | null
  party?: TaskParty | null
  is_default: boolean
  require_work_log_on_transition?: boolean
  allow_task_timer?: boolean
  task_timer_max_hours?: number
  columns?: TaskColumn[]
  _count?: { columns: number; tasks: number }
}

export interface TaskWorkLog {
  id: string
  user_id: string
  user_name: string
  minutes: number
  description: string | null
  created_at: string
}

export interface TaskWorkLogInput {
  minutes: number
  description?: string
}

export interface TaskActiveTimer {
  task_id: string
  task_title: string
  board_id: string
  board_name: string
  board_allows_timer: boolean
  max_timer_hours: number
  timer_key: string
  continuation_confirmed: boolean
  started_at: string | null
  elapsed_seconds: number
  paused: boolean
}

export interface SaveTaskInput {
  title?: string
  description?: string | null
  column_id?: string
  party_id?: string | null
  assigned_to?: string | null
  start_at?: string | null
  due_at?: string | null
  priority?: TaskRecord['priority']
  position?: number
  label_ids?: string[]
  members?: TaskMemberInput[]
  work_log?: TaskWorkLogInput
}

export interface TaskChecklistItem {
  id: string
  content: string
  completed: boolean
  position: number
  assigned_to: string | null
  due_at: string | null
}

export interface TaskNotificationSettings {
  in_app_enabled: boolean
  task_changes_enabled: boolean
}

export interface TaskChecklist {
  id: string
  title: string
  position: number
  items: TaskChecklistItem[]
}

export const useTasksService = () => ({
  getNotificationSettings: () => $fetch<TaskNotificationSettings>('/api/backend/erp/tasks/notification-settings'),
  saveNotificationSettings: (body: TaskNotificationSettings) => $fetch<TaskNotificationSettings>('/api/backend/erp/tasks/notification-settings', { method: 'PUT', body }),
  getBoards: () => $fetch<TaskBoard[]>('/api/backend/erp/tasks/boards'),
  createBoard: (body: { name: string; description?: string; party_id?: string | null; columns?: string[] }) =>
    $fetch<TaskBoard>('/api/backend/erp/tasks/boards', { method: 'POST', body }),
  updateBoardSettings: (id: string, body: { require_work_log_on_transition: boolean; allow_task_timer: boolean; task_timer_max_hours: number }) => $fetch<Pick<TaskBoard, 'id' | 'require_work_log_on_transition' | 'allow_task_timer' | 'task_timer_max_hours'>>(`/api/backend/erp/tasks/boards/${id}/settings`, { method: 'PATCH', body }),
  getBoard: (id: string, query?: Record<string, string | undefined>) => $fetch<TaskBoard & { columns: TaskColumn[] }>(`/api/backend/erp/tasks/boards/${id}`, {
    query,
  }),
  getTask: (id: string) => $fetch<TaskRecord>(`/api/backend/erp/tasks/${id}`),
  createColumn: (boardId: string, name: string) => $fetch<TaskColumn>(`/api/backend/erp/tasks/boards/${boardId}/columns`, { method: 'POST', body: { name } }),
  moveColumn: (id: string, position: number) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/columns/${id}/position`, { method: 'PATCH', body: { position } }),
  copyColumn: (id: string) => $fetch<TaskColumn & { copied_tasks: number }>(`/api/backend/erp/tasks/columns/${id}/copy`, { method: 'POST' }),
  moveAllTasks: (id: string, targetColumnId: string) => $fetch<{ moved_tasks: number }>(`/api/backend/erp/tasks/columns/${id}/move-tasks`, { method: 'POST', body: { target_column_id: targetColumnId } }),
  updateColumnPreferences: (id: string, body: { is_pinned?: boolean; is_watching?: boolean }) =>
    $fetch<{ is_pinned: boolean; is_watching: boolean }>(`/api/backend/erp/tasks/columns/${id}/preferences`, { method: 'PATCH', body }),
  getMembers: () => $fetch<TaskMember[]>('/api/backend/erp/tasks/members'),
  getLabels: () => $fetch<TaskLabel[]>('/api/backend/erp/tasks/labels'),
  getWorkLogs: (taskId: string) => $fetch<{ items: TaskWorkLog[]; total_minutes: number; limited: boolean }>(`/api/backend/erp/tasks/${taskId}/work-logs`),
  addWorkLog: (taskId: string, body: TaskWorkLogInput) => $fetch<TaskWorkLog>(`/api/backend/erp/tasks/${taskId}/work-logs`, { method: 'POST', body }),
  getActiveTimer: () => $fetch<TaskActiveTimer | null>('/api/backend/erp/tasks/timer/active'),
  startTimer: (taskId: string) => $fetch<TaskActiveTimer>(`/api/backend/erp/tasks/${taskId}/timer/start`, { method: 'POST' }),
  pauseTimer: () => $fetch<TaskActiveTimer>('/api/backend/erp/tasks/timer/pause', { method: 'PATCH' }),
  resumeTimer: () => $fetch<TaskActiveTimer>('/api/backend/erp/tasks/timer/resume', { method: 'PATCH' }),
  confirmTimerContinuation: () => $fetch<TaskActiveTimer>('/api/backend/erp/tasks/timer/continuation/confirm', { method: 'PATCH' }),
  finishTimer: (description?: string) => $fetch<{ success: boolean; work_log: { id: string; task_id: string; user_id: string; minutes: number; description: string | null; created_at: string } }>('/api/backend/erp/tasks/timer/finish', { method: 'POST', body: { description } }),
  createLabel: (body: { name: string; color: string }) => $fetch<TaskLabel>('/api/backend/erp/tasks/labels', { method: 'POST', body }),
  getCategories: () => $fetch<TaskCategory[]>('/api/backend/erp/tasks/categories'),
  createCategory: (body: { name: string; color: string }) => $fetch<TaskCategory>('/api/backend/erp/tasks/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: Partial<Pick<TaskCategory, 'name' | 'color' | 'active'>>) => $fetch<TaskCategory>(`/api/backend/erp/tasks/categories/${id}`, { method: 'PATCH', body }),
  getComments: (taskId: string) => $fetch<TaskComment[]>(`/api/backend/erp/tasks/${taskId}/comments`),
  createComment: (taskId: string, body: { content: string }) => $fetch<TaskComment>(`/api/backend/erp/tasks/${taskId}/comments`, { method: 'POST', body }),
  getChecklists: (taskId: string) => $fetch<TaskChecklist[]>(`/api/backend/erp/tasks/${taskId}/checklists`),
  createChecklist: (taskId: string, title: string) => $fetch<TaskChecklist>(`/api/backend/erp/tasks/${taskId}/checklists`, { method: 'POST', body: { title } }),
  deleteChecklist: (id: string) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/checklists/${id}`, { method: 'DELETE' }),
  createChecklistItem: (id: string, content: string) => $fetch<TaskChecklistItem>(`/api/backend/erp/tasks/checklists/${id}/items`, { method: 'POST', body: { content } }),
  updateChecklistItem: (id: string, body: Partial<Pick<TaskChecklistItem, 'content' | 'completed' | 'assigned_to' | 'due_at'>>) => $fetch<TaskChecklistItem>(`/api/backend/erp/tasks/checklist-items/${id}`, { method: 'PATCH', body }),
  deleteChecklistItem: (id: string) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/checklist-items/${id}`, { method: 'DELETE' }),
  convertChecklistItemToTask: (id: string) => $fetch<{ id: string }>(`/api/backend/erp/tasks/checklist-items/${id}/convert-to-task`, { method: 'POST' }),
  getByParty: (partyId: string, limit = 100) => $fetch<TaskRecord[]>(`/api/backend/erp/tasks/by-party/${partyId}`, { query: { limit } }),
  createTask: (boardId: string, body: SaveTaskInput & { title: string; column_id: string }) => $fetch<{ id: string }>(`/api/backend/erp/tasks/boards/${boardId}/tasks`, { method: 'POST', body }),
  updateTask: (id: string, body: SaveTaskInput) => $fetch<{ id: string }>(`/api/backend/erp/tasks/${id}`, { method: 'PATCH', body }),
  setTaskCompletion: (id: string, completed: boolean, work_log?: TaskWorkLogInput) => $fetch<{ success: boolean; completed: boolean; column_id: string; position?: number; completed_at: string | null }>(`/api/backend/erp/tasks/${id}/completion`, { method: 'PATCH', body: { completed, ...(work_log ? { work_log } : {}) } }),
  deleteTask: (id: string) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/${id}`, { method: 'DELETE' }),
})
