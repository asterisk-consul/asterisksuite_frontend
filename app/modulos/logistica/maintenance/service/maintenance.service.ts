import type {
  MaintenanceOrder,
  MaintenanceOrderStats,
  MaintenancePlan,
  Tire,
  CreateMaintenanceOrderInput,
  UpdateMaintenanceOrderInput,
  ChangeOrderStatusInput,
  BulkUpdateStatusInput,
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
  ReportByVehicle,
  ReportCostsByVehicle,
  ReportByCategory,
  ReportByPeriod,
  PendingSummary,
  TireByPosition,
  VehicleAvailability,
} from '~/modulos/logistica/maintenance/types/maintenance.types'

export const useMaintenanceService = () => {
  const ordersBaseUrl = '/api/logistica/maintenance/orders'
  const tiresBaseUrl = '/api/logistica/maintenance/tires'
  const plansBaseUrl = '/api/logistica/maintenance/plans'
  const dashboardBaseUrl = '/api/logistica/maintenance/dashboard'
  const reportsBaseUrl = '/api/logistica/maintenance/reports'

  // ================= ORDERS =================

  const getOrders = (filters?: FilterMaintenanceOrders) =>
    $fetch<PaginatedResponse<MaintenanceOrder>>(`${ordersBaseUrl}`, {
      params: filters as Record<string, any>,
    })

  const getOrderById = (id: string) =>
    $fetch<MaintenanceOrder>(`${ordersBaseUrl}/${id}`)

  const createOrder = async (body: CreateMaintenanceOrderInput) => {
    console.log('[SERVICE] POST', ordersBaseUrl, body)
    try {
      const result = await $fetch<MaintenanceOrder>(`${ordersBaseUrl}`, {
        method: 'POST',
        body,
      })
      console.log('[SERVICE] createOrder OK:', result)
      return result
    } catch (err) {
      console.error('[SERVICE] createOrder error:', err)
      throw err
    }
  }

  const updateOrder = (id: string, body: UpdateMaintenanceOrderInput) =>
    $fetch<MaintenanceOrder>(`${ordersBaseUrl}/${id}`, {
      method: 'PATCH',
      body,
    })

  const changeOrderStatus = (id: string, body: ChangeOrderStatusInput) =>
    $fetch<MaintenanceOrder>(`${ordersBaseUrl}/${id}/status`, {
      method: 'PATCH',
      body,
    })

  const bulkChangeOrderStatus = (body: BulkUpdateStatusInput) =>
    $fetch<{ updated: number }>(`${ordersBaseUrl}/bulk/status`, {
      method: 'PATCH',
      body,
    })

  const deleteOrder = (id: string) =>
    $fetch<void>(`${ordersBaseUrl}/${id}`, {
      method: 'DELETE',
    })

  const getOrderStats = () =>
    $fetch<MaintenanceOrderStats>(`${ordersBaseUrl}/stats`)

  // ================= TIRES =================

  const getTires = (filters?: FilterTires) =>
    $fetch<PaginatedResponse<Tire>>(`${tiresBaseUrl}`, {
      params: filters as Record<string, any>,
    })

  const getTireById = (id: string) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}`)

  const createTire = (body: CreateTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}`, {
      method: 'POST',
      body,
    })

  const createTireFromPurchase = (purchaseLineId: string, serialNumbers: string[]) =>
    $fetch<Tire[]>(`${tiresBaseUrl}/from-purchase-line/${purchaseLineId}`, {
      method: 'POST',
      body: { serial_numbers: serialNumbers },
    })

  const updateTire = (id: string, body: UpdateTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}`, {
      method: 'PATCH',
      body,
    })

  const installTire = (id: string, body: InstallTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}/install`, {
      method: 'POST',
      body,
    })

  const removeTire = (id: string, body: RemoveTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}/remove`, {
      method: 'POST',
      body,
    })

  const rotateTire = (id: string, body: RotateTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}/rotate`, {
      method: 'POST',
      body,
    })

  const repairTire = (id: string, body: RepairTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}/repair`, {
      method: 'POST',
      body,
    })

  const scrapTire = (id: string, body: ScrapTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}/scrap`, {
      method: 'POST',
      body,
    })

  const sellTire = (id: string, body: SellTireInput) =>
    $fetch<Tire>(`${tiresBaseUrl}/${id}/sell`, {
      method: 'POST',
      body,
    })

  const deleteTire = (id: string) =>
    $fetch<void>(`${tiresBaseUrl}/${id}`, {
      method: 'DELETE',
    })

  // ================= PLANS =================

  const getPlans = () =>
    $fetch<MaintenancePlan[]>(`${plansBaseUrl}`)

  const getPlanById = (id: string) =>
    $fetch<MaintenancePlan>(`${plansBaseUrl}/${id}`)

  const createPlan = (body: CreateMaintenancePlanInput) =>
    $fetch<MaintenancePlan>(`${plansBaseUrl}`, {
      method: 'POST',
      body,
    })

  const updatePlan = (id: string, body: UpdateMaintenancePlanInput) =>
    $fetch<MaintenancePlan>(`${plansBaseUrl}/${id}`, {
      method: 'PATCH',
      body,
    })

  const assignPlanToAsset = (id: string, body: AssignPlanToAssetInput) =>
    $fetch<any>(`${plansBaseUrl}/${id}/assign`, {
      method: 'POST',
      body,
    })

  const unassignPlanFromAsset = (planId: string, assetId: string) =>
    $fetch<void>(`${plansBaseUrl}/${planId}/assign/${assetId}`, {
      method: 'DELETE',
    })

  const checkDueMaintenances = (body: CheckDueMaintenancesInput) =>
    $fetch<any[]>(`${plansBaseUrl}/check-due`, {
      method: 'POST',
      body,
    })

  const generateDueOrders = (body: CheckDueMaintenancesInput) =>
    $fetch<{ generated: number; orders: MaintenanceOrder[] }>(`${plansBaseUrl}/generate-due`, {
      method: 'POST',
      body,
    })

  const deletePlan = (id: string) =>
    $fetch<void>(`${plansBaseUrl}/${id}`, {
      method: 'DELETE',
    })

  // ================= DASHBOARD =================

  const getDashboardOverview = async () => {
    console.log('[SERVICE] GET', dashboardBaseUrl)
    try {
      const result = await $fetch<DashboardOverview>(`${dashboardBaseUrl}`)
      console.log('[SERVICE] Dashboard OK:', result)
      return result
    } catch (err) {
      console.error('[SERVICE] Dashboard error:', err)
      throw err
    }
  }

  const getDashboardUpcoming = (limit?: number) =>
    $fetch<UpcomingMaintenance[]>(`${dashboardBaseUrl}/upcoming`, {
      params: limit ? { limit } : undefined,
    })

  const getDashboardOverdue = (limit?: number) =>
    $fetch<UpcomingMaintenance[]>(`${dashboardBaseUrl}/overdue`, {
      params: limit ? { limit } : undefined,
    })

  // ================= REPORTS =================

  const getReportByVehicle = (params?: { vehicle_id?: string; date_from?: string; date_to?: string }) =>
    $fetch<ReportByVehicle[]>(`${reportsBaseUrl}/by-vehicle`, {
      params: params as Record<string, any>,
    })

  const getReportCostsByVehicle = (params?: { date_from?: string; date_to?: string }) =>
    $fetch<ReportCostsByVehicle[]>(`${reportsBaseUrl}/costs-by-vehicle`, {
      params: params as Record<string, any>,
    })

  const getReportByCategory = (params?: { date_from?: string; date_to?: string }) =>
    $fetch<ReportByCategory>(`${reportsBaseUrl}/by-category`, {
      params: params as Record<string, any>,
    })

  const getReportByPeriod = (params: { date_from: string; date_to: string; group_by?: 'day' | 'week' | 'month' | 'year' }) =>
    $fetch<ReportByPeriod[]>(`${reportsBaseUrl}/by-period`, {
      params: params as Record<string, any>,
    })

  const getReportPendingSummary = () =>
    $fetch<PendingSummary>(`${reportsBaseUrl}/pending-summary`)

  const getReportTire = (params?: { tire_id?: string; date_from?: string; date_to?: string }) =>
    $fetch<any[]>(`${reportsBaseUrl}/tires`, {
      params: params as Record<string, any>,
    })

  const getReportTirePerformance = (params?: { brand?: string; model?: string; supplier_id?: string; position_number?: string; vehicle_id?: string }) =>
    $fetch<any[]>(`${reportsBaseUrl}/tire-performance`, {
      params: params as Record<string, any>,
    })

  const getReportTireByPosition = (params?: { vehicle_type?: string }) =>
    $fetch<TireByPosition[]>(`${reportsBaseUrl}/tire-by-position`, {
      params: params as Record<string, any>,
    })

  const getReportAvailability = (params: { date_from: string; date_to: string }) =>
    $fetch<VehicleAvailability[]>(`${reportsBaseUrl}/availability`, {
      params: params as Record<string, any>,
    })

  // ================= TASKS =================

  const getTasks = (orderId: string) =>
    $fetch<any[]>(`${ordersBaseUrl}/${orderId}/tasks`)

  const createTask = (orderId: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/tasks`, { method: 'POST', body })

  const updateTask = (orderId: string, id: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/tasks/${id}`, { method: 'PATCH', body })

  const deleteTask = (orderId: string, id: string) =>
    $fetch<void>(`${ordersBaseUrl}/${orderId}/tasks/${id}`, { method: 'DELETE' })

  // ================= PARTS =================

  const getParts = (orderId: string) =>
    $fetch<any[]>(`${ordersBaseUrl}/${orderId}/parts`)

  const createPart = (orderId: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/parts`, { method: 'POST', body })

  const updatePart = (orderId: string, id: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/parts/${id}`, { method: 'PATCH', body })

  const deletePart = (orderId: string, id: string) =>
    $fetch<void>(`${ordersBaseUrl}/${orderId}/parts/${id}`, { method: 'DELETE' })

  // ================= LABOR =================

  const getLabor = (orderId: string) =>
    $fetch<any[]>(`${ordersBaseUrl}/${orderId}/labor`)

  const createLabor = (orderId: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/labor`, { method: 'POST', body })

  const updateLabor = (orderId: string, id: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/labor/${id}`, { method: 'PATCH', body })

  const deleteLabor = (orderId: string, id: string) =>
    $fetch<void>(`${ordersBaseUrl}/${orderId}/labor/${id}`, { method: 'DELETE' })

  // ================= SERVICES =================

  const getServices = (orderId: string) =>
    $fetch<any[]>(`${ordersBaseUrl}/${orderId}/services`)

  const createService = (orderId: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/services`, { method: 'POST', body })

  const updateService = (orderId: string, id: string, body: any) =>
    $fetch<any>(`${ordersBaseUrl}/${orderId}/services/${id}`, { method: 'PATCH', body })

  const deleteService = (orderId: string, id: string) =>
    $fetch<void>(`${ordersBaseUrl}/${orderId}/services/${id}`, { method: 'DELETE' })

  return {
    // Orders
    getOrders,
    getOrderById,
    createOrder,
    updateOrder,
    changeOrderStatus,
    bulkChangeOrderStatus,
    deleteOrder,
    getOrderStats,
    // Tires
    getTires,
    getTireById,
    createTire,
    createTireFromPurchase,
    updateTire,
    installTire,
    removeTire,
    rotateTire,
    repairTire,
    scrapTire,
    sellTire,
    deleteTire,
    // Plans
    getPlans,
    getPlanById,
    createPlan,
    updatePlan,
    assignPlanToAsset,
    unassignPlanFromAsset,
    checkDueMaintenances,
    generateDueOrders,
    deletePlan,
    // Dashboard
    getDashboardOverview,
    getDashboardUpcoming,
    getDashboardOverdue,
    // Reports
    getReportByVehicle,
    getReportCostsByVehicle,
    getReportByCategory,
    getReportByPeriod,
    getReportPendingSummary,
    getReportTire,
    getReportTirePerformance,
    getReportTireByPosition,
    getReportAvailability,
    // Tasks
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    // Parts
    getParts,
    createPart,
    updatePart,
    deletePart,
    // Labor
    getLabor,
    createLabor,
    updateLabor,
    deleteLabor,
    // Services
    getServices,
    createService,
    updateService,
    deleteService,
  }
}
