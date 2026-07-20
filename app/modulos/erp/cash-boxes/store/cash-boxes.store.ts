import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useCashBoxesService } from '~/modulos/erp/cash-boxes/service/cash-boxes.service'

import type {
  CashBox,
  CashBoxSession,
  CashBoxBalance,
  CashBoxUserRole,
  CreateCashBoxInput,
  UpdateCashBoxInput,
  OpenSessionInput,
  CloseSessionInput,
  ForceCloseSessionInput
} from '~/modulos/erp/cash-boxes/types/cash-boxes.types'

export const useCashBoxesStore = defineStore('cash-boxes', () => {
  const service = useCashBoxesService()

  const items = ref<CashBox[]>([])
  const current = ref<CashBox | null>(null)
  const mainBox = ref<CashBox | null>(null)
  const balances = ref<CashBoxBalance[]>([])
  const currentSession = ref<CashBoxSession | null>(null)
  const sessions = ref<CashBoxSession[]>([])

  const loading = ref(false)

  // =========================
  // COMPUTEDS
  // =========================

  const activeItems = computed(() =>
    items.value.filter((i) => i.active !== false)
  )

  const openBoxes = computed(() =>
    items.value.filter((i) => i.status === 'OPEN')
  )

  // =========================
  // LOAD ALL
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true
      items.value = await service.findAll()
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOAD ONE
  // =========================

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      const data = await service.findOne(id)
      current.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  // =========================
  // RESET
  // =========================

  const reset = () => {
    current.value = null
    currentSession.value = null
    sessions.value = []
    balances.value = []
  }

  // =========================
  // MAIN BOX
  // =========================

  const fetchMain = async () => {
    try {
      loading.value = true
      mainBox.value = await service.findMain()
      return mainBox.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // BALANCES
  // =========================

  const fetchBalances = async (id: string) => {
    try {
      loading.value = true
      balances.value = await service.getBalances(id)
      return balances.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // SESSIONS
  // =========================

  const fetchCurrentSession = async (id: string) => {
    try {
      loading.value = true
      currentSession.value = await service.getCurrentSession(id)
      return currentSession.value
    } finally {
      loading.value = false
    }
  }

  const fetchSessions = async (id: string) => {
    try {
      loading.value = true
      sessions.value = await service.getSessions(id)
      return sessions.value
    } finally {
      loading.value = false
    }
  }

  // =========================
  // SESSION ACTIONS
  // =========================

  const openSession = async (id: string, payload: OpenSessionInput) => {
    const session = await service.openSession(id, payload)
    currentSession.value = session

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index].current_session_id = session.id
      items.value[index].status = 'OPEN'
    }

    return session
  }

  const closeSession = async (id: string, payload: CloseSessionInput) => {
    const session = await service.closeSession(id, payload)
    currentSession.value = null

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index].current_session_id = null
      items.value[index].status = 'CLOSED'
    }

    return session
  }

  const forceCloseSession = async (id: string, payload: ForceCloseSessionInput) => {
    const session = await service.forceCloseSession(id, payload)
    currentSession.value = null

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index].current_session_id = null
      items.value[index].status = 'CLOSED'
    }

    return session
  }

  // =========================
  // CREATE
  // =========================

  const create = async (payload: CreateCashBoxInput) => {
    const created = await service.create(payload)
    items.value.push(created)
    return created
  }

  // =========================
  // UPDATE
  // =========================

  const update = async (id: string, payload: UpdateCashBoxInput) => {
    const updated = await service.update(id, payload)

    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      items.value[index] = updated
    }

    if (current.value?.id === id) {
      current.value = updated
    }

    return updated
  }

  // =========================
  // DELETE
  // =========================

  const remove = async (id: string) => {
    await service.remove(id)
    items.value = items.value.filter((i) => i.id !== id)

    if (current.value?.id === id) {
      current.value = null
    }
  }

  // =========================
  // USER ROLES
  // =========================

  const addUserRole = async (cashBoxId: string, userId: string, role: string) => {
    const userRole = await service.addUserRole(cashBoxId, userId, role)

    const index = items.value.findIndex((i) => i.id === cashBoxId)
    if (index !== -1) {
      const existing = items.value[index].user_roles?.find(r => r.user_id === userId)
      if (existing) {
        existing.role = userRole.role as any
      } else {
        if (!items.value[index].user_roles) items.value[index].user_roles = []
        items.value[index].user_roles.push(userRole)
      }
    }

    if (current.value?.id === cashBoxId) {
      const existing = current.value.user_roles?.find(r => r.user_id === userId)
      if (existing) {
        existing.role = userRole.role as any
      } else {
        if (!current.value.user_roles) current.value.user_roles = []
        current.value.user_roles.push(userRole)
      }
    }

    return userRole
  }

  const removeUserRole = async (cashBoxId: string, userId: string) => {
    await service.removeUserRole(cashBoxId, userId)

    const index = items.value.findIndex((i) => i.id === cashBoxId)
    if (index !== -1 && items.value[index].user_roles) {
      items.value[index].user_roles = items.value[index].user_roles!.filter(r => r.user_id !== userId)
    }

    if (current.value?.id === cashBoxId && current.value.user_roles) {
      current.value.user_roles = current.value.user_roles.filter(r => r.user_id !== userId)
    }
  }

  return {
    // state
    items,
    current,
    mainBox,
    balances,
    currentSession,
    sessions,
    loading,

    // computed
    activeItems,
    openBoxes,

    // actions
    fetchAll,
    fetchOne,
    fetchMain,
    fetchBalances,
    fetchCurrentSession,
    fetchSessions,
    openSession,
    closeSession,
    forceCloseSession,
    create,
    update,
    remove,
    addUserRole,
    removeUserRole,
    reset
  }
})
