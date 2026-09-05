import { defineStore } from 'pinia'
import { useMaintenanceService } from '~/modulos/logistica/maintenance/service/maintenance.service'
import type {
  MaintenanceOrder,
  MaintenanceOrderStats,
  MaintenancePlan,
  Tire,
  CreateMaintenanceOrderInput,
  UpdateMaintenanceOrderInput,
  ChangeOrderStatusInput,
  CreateTireInput,
  UpdateTireInput,
  InstallTireInput,
  RemoveTireInput,
  RotateTireInput,
  RepairTireInput,
  ScrapTireInput,
  SellTireInput,
  CreateMaintenancePlanInput,
  UpdateMaintenancePlanInput,
  AssignPlanToAssetInput,
  CheckDueMaintenancesInput,
  FilterMaintenanceOrders,
  FilterTires,
  PaginatedResponse,
  DashboardOverview,
  UpcomingMaintenance,
} from '~/modulos/logistica/maintenance/types/maintenance.types'

export const useMaintenanceStore = defineStore('maintenance', () => {
  // ================= STATE =================
  const orders = ref<MaintenanceOrder[]>([])
  const currentOrder = ref<MaintenanceOrder | null>(null)
  const ordersTotal = ref(0)
  const ordersPage = ref(1)
  const ordersTotalPages = ref(1)

  const tires = ref<Tire[]>([])
  const currentTire = ref<Tire | null>(null)
  const tiresTotal = ref(0)
  const tiresPage = ref(1)
  const tiresTotalPages = ref(1)

  const plans = ref<MaintenancePlan[]>([])
  const currentPlan = ref<MaintenancePlan | null>(null)

  const stats = ref<MaintenanceOrderStats | null>(null)
  const tireStats = ref<any>(null)
  const dashboard = ref<DashboardOverview | null>(null)
  const upcomingMaintenances = ref<UpcomingMaintenance[]>([])
  const overdueMaintenances = ref<UpcomingMaintenance[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

  const service = useMaintenanceService()

  // ================= GETTERS =================

  const ordersByStatus = computed(() => {
    const grouped: Record<string, MaintenanceOrder[]> = {}
    for (const order of orders.value) {
      if (!grouped[order.status]) {
        grouped[order.status] = []
      }
      grouped[order.status].push(order)
    }
    return grouped
  })

  const activePlans = computed(() => plans.value.filter((p) => p.active))

  const tiresByStatus = computed(() => {
    const grouped: Record<string, Tire[]> = {}
    for (const tire of tires.value) {
      if (!grouped[tire.status]) {
        grouped[tire.status] = []
      }
      grouped[tire.status].push(tire)
    }
    return grouped
  })

  const getOrderById = (id: string) =>
    computed(() => orders.value.find((o) => o.id === id) ?? null)

  const getTireById = (id: string) =>
    computed(() => tires.value.find((t) => t.id === id) ?? null)

  // ================= ACTIONS =================

  // --- Orders ---

  const fetchOrders = async (filters?: FilterMaintenanceOrders) => {
    loading.value = true
    error.value = null

    try {
      const result: PaginatedResponse<MaintenanceOrder> = await service.getOrders(filters)
      orders.value = result.data
      ordersTotal.value = result.total
      ordersPage.value = result.page
      ordersTotalPages.value = result.totalPages
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  const fetchOrder = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const order = await service.getOrderById(id)
      currentOrder.value = order

      const index = orders.value.findIndex((o) => o.id === id)
      if (index !== -1) {
        orders.value[index] = order
      }

      return order
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createOrder = async (payload: CreateMaintenanceOrderInput) => {
    loading.value = true
    error.value = null
    console.log('[STORE] createOrder → service.createOrder', payload)

    try {
      const created = await service.createOrder(payload)
      console.log('[STORE] createOrder OK:', created)
      orders.value.unshift(created)
      return created
    } catch (err: any) {
      console.error('[STORE] createOrder error:', err)
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateOrder = async (id: string, payload: UpdateMaintenanceOrderInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.updateOrder(id, payload)

      const index = orders.value.findIndex((o) => o.id === id)
      if (index !== -1) {
        orders.value[index] = updated
      }

      if (currentOrder.value?.id === id) {
        currentOrder.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const changeOrderStatus = async (id: string, payload: ChangeOrderStatusInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.changeOrderStatus(id, payload)

      const index = orders.value.findIndex((o) => o.id === id)
      if (index !== -1) {
        orders.value[index] = updated
      }

      if (currentOrder.value?.id === id) {
        currentOrder.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteOrder = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      await service.deleteOrder(id)
      orders.value = orders.value.filter((o) => o.id !== id)

      if (currentOrder.value?.id === id) {
        currentOrder.value = null
      }
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // --- Tires ---

  const fetchTires = async (filters?: FilterTires) => {
    loading.value = true
    error.value = null

    try {
      const result: PaginatedResponse<Tire> = await service.getTires(filters)
      tires.value = result.data
      tiresTotal.value = result.total
      tiresPage.value = result.page
      tiresTotalPages.value = result.totalPages
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  const fetchTire = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const tire = await service.getTireById(id)
      currentTire.value = tire

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = tire
      }

      return tire
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createTire = async (payload: CreateTireInput) => {
    loading.value = true
    error.value = null

    try {
      const created = await service.createTire(payload)
      tires.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTire = async (id: string, payload: UpdateTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.updateTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const installTire = async (id: string, payload: InstallTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.installTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeTire = async (id: string, payload: RemoveTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.removeTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const rotateTire = async (id: string, payload: RotateTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.rotateTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const repairTire = async (id: string, payload: RepairTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.repairTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const scrapTire = async (id: string, payload: ScrapTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.scrapTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const sellTire = async (id: string, payload: SellTireInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.sellTire(id, payload)

      const index = tires.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tires.value[index] = updated
      }

      if (currentTire.value?.id === id) {
        currentTire.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTire = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      await service.deleteTire(id)
      tires.value = tires.value.filter((t) => t.id !== id)

      if (currentTire.value?.id === id) {
        currentTire.value = null
      }
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // --- Plans ---

  const fetchPlans = async () => {
    loading.value = true
    error.value = null

    try {
      plans.value = await service.getPlans()
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  const fetchPlan = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const plan = await service.getPlanById(id)
      currentPlan.value = plan

      const index = plans.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        plans.value[index] = plan
      }

      return plan
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createPlan = async (payload: CreateMaintenancePlanInput) => {
    loading.value = true
    error.value = null

    try {
      const created = await service.createPlan(payload)
      plans.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePlan = async (id: string, payload: UpdateMaintenancePlanInput) => {
    loading.value = true
    error.value = null

    try {
      const updated = await service.updatePlan(id, payload)

      const index = plans.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        plans.value[index] = updated
      }

      if (currentPlan.value?.id === id) {
        currentPlan.value = updated
      }

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePlan = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      await service.deletePlan(id)
      plans.value = plans.value.filter((p) => p.id !== id)

      if (currentPlan.value?.id === id) {
        currentPlan.value = null
      }
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // --- Dashboard & Stats ---

  const fetchStats = async () => {
    loading.value = true
    error.value = null

    try {
      stats.value = await service.getOrderStats()
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  const fetchDashboard = async () => {
    loading.value = true
    error.value = null

    try {
      dashboard.value = await service.getDashboardOverview()
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  const fetchUpcoming = async (limit?: number) => {
    loading.value = true
    error.value = null

    try {
      upcomingMaintenances.value = await service.getDashboardUpcoming(limit)
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  const fetchOverdue = async (limit?: number) => {
    loading.value = true
    error.value = null

    try {
      overdueMaintenances.value = await service.getDashboardOverdue(limit)
    } catch (err: any) {
      error.value = err?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  // --- Sub-entities: Tasks ---

  const fetchTasks = async (orderId: string) => {
    try {
      const tasks = await service.getTasks(orderId)
      if (currentOrder.value?.id === orderId) {
        currentOrder.value = { ...currentOrder.value, tasks } as any
      }
      return tasks
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    }
  }

  const createTask = async (orderId: string, payload: any) => {
    const task = await service.createTask(orderId, payload)
    if (currentOrder.value?.id === orderId) {
      currentOrder.value = { ...currentOrder.value, tasks: [...(currentOrder.value.tasks ?? []), task] } as any
    }
    return task
  }

  const updateTask = async (orderId: string, id: string, payload: any) => {
    const task = await service.updateTask(orderId, id, payload)
    if (currentOrder.value?.id === orderId) {
      const tasks = (currentOrder.value.tasks ?? []).map((t: any) => t.id === id ? task : t)
      currentOrder.value = { ...currentOrder.value, tasks } as any
    }
    return task
  }

  const deleteTask = async (orderId: string, id: string) => {
    await service.deleteTask(orderId, id)
    if (currentOrder.value?.id === orderId) {
      const tasks = (currentOrder.value.tasks ?? []).filter((t: any) => t.id !== id)
      currentOrder.value = { ...currentOrder.value, tasks } as any
    }
  }

  // --- Sub-entities: Parts ---

  const fetchParts = async (orderId: string) => {
    try {
      const parts = await service.getParts(orderId)
      if (currentOrder.value?.id === orderId) {
        currentOrder.value = { ...currentOrder.value, parts } as any
      }
      return parts
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    }
  }

  const createPart = async (orderId: string, payload: any) => {
    const part = await service.createPart(orderId, payload)
    if (currentOrder.value?.id === orderId) {
      currentOrder.value = { ...currentOrder.value, parts: [...(currentOrder.value.parts ?? []), part] } as any
    }
    return part
  }

  const updatePart = async (orderId: string, id: string, payload: any) => {
    const part = await service.updatePart(orderId, id, payload)
    if (currentOrder.value?.id === orderId) {
      const parts = (currentOrder.value.parts ?? []).map((p: any) => p.id === id ? part : p)
      currentOrder.value = { ...currentOrder.value, parts } as any
    }
    return part
  }

  const deletePart = async (orderId: string, id: string) => {
    await service.deletePart(orderId, id)
    if (currentOrder.value?.id === orderId) {
      const parts = (currentOrder.value.parts ?? []).filter((p: any) => p.id !== id)
      currentOrder.value = { ...currentOrder.value, parts } as any
    }
  }

  // --- Sub-entities: Labor ---

  const fetchLabor = async (orderId: string) => {
    try {
      const labor = await service.getLabor(orderId)
      if (currentOrder.value?.id === orderId) {
        currentOrder.value = { ...currentOrder.value, labor } as any
      }
      return labor
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    }
  }

  const createLabor = async (orderId: string, payload: any) => {
    const labor = await service.createLabor(orderId, payload)
    if (currentOrder.value?.id === orderId) {
      currentOrder.value = { ...currentOrder.value, labor: [...(currentOrder.value.labor ?? []), labor] } as any
    }
    return labor
  }

  const updateLabor = async (orderId: string, id: string, payload: any) => {
    const labor = await service.updateLabor(orderId, id, payload)
    if (currentOrder.value?.id === orderId) {
      const laborArr = (currentOrder.value.labor ?? []).map((l: any) => l.id === id ? labor : l)
      currentOrder.value = { ...currentOrder.value, labor: laborArr } as any
    }
    return labor
  }

  const deleteLabor = async (orderId: string, id: string) => {
    await service.deleteLabor(orderId, id)
    if (currentOrder.value?.id === orderId) {
      const labor = (currentOrder.value.labor ?? []).filter((l: any) => l.id !== id)
      currentOrder.value = { ...currentOrder.value, labor } as any
    }
  }

  // --- Sub-entities: Services ---

  const fetchServices = async (orderId: string) => {
    try {
      const services = await service.getServices(orderId)
      if (currentOrder.value?.id === orderId) {
        currentOrder.value = { ...currentOrder.value, services } as any
      }
      return services
    } catch (err: any) {
      error.value = err?.data?.message || err.message
      throw err
    }
  }

  const createServiceItem = async (orderId: string, payload: any) => {
    const svc = await service.createService(orderId, payload)
    if (currentOrder.value?.id === orderId) {
      currentOrder.value = { ...currentOrder.value, services: [...(currentOrder.value.services ?? []), svc] } as any
    }
    return svc
  }

  const updateServiceItem = async (orderId: string, id: string, payload: any) => {
    const svc = await service.updateService(orderId, id, payload)
    if (currentOrder.value?.id === orderId) {
      const services = (currentOrder.value.services ?? []).map((s: any) => s.id === id ? svc : s)
      currentOrder.value = { ...currentOrder.value, services } as any
    }
    return svc
  }

  const deleteServiceItem = async (orderId: string, id: string) => {
    await service.deleteService(orderId, id)
    if (currentOrder.value?.id === orderId) {
      const services = (currentOrder.value.services ?? []).filter((s: any) => s.id !== id)
      currentOrder.value = { ...currentOrder.value, services } as any
    }
  }

  // --- Utility ---

  const setCurrentOrder = (id: string | null) => {
    currentOrder.value = id ? (orders.value.find((o) => o.id === id) ?? null) : null
  }

  const setCurrentTire = (id: string | null) => {
    currentTire.value = id ? (tires.value.find((t) => t.id === id) ?? null) : null
  }

  const setCurrentPlan = (id: string | null) => {
    currentPlan.value = id ? (plans.value.find((p) => p.id === id) ?? null) : null
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // state
    orders,
    currentOrder,
    ordersTotal,
    ordersPage,
    ordersTotalPages,
    tires,
    currentTire,
    tiresTotal,
    tiresPage,
    tiresTotalPages,
    plans,
    currentPlan,
    stats,
    tireStats,
    dashboard,
    upcomingMaintenances,
    overdueMaintenances,
    loading,
    error,

    // getters
    ordersByStatus,
    activePlans,
    tiresByStatus,
    getOrderById,
    getTireById,

    // order actions
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    changeOrderStatus,
    deleteOrder,

    // tire actions
    fetchTires,
    fetchTire,
    createTire,
    updateTire,
    installTire,
    removeTire,
    rotateTire,
    repairTire,
    scrapTire,
    sellTire,
    deleteTire,

    // plan actions
    fetchPlans,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,

    // dashboard actions
    fetchStats,
    fetchDashboard,
    fetchUpcoming,
    fetchOverdue,

    // task actions
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,

    // part actions
    fetchParts,
    createPart,
    updatePart,
    deletePart,

    // labor actions
    fetchLabor,
    createLabor,
    updateLabor,
    deleteLabor,

    // service actions
    fetchServices,
    createServiceItem,
    updateServiceItem,
    deleteServiceItem,

    // utility
    setCurrentOrder,
    setCurrentTire,
    setCurrentPlan,
    clearError,
  }
})
