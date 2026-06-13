import type {
  Archive,
  ArchiveCreateInput,
  ArchiveCreateResult,
  ArchiveUpdateInput,
  Borrow,
  BorrowCreateInput,
  BorrowCreateResult,
  RemindResult,
  RealtimeEnvironmentData,
  EnvironmentData,
  Alert,
  Threshold,
  Equipment,
  MaintenanceOrder,
  MaintenanceTeam,
  SparePart,
  Overview,
  BorrowingStats,
  UtilizationStats,
  WarehouseCapacityItem,
  WarehouseDetail,
  PaginatedResponse,
  User,
  AppointmentItem,
  MonthlyReport,
} from '@/types/api'

const BASE_URL = '/api'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const json = await response.json()

  if (json.success === false) {
    throw new Error(json.error || '请求失败')
  }

  return json.data as T
}

export const api = {
  getArchives: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Archive>>(`/archives${query}`)
  },

  getArchive: (id: string) =>
    request<Archive>(`/archives/${id}`),

  createArchive: (data: ArchiveCreateInput) =>
    request<ArchiveCreateResult>('/archives', { method: 'POST', body: JSON.stringify(data) }),

  updateArchive: (id: string, data: ArchiveUpdateInput) =>
    request<Archive>(`/archives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getBorrows: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Borrow[]>(`/borrows${query}`)
  },

  createBorrow: (data: BorrowCreateInput) =>
    request<BorrowCreateResult>('/borrows', { method: 'POST', body: JSON.stringify(data) }),

  approveBorrow: (id: string, approved: boolean) =>
    request<Borrow>(`/borrows/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approved }) }),

  returnBorrow: (id: string) =>
    request<Borrow>(`/borrows/${id}/return`, { method: 'POST' }),

  getOverdueBorrows: () =>
    request<Borrow[]>('/borrows/overdue'),

  remindBorrow: (id: string) =>
    request<RemindResult>(`/borrows/${id}/remind`, { method: 'POST' }),

  getEnvironmentRealtime: () =>
    request<RealtimeEnvironmentData[]>('/environment/realtime'),

  getEnvironmentHistory: (warehouseId: string, hours?: number) => {
    const query = hours ? `?hours=${hours}` : ''
    return request<EnvironmentData[]>(`/environment/history/${warehouseId}${query}`)
  },

  getAlerts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Alert[]>(`/environment/alerts${query}`)
  },

  getThresholds: () =>
    request<Threshold[]>('/environment/thresholds'),

  updateThresholds: (warehouseId: string, thresholds: { parameter: string; minValue: number; maxValue: number }[]) =>
    request<Threshold[]>(`/environment/threshold/${warehouseId}`, { method: 'PUT', body: JSON.stringify({ thresholds }) }),

  controlDevice: (equipmentId: string, action: 'on' | 'off') =>
    request<Equipment>('/environment/device-control', { method: 'POST', body: JSON.stringify({ equipmentId, action }) }),

  getEquipment: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Equipment[]>(`/equipment${query}`)
  },

  getMaintenanceOrders: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<MaintenanceOrder[]>(`/equipment/maintenance${query}`)
  },

  createMaintenanceOrder: (data: { equipmentId: string; type: string; description: string; teamId?: string; priority?: string }) =>
    request<{ id: string; suggestions?: string[] }>('/equipment/maintenance', { method: 'POST', body: JSON.stringify(data) }),

  updateMaintenanceOrder: (id: string, data: Record<string, unknown>) =>
    request<MaintenanceOrder>(`/equipment/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getSpareParts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<SparePart[]>(`/equipment/spare-parts${query}`)
  },

  deductSparePart: (sparePartId: string, quantity: number) =>
    request<SparePart>('/equipment/spare-parts/deduct', { method: 'POST', body: JSON.stringify({ sparePartId, quantity }) }),

  getMaintenanceTeams: () =>
    request<MaintenanceTeam[]>('/equipment/teams'),

  getOverview: () =>
    request<Overview>('/statistics/overview'),

  getBorrowingStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<BorrowingStats>(`/statistics/borrowing${query}`)
  },

  getUtilizationStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<UtilizationStats>(`/statistics/utilization${query}`)
  },

  getWarehouses: () =>
    request<{ id: string; name: string; location: string; capacity: number; used: number; shelves: { id: string; code: string; position: string; capacity: number; used: number }[] }[]>('/warehouses'),

  getWarehouse: (id: string) =>
    request<WarehouseDetail>(`/warehouses/${id}`),

  getWarehouseCapacity: () =>
    request<WarehouseCapacityItem[]>('/statistics/warehouse-capacity'),

  getMonthlyReport: (month?: string) => {
    const query = month ? `?month=${month}` : ''
    return request<MonthlyReport>(`/statistics/monthly-report${query}`)
  },

  getCurrentUser: () =>
    request<User>('/auth/current-user'),

  getUsers: () =>
    request<User[]>('/auth/users'),

  login: (data: { username?: string; role?: string }) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getArchiveAppointments: (archiveId: string) =>
    request<AppointmentItem[]>(`/borrows/appointments/${archiveId}`),
}
