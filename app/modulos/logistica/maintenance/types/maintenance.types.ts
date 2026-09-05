// ================= ENUMS =================

export enum MaintenanceAssetType {
  VEHICLE = 'VEHICLE',
  TIRE = 'TIRE',
  BATTERY = 'BATTERY',
  ENGINE = 'ENGINE',
  TRANSMISSION = 'TRANSMISSION',
  DIFFERENTIAL = 'DIFFERENTIAL',
  OTHER_COMPONENT = 'OTHER_COMPONENT',
}

export enum MaintenancePriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum MaintenanceStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  WAITING_SUPPLIER = 'WAITING_SUPPLIER',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MaintenanceType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
  PREDICTIVE = 'PREDICTIVE',
  INSPECTION = 'INSPECTION',
  SCHEDULED = 'SCHEDULED',
}

export enum MaintenanceCategory {
  ENGINE = 'ENGINE',
  TRANSMISSION = 'TRANSMISSION',
  BRAKES = 'BRAKES',
  SUSPENSION = 'SUSPENSION',
  STEERING = 'STEERING',
  ELECTRICAL = 'ELECTRICAL',
  COOLING = 'COOLING',
  LUBRICATION = 'LUBRICATION',
  TIRES = 'TIRES',
  BODY = 'BODY',
  LIGHTING = 'LIGHTING',
  TRAILER = 'TRAILER',
  OTHER = 'OTHER',
}

export enum MaintenanceTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum TireStatus {
  IN_STOCK = 'IN_STOCK',
  INSTALLED = 'INSTALLED',
  IN_REPAIR = 'IN_REPAIR',
  SCRAPPED = 'SCRAPPED',
  SOLD = 'SOLD',
}

export enum TireMovementType {
  PURCHASE = 'PURCHASE',
  RECEIPT = 'RECEIPT',
  TRANSFER = 'TRANSFER',
  INSTALLATION = 'INSTALLATION',
  REMOVAL = 'REMOVAL',
  ROTATION = 'ROTATION',
  REPAIR = 'REPAIR',
  RETREAD = 'RETREAD',
  WAREHOUSE_ENTRY = 'WAREHOUSE_ENTRY',
  WAREHOUSE_EXIT = 'WAREHOUSE_EXIT',
  SCRAP = 'SCRAP',
  SALE = 'SALE',
}

export enum TireLocationType {
  WAREHOUSE = 'WAREHOUSE',
  VEHICLE = 'VEHICLE',
  TIRE_SHOP = 'TIRE_SHOP',
  SCRAP = 'SCRAP',
  CUSTOMER = 'CUSTOMER',
}

export enum PlanIntervalType {
  INTERVAL_KM = 'INTERVAL_KM',
  INTERVAL_DAYS = 'INTERVAL_DAYS',
  INTERVAL_MONTHS = 'INTERVAL_MONTHS',
  FIXED_DATE = 'FIXED_DATE',
}

// ================= ENTITY TYPES =================

export interface MaintenanceTask {
  id: string
  maintenance_order_id: string
  description: string
  status: MaintenanceTaskStatus
  assigned_to?: string | null
  estimated_hours?: number | null
  actual_hours?: number | null
  notes?: string | null
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface MaintenancePart {
  id: string
  maintenance_order_id: string
  product_id: string
  warehouse_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  product?: { id: string; name: string; sku?: string; unit?: string }
}

export interface MaintenanceLabor {
  id: string
  maintenance_order_id: string
  employee_id: string
  description: string
  hours: number
  hourly_cost: number
  total_cost: number
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface MaintenanceServiceItem {
  id: string
  maintenance_order_id: string
  supplier_id: string
  description: string
  quantity: number
  unit_cost: number
  total_cost: number
  document_id?: string | null
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  supplier?: { id: string; name: string }
  document?: { id: string; number: string; document_type_id?: string }
}

export interface MaintenanceStatusHistory {
  id: string
  maintenance_order_id: string
  from_status: MaintenanceStatus | null
  to_status: MaintenanceStatus
  changed_by?: string | null
  comment?: string | null
  changed_at: string
  created_at?: string | null
}

export interface MaintenanceOrder {
  id: string
  company_id: string
  number: string
  asset_type: MaintenanceAssetType
  asset_id: string
  vehicle_id?: string | null
  tire_id?: string | null
  category: MaintenanceCategory
  maintenance_type: MaintenanceType
  priority: MaintenancePriority
  status: MaintenanceStatus
  title: string
  description?: string | null
  reported_problem?: string | null
  diagnosis?: string | null
  solution?: string | null
  scheduled_at?: string | null
  reported_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  odometer?: number | null
  reported_by?: string | null
  assigned_to?: string | null
  supplier_id?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
  parts_cost?: number | null
  labor_cost?: number | null
  services_cost?: number | null
  estimated_hours?: number | null
  vehicle_unavailable?: boolean
  unavailable_from?: string | null
  unavailable_until?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  active?: boolean
  tasks?: MaintenanceTask[]
  parts?: MaintenancePart[]
  labor?: MaintenanceLabor[]
  services?: MaintenanceServiceItem[]
  status_history?: MaintenanceStatusHistory[]
  vehicle?: { id: string; plate: string; brand?: string | null; model?: string | null; year?: number | null; type?: string } | null
  tire?: { id: string; serial_number: string; status?: TireStatus; product?: { id: string; name: string; sku?: string }; current_vehicle_id?: string | null; current_position_id?: string | null } | null
  supplier?: { id: string; name: string } | null
}

export interface MaintenanceOrderStats {
  total: number
  pending: number
  scheduled: number
  in_progress: number
  waiting_parts: number
  waiting_supplier: number
  completed: number
  cancelled: number
  critical: number
  high: number
  overdue: number
  this_month_cost: number
  this_year_cost: number
}

export interface Tire {
  id: string
  company_id: string
  product_id: string
  serial_number: string
  status: TireStatus
  purchase_document_id?: string | null
  purchase_document_line_id?: string | null
  purchase_date?: string | null
  purchase_supplier_id?: string | null
  purchase_unit_cost?: number | null
  purchase_receipt_document_id?: string | null
  purchase_order_id?: string | null
  current_vehicle_id?: string | null
  current_position_id?: string | null
  current_warehouse_id?: string | null
  current_tire_shop_id?: string | null
  accumulated_km?: number | null
  days_in_use?: number | null
  installation_count?: number
  vehicle_count?: number
  repair_count?: number
  retread_count?: number
  total_repair_cost?: number | null
  total_retread_cost?: number | null
  notes?: string | null
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  active?: boolean
  product?: { id: string; name: string; sku?: string }
  current_vehicle?: { id: string; plate: string; brand?: string | null; model?: string | null; type?: string } | null
  current_position?: { id: string; position_number: number; axle?: string | null; side?: string | null; position_type?: string | null } | null
  current_warehouse?: { id: string; name: string; code?: string } | null
  current_tire_shop?: { id: string; name: string } | null
  purchase_document?: { id: string; number: string; date?: string; total?: number } | null
  purchase_line?: { id: string; quantity?: number; price?: number } | null
  purchase_supplier?: { id: string; name: string } | null
  purchase_receipt?: { id: string; number: string; date?: string } | null
  purchase_order?: { id: string; number: string; date?: string } | null
  movements?: TireMovement[]
  positions_history?: TirePositionHistory[]
  maintenance_orders?: { id: string; number: string; title: string; status: MaintenanceStatus; reported_at?: string | null; completed_at?: string | null; actual_cost?: number | null; odometer?: number | null }[]
}

export interface TireMovement {
  id: string
  tire_id: string
  movement_type: TireMovementType
  date: string
  vehicle_id?: string | null
  position_id?: string | null
  odometer?: number | null
  from_location_id?: string | null
  to_location_id?: string | null
  from_location_type?: TireLocationType | null
  to_location_type?: TireLocationType | null
  reason?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string | null
  vehicle?: { id: string; plate: string } | null
  position?: { id: string; position_number: number; axle?: string | null; side?: string | null } | null
}

export interface TirePositionHistory {
  id: string
  tire_id: string
  position_id: string
  vehicle_id: string
  installed_at: string
  removed_at?: string | null
  installed_odometer?: number | null
  removed_odometer?: number | null
  created_by?: string | null
  created_at?: string | null
  position?: { id: string; position_number: number; axle?: string | null; side?: string | null } | null
  vehicle?: { id: string; plate: string; brand?: string | null; model?: string | null } | null
}

export interface VehicleTirePosition {
  id: string
  vehicle_id: string
  position_number: number
  axle?: string | null
  side?: string | null
  position_type?: string | null
  deleted_at?: string | null
  created_at?: string | null
  vehicle?: { id: string; plate: string; type?: string }
}

export interface MaintenancePlan {
  id: string
  company_id: string
  name: string
  description?: string | null
  asset_type: MaintenanceAssetType
  vehicle_type?: string | null
  category: MaintenanceCategory
  maintenance_type: MaintenanceType
  interval_type: PlanIntervalType
  interval_km?: number | null
  interval_days?: number | null
  interval_months?: number | null
  fixed_date?: string | null
  priority: MaintenancePriority
  estimated_hours?: number | null
  estimated_cost?: number | null
  default_tasks?: { description: string; estimated_hours?: number }[] | null
  active?: boolean
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  assets?: MaintenancePlanAsset[]
}

export interface MaintenancePlanAsset {
  id: string
  plan_id: string
  asset_id: string
  next_due_at?: string | null
  next_due_odometer?: number | null
  last_executed_at?: string | null
  active?: boolean
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
  plan?: { id: string; name: string }
}

// ================= DTO INPUTS (camelCase) =================

export interface CreateMaintenanceOrderInput {
  asset_type: MaintenanceAssetType
  asset_id: string
  vehicle_id?: string
  tire_id?: string
  category: MaintenanceCategory
  maintenance_type: MaintenanceType
  priority?: MaintenancePriority
  title: string
  description?: string
  reported_problem?: string
  scheduled_at?: string
  odometer?: number
  reported_by?: string
  assigned_to?: string
  supplier_id?: string
  estimated_cost?: number
  vehicle_unavailable?: boolean
  unavailable_from?: string
  unavailable_until?: string
  notes?: string
  tasks?: CreateMaintenanceTaskInput[]
  parts?: CreateMaintenancePartInput[]
  labor?: CreateMaintenanceLaborInput[]
  services?: CreateMaintenanceServiceInput[]
}

export interface CreateMaintenanceTaskInput {
  description: string
  assigned_to?: string
  estimated_hours?: number
  notes?: string
}

export interface CreateMaintenancePartInput {
  product_id: string
  warehouse_id: string
  quantity: number
  unit_cost: number
}

export interface CreateMaintenanceLaborInput {
  employee_id: string
  description: string
  hours: number
  hourly_cost: number
}

export interface CreateMaintenanceServiceInput {
  supplier_id: string
  description: string
  quantity: number
  unit_cost: number
  document_id?: string
}

export interface UpdateMaintenanceOrderInput {
  asset_type?: MaintenanceAssetType
  asset_id?: string
  vehicle_id?: string
  tire_id?: string
  category?: MaintenanceCategory
  maintenance_type?: MaintenanceType
  priority?: MaintenancePriority
  status?: MaintenanceStatus
  title?: string
  description?: string
  reported_problem?: string
  diagnosis?: string
  solution?: string
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  odometer?: number
  assigned_to?: string
  supplier_id?: string
  estimated_cost?: number
  vehicle_unavailable?: boolean
  unavailable_from?: string
  unavailable_until?: string
  notes?: string
  tasks?: CreateMaintenanceTaskInput[]
  parts?: CreateMaintenancePartInput[]
  labor?: CreateMaintenanceLaborInput[]
  services?: CreateMaintenanceServiceInput[]
}

export interface ChangeOrderStatusInput {
  to_status: MaintenanceStatus
  comment?: string
}

export interface BulkUpdateStatusInput {
  to_status: MaintenanceStatus
  ids: string[]
  comment?: string
}

export interface CreateTireInput {
  product_id: string
  serial_number: string
  purchase_document_id?: string
  purchase_document_line_id?: string
  purchase_date?: string
  purchase_supplier_id?: string
  purchase_unit_cost?: number
  purchase_receipt_document_id?: string
  purchase_order_id?: string
  current_warehouse_id?: string
}

export interface UpdateTireInput {
  status?: TireStatus
  current_warehouse_id?: string
  current_tire_shop_id?: string
  accumulated_km?: number
  days_in_use?: number
  notes?: string
}

export interface InstallTireInput {
  vehicle_id: string
  position_id: string
  odometer: number
  date?: string
}

export interface RemoveTireInput {
  to_location_type: TireLocationType
  to_location_id?: string
  odometer: number
  reason?: string
  date?: string
}

export interface RotateTireInput {
  new_position_id: string
  odometer: number
  date?: string
}

export interface RepairTireInput {
  supplier_id: string
  cost: number
  description: string
  document_id?: string
  odometer?: number
  is_retread?: boolean
  date?: string
}

export interface ScrapTireInput {
  reason: string
  date?: string
}

export interface SellTireInput {
  customer_id: string
  sale_price: number
  document_id?: string
  date?: string
}

export interface CreateMaintenancePlanInput {
  name: string
  description?: string
  asset_type: MaintenanceAssetType
  vehicle_type?: string
  category: MaintenanceCategory
  maintenance_type?: MaintenanceType
  interval_type: PlanIntervalType
  interval_km?: number
  interval_days?: number
  interval_months?: number
  fixed_date?: string
  priority?: MaintenancePriority
  estimated_hours?: number
  estimated_cost?: number
  default_tasks?: { description: string; estimated_hours?: number }[]
}

export interface UpdateMaintenancePlanInput {
  name?: string
  description?: string
  category?: MaintenanceCategory
  interval_type?: PlanIntervalType
  interval_km?: number
  interval_days?: number
  interval_months?: number
  fixed_date?: string
  priority?: MaintenancePriority
  estimated_hours?: number
  estimated_cost?: number
  default_tasks?: { description: string; estimated_hours?: number }[]
  active?: boolean
}

export interface AssignPlanToAssetInput {
  plan_id: string
  asset_id: string
}

// ================= FILTER DTOs =================

export interface FilterMaintenanceOrders {
  date_from?: string
  date_to?: string
  vehicle_id?: string
  tire_id?: string
  category?: MaintenanceCategory
  maintenance_type?: MaintenanceType
  priority?: MaintenancePriority
  status?: MaintenanceStatus
  supplier_id?: string
  assigned_to?: string
  asset_type?: MaintenanceAssetType
  asset_id?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface FilterTires {
  product_id?: string
  vehicle_id?: string
  warehouse_id?: string
  tire_shop_id?: string
  status?: TireStatus
  serial_number?: string
  page?: number
  limit?: number
}

// ================= PAGINATION RESPONSES =================

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ================= DASHBOARD TYPES =================

export interface DashboardOverview {
  orders: {
    by_status: Record<string, number>
    by_priority: Record<string, number>
    pending: number
    critical: number
    high_priority: number
    in_progress: number
    waiting_parts: number
    overdue: number
  }
  costs: {
    this_month: number
    this_year: number
  }
  fleet: {
    total_vehicles: number
    in_maintenance: number
    out_of_service: number
    available: number
  }
}

export interface UpcomingMaintenance {
  id: string
  number: string
  title: string
  status: MaintenanceStatus
  priority: MaintenancePriority
  scheduled_at: string | null
  vehicle?: { id: string; plate: string; brand?: string | null; model?: string | null } | null
  tire?: { id: string; serial_number: string; product?: { name: string } } | null
}

export interface TireStats {
  total: number
  in_stock: number
  installed: number
  in_repair: number
  scrapped: number
  sold: number
  total_purchase_cost: number
  total_repair_cost: number
  total_retread_cost: number
}

// ================= REPORT TYPES =================

export interface ReportByVehicle {
  vehicle: { id: string; plate: string; brand?: string | null; model?: string | null } | null
  total_orders: number
  total_cost: number
  by_category: Record<string, { count: number; cost: number }>
  by_type: Record<string, { count: number; cost: number }>
  downtime_hours: number
}

export interface ReportCostsByVehicle {
  vehicle: { id: string; plate: string; brand?: string | null; model?: string | null } | null
  engine: number
  transmission: number
  brakes: number
  suspension: number
  steering: number
  electrical: number
  cooling: number
  lubrication: number
  tires: number
  body: number
  lighting: number
  trailer: number
  other: number
  total: number
}

export interface ReportByCategory {
  total: number
  by_category: Record<string, { count: number; cost: number; percentage: number }>
}

export interface ReportByPeriod {
  period: string
  count: number
  cost: number
}

export interface PendingSummary {
  critical: number
  high: number
  overdue: number
  upcoming: number
}

export interface TireByPosition {
  position: number
  count: number
  total_km: number
  avg_km: number
}

export interface VehicleAvailability {
  vehicle: { id: string; plate: string; brand?: string | null; model?: string | null }
  maintenance_count: number
  hours_out_of_service: number
  avg_hours_per_maintenance: number
  availability_percentage: number
}

export interface CheckDueMaintenancesInput {
  vehicle_id?: string
  as_of_date?: string
}
