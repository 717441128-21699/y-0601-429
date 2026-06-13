import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive, Inbox, Send, AlertTriangle, Clock, FileText,
  Thermometer, Wrench, Search, CheckSquare, Map, BarChart3,
  PackageX, Wrench as WrenchIcon, User,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Overview, Alert } from '@/types/api'

interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  bgColor: string
}

function MetricCard({ icon: Icon, label, value, color, bgColor }: MetricCardProps) {
  return (
    <div className="metric-card animate-card-enter">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-text-primary font-serif">{value}</p>
        <p className="text-text-muted text-xs mt-1">{label}</p>
      </div>
    </div>
  )
}

const quickActions = [
  { label: '档案入库', icon: Archive, path: '/archive/intake', color: 'text-accent', bg: 'bg-accent/10' },
  { label: '档案查询', icon: Search, path: '/archive/list', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { label: '借阅申请', icon: FileText, path: '/borrow/apply', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: '借阅审批', icon: CheckSquare, path: '/borrow/approval', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { label: '环境监测', icon: Thermometer, path: '/environment/monitor', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { label: '维保工单', icon: Wrench, path: '/equipment/maintenance', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { label: '统计分析', icon: BarChart3, path: '/statistics/borrowing', color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { label: '库房地图', icon: Map, path: '/warehouse/map', color: 'text-teal-400', bg: 'bg-teal-400/10' },
]

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const overviewData = await api.getOverview()
        const alertsData = await api.getAlerts({ status: '未处理' }).catch(() => [] as Alert[])
        setOverview(overviewData)
        setAlerts(alertsData as Alert[])
      } catch {
        setOverview({
          totalArchives: 0, inStock: 0, borrowed: 0, alertCount: 0,
          overdueBorrows: 0, pendingApprovals: 0, lowStockParts: 0,
          maintenancePending: 0, recentAlerts: [], recentBorrows: [],
        })
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const data = overview

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="section-title">
          <BarChart3 className="w-5 h-5 text-accent" />
          系统概览
        </h2>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span>逾期 <strong className="text-danger">{data.overdueBorrows}</strong></span>
          <span>待审批 <strong className="text-warning">{data.pendingApprovals}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <MetricCard icon={Archive} label="档案总量" value={data.totalArchives.toLocaleString()} color="text-accent" bgColor="bg-accent/10" />
        <MetricCard icon={Inbox} label="在库数量" value={data.inStock.toLocaleString()} color="text-success" bgColor="bg-success/10" />
        <MetricCard icon={Send} label="借出数量" value={data.borrowed.toLocaleString()} color="text-blue-400" bgColor="bg-blue-400/10" />
        <MetricCard icon={AlertTriangle} label="预警数量" value={data.alertCount} color="text-danger" bgColor="bg-danger/10" />
      </div>

      <div className="grid grid-cols-4 gap-5">
        <MetricCard icon={Clock} label="逾期借阅" value={data.overdueBorrows} color="text-warning" bgColor="bg-warning/10" />
        <MetricCard icon={CheckSquare} label="待审批" value={data.pendingApprovals} color="text-purple-400" bgColor="bg-purple-400/10" />
        <MetricCard icon={PackageX} label="备件不足" value={data.lowStockParts} color="text-orange-400" bgColor="bg-orange-400/10" />
        <MetricCard icon={WrenchIcon} label="待维保" value={data.maintenancePending} color="text-cyan-400" bgColor="bg-cyan-400/10" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 card-base p-5">
          <h3 className="section-title text-base mb-4">
            <AlertTriangle className="w-4 h-4 text-danger" />
            实时预警
          </h3>
          <div className="space-y-3">
            {(data.recentAlerts || alerts).slice(0, 5).map((alert, index) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-border/50 animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.type === 'temperature'
                      ? 'bg-danger animate-pulse-alert'
                      : alert.type === 'humidity'
                      ? 'bg-warning'
                      : 'bg-accent'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${
                      alert.type === 'temperature' ? 'badge-danger' : alert.type === 'humidity' ? 'badge-warning' : 'badge-accent'
                    }`}>
                      {alert.type === 'temperature' ? '紧急' : alert.type === 'humidity' ? '警告' : '提示'}
                    </span>
                    <span className="text-xs text-text-muted">{alert.warehouse_name}</span>
                    <span className="text-xs text-text-muted ml-auto">
                      {new Date(alert.triggered_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{alert.parameter}{alert.value}（阈值：{alert.threshold}）</p>
                </div>
              </div>
            ))}
            {(data.recentAlerts || alerts).length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">暂无预警信息</div>
            )}
          </div>
        </div>

        <div className="card-base p-5">
          <h3 className="section-title text-base mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-surface/50 border border-border/50 hover:border-accent/30 hover:bg-card-50 transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
                </div>
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {data.recentBorrows && data.recentBorrows.length > 0 && (
        <div className="card-base p-5">
          <h3 className="section-title text-base mb-4">
            <FileText className="w-4 h-4 text-accent" />
            最近借阅
          </h3>
          <div className="space-y-2">
            {data.recentBorrows.slice(0, 5).map(borrow => (
              <div key={borrow.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface/50 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-primary truncate">{borrow.archive_title || borrow.archive_number}</span>
                    <span className={`badge ${
                      borrow.status === '借出中' ? 'badge-accent' :
                      borrow.status === '已超期' ? 'badge-danger' :
                      borrow.status === '待审批' ? 'badge-warning' : 'badge-success'
                    }`}>
                      {borrow.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {borrow.user_name} · {borrow.user_department} · {new Date(borrow.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title text-base">
            <Map className="w-4 h-4 text-accent" />
            库房概览
          </h3>
          <Link to="/warehouse/map" className="text-xs text-accent hover:text-accent-300 transition-colors">
            查看详情 →
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-4" id="warehouse-preview">
          {data.recentAlerts && data.recentAlerts.length > 0 ? (
            Array.from(new Set(data.recentAlerts.map(a => a.warehouse_id))).slice(0, 4).map((whId, i) => {
              const whAlerts = data.recentAlerts.filter(a => a.warehouse_id === whId)
              const whName = whAlerts[0]?.warehouse_name || `库房${i + 1}`
              const hasAlert = whAlerts.length > 0
              return (
                <WarehousePreviewBlock key={whId} name={whName} hasAlert={hasAlert} warehouseId={whId} />
              )
            })
          ) : (
            ['文书库房', '科技库房', '机密库房', '声像库房'].map((name, i) => (
              <WarehousePreviewBlock key={name} name={name} hasAlert={false} warehouseId="" />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function WarehousePreviewBlock({ name, hasAlert, warehouseId }: { name: string; hasAlert: boolean; warehouseId: string }) {
  const [utilization, setUtilization] = useState(0)

  useEffect(() => {
    if (!warehouseId) return
    api.getWarehouse(warehouseId).then(d => {
      setUtilization(d.usageRate)
    }).catch(() => {})
  }, [warehouseId])

  const status = hasAlert ? 'warning' : utilization > 80 ? 'critical' : 'normal'

  return (
    <Link
      to="/warehouse/map"
      className="p-4 rounded-lg bg-surface/50 border border-border/50 hover:border-accent/20 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-primary">{name}</span>
        <span className={`badge ${status === 'normal' ? 'badge-success' : status === 'warning' ? 'badge-warning' : 'badge-danger'}`}>
          {status === 'normal' ? '正常' : status === 'warning' ? '注意' : '预警'}
        </span>
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            utilization > 80 ? 'bg-danger' : utilization > 60 ? 'bg-warning' : 'bg-success'
          }`}
          style={{ width: `${utilization}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>容量利用率</span>
        <span className="text-text-primary font-medium">{utilization}%</span>
      </div>
    </Link>
  )
}
