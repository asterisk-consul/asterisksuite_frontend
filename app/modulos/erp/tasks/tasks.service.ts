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
  party?: TaskParty | null
  is_default: boolean
  columns?: TaskColumn[]
  _count?: { columns: number; tasks: number }
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
  getBoard: (id: string, partyId?: string) => $fetch<TaskBoard & { columns: TaskColumn[] }>(`/api/backend/erp/tasks/boards/${id}`, {
    query: partyId ? { party_id: partyId } : undefined,
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
  createLabel: (body: { name: string; color: string }) => $fetch<TaskLabel>('/api/backend/erp/tasks/labels', { method: 'POST', body }),
  getComments: (taskId: string) => $fetch<TaskComment[]>(`/api/backend/erp/tasks/${taskId}/comments`),
  createComment: (taskId: string, body: { content: string }) => $fetch<TaskComment>(`/api/backend/erp/tasks/${taskId}/comments`, { method: 'POST', body }),
  getChecklists: (taskId: string) => $fetch<TaskChecklist[]>(`/api/backend/erp/tasks/${taskId}/checklists`),
  createChecklist: (taskId: string, title: string) => $fetch<TaskChecklist>(`/api/backend/erp/tasks/${taskId}/checklists`, { method: 'POST', body: { title } }),
  deleteChecklist: (id: string) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/checklists/${id}`, { method: 'DELETE' }),
  createChecklistItem: (id: string, content: string) => $fetch<TaskChecklistItem>(`/api/backend/erp/tasks/checklists/${id}/items`, { method: 'POST', body: { content } }),
  updateChecklistItem: (id: string, body: Partial<Pick<TaskChecklistItem, 'content' | 'completed' | 'assigned_to' | 'due_at'>>) => $fetch<TaskChecklistItem>(`/api/backend/erp/tasks/checklist-items/${id}`, { method: 'PATCH', body }),
  deleteChecklistItem: (id: string) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/checklist-items/${id}`, { method: 'DELETE' }),
  getByParty: (partyId: string, limit = 100) => $fetch<TaskRecord[]>(`/api/backend/erp/tasks/by-party/${partyId}`, { query: { limit } }),
  createTask: (boardId: string, body: SaveTaskInput & { title: string; column_id: string }) => $fetch<{ id: string }>(`/api/backend/erp/tasks/boards/${boardId}/tasks`, { method: 'POST', body }),
  updateTask: (id: string, body: SaveTaskInput) => $fetch<{ id: string }>(`/api/backend/erp/tasks/${id}`, { method: 'PATCH', body }),
  setTaskCompletion: (id: string, completed: boolean) => $fetch<{ success: boolean; completed: boolean; column_id: string; position?: number; completed_at: string | null }>(`/api/backend/erp/tasks/${id}/completion`, { method: 'PATCH', body: { completed } }),
  deleteTask: (id: string) => $fetch<{ success: boolean }>(`/api/backend/erp/tasks/${id}`, { method: 'DELETE' }),
})
