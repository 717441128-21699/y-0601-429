export interface Archive {
  id: string
  archive_number: string
  title: string
  type: string
  secrecy_level: string
  carrier_material: string
  fonds: string | null
  year: string | null
  department: string | null
  description: string | null
  status: '在库' | '借出' | '锁定'
  warehouse_id: string
  warehouse_name: string
  shelf_id: string
  shelf_code: string
  barcode: string
  created_at: string
}

export interface ArchiveCreateInput {
  title: string
  type: string
  secrecyLevel: string
  carrierMaterial: string
  fonds?: string
  year?: string
  department?: string
  description?: string
}

export interface ArchiveCreateResult {
  id: string
  archiveNumber: string
  warehouseId: string
  warehouseName: string
  shelfId: string
  shelfPosition: string
  barcode: string
}

export interface ArchiveUpdateInput {
  title?: string
  type?: string
  secrecyLevel?: string
  carrierMaterial?: string
  fonds?: string
  year?: string
  department?: string
  description?: string
  status?: string
}

export interface Borrow {
  id: string
  archive_id: string
  archive_title: string
  archive_number: string
  user_id: string
  user_name: string
  user_department: string
  purpose: string | null
  borrow_type: '阅览' | '外借' | '复制'
  appointment_time: string | null
  expected_return: string | null
  actual_return: string | null
  status: '待审批' | '已通过' | '已拒绝' | '借出中' | '已归还' | '已超期'
  approval_result: string | null
  overdue_fee: number
  warehouse_name: string | null
  shelf_code: string | null
  shelf_position: string | null
  created_at: string
}

export interface BorrowCreateInput {
  archiveId: string
  userId: string
  purpose: string
  borrowType: string
  appointmentTime?: string
  expectedReturnDate?: string
}

export interface BorrowCreateResult {
  id: string
  status: string
  approvalResult: string | null
  autoApproved: boolean
}

export interface RemindResult {
  borrowId: string
  overdueDays: number
  overdueFee: number
  message: string
}

export interface RealtimeEnvironmentData {
  warehouseId: string
  warehouseName: string
  temperature: number | null
  humidity: number | null
  lightIntensity: number | null
  harmfulGas: number | null
  recordedAt: string | null
  runningEquipment: number
}

export interface EnvironmentData {
  warehouse_id: string
  temperature: number
  humidity: number
  light_intensity: number
  harmful_gas: number
  recorded_at: string
}

export interface Threshold {
  id: string
  warehouse_id: string
  warehouse_name?: string
  parameter: string
  min_value: number
  max_value: number
}

export interface Alert {
  id: string
  warehouse_id: string
  warehouse_name: string
  type: string
  parameter: string
  value: number
  threshold: number
  status: '未处理' | '处理中' | '已解决'
  triggered_at: string
  resolved_at: string | null
}

export interface Equipment {
  id: string
  name: string
  type: string
  warehouse_id: string
  warehouse_name: string
  running_hours: number
  switch_count: number
  status: '运行中' | '停机' | '维修中'
  last_maintenance: string | null
}

export interface MaintenanceOrder {
  id: string
  equipment_id: string
  equipment_name: string
  equipment_type?: string
  type: string
  description: string
  team_id: string | null
  team_name: string | null
  priority?: string
  status: '待处理' | '进行中' | '已完成'
  created_at: string
  completed_at: string | null
}

export interface SparePart {
  id: string
  name: string
  specification: string
  quantity: number
  safety_stock: number
  warehouse_id: string
  warehouse_name?: string
}

export interface MaintenanceTeam {
  id: string
  name: string
  members: number
  specialty: string
}

export interface Overview {
  totalArchives: number
  inStock: number
  borrowed: number
  alertCount: number
  overdueBorrows: number
  pendingApprovals: number
  lowStockParts: number
  maintenancePending: number
  recentAlerts: Alert[]
  recentBorrows: Borrow[]
}

export interface BorrowStatItem {
  group_key: string
  label: string
  borrow_count: number
  borrower_count: number
  overdue_count: number
  total_overdue_fee: number
}

export interface BorrowingStats {
  stats: BorrowStatItem[]
  total: number
  monthlyTrend: { month: string; count: number }[]
}

export interface UtilizationStats {
  totalArchives: number
  borrowedArchives: number
  inStockArchives: number
  utilizationRate: number
  typeStats: { type: string; total: number; borrowed: number; in_stock: number }[]
  warehouseUtilization: { id: string; name: string; capacity: number; used: number; utilization_rate: number }[]
}

export interface WarehouseCapacityItem {
  id: string
  name: string
  location: string
  capacity: number
  used: number
  usage_rate: number
  shelves: { id: string; code: string; position: string; capacity: number; used: number; usage_rate: number }[]
  archiveTypes: { type: string; count: number }[]
}

export interface WarehouseDetail {
  id: string
  name: string
  location: string
  capacity: number
  used: number
  usageRate: number
  shelves: { id: string; code: string; position: string; capacity: number; used: number; usage_rate: number }[]
  environment: { temperature: number; humidity: number; light_intensity: number; harmful_gas: number; recorded_at: string } | null
  equipment: Equipment[]
  archiveStats: { type: string; secrecy_level: string; count: number }[]
  thresholds: Threshold[]
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface User {
  id: string
  name: string
  role: string
  department: string
  permissionLevel: string
}

export interface AppointmentItem {
  id: string
  appointment_time: string
  expected_return: string
  status: string
  approval_result: string | null
  user_name: string
  user_department: string
}

export interface MonthlyReportSummary {
  totalArchives: number
  monthBorrows: number
  monthApproved: number
  monthPending: number
  monthRejected: number
  monthOverdueCount: number
  monthOverdueFee: number
  totalOverdueCount: number
  totalOverdueFee: number
}

export interface MonthlyReport {
  month: string
  summary: MonthlyReportSummary
  borrowingTrend: { date: string; count: number; approved: number }[]
  borrowByType: { type: string; count: number }[]
  borrowByDepartment: { department: string; count: number; approved: number }[]
  warehouseUtilization: {
    id: string
    name: string
    location: string
    capacity: number
    used: number
    usage_rate: number
    month_borrow_count: number
  }[]
  warehouseArchiveStats: { id: string; name: string; type: string; count: number }[]
  typeStats: { type: string; total: number; borrowed: number; in_stock: number; month_borrowed: number }[]
}
