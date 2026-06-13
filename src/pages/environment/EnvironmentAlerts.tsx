import { useState, useEffect } from 'react'
import { AlertTriangle, Thermometer, Droplets, Sun, Wind, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { Alert } from '@/types/api'

const TABS = [
  { key: '', label: '全部' },
  { key: '未处理', label: '未处理' },
  { key: '处理中', label: '处理中' },
  { key: '已解决', label: '已解决' },
]

const STATUS_BADGE: Record<string, string> = {
  '未处理': 'badge-danger',
  '处理中': 'badge-warning',
  '已解决': 'badge-success',
}

const TYPE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  temperature: { icon: Thermometer, color: 'text-danger' },
  humidity: { icon: Droplets, color: 'text-blue-400' },
  light: { icon: Sun, color: 'text-warning' },
  harmful_gas: { icon: Wind, color: 'text-purple-400' },
}

const PAGE_SIZE = 8

export default function EnvironmentAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [page, setPage] = useState(1)

  const fetchAlerts = async (status: string = activeTab) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (status) params.status = status
      const data = await api.getAlerts(params)
      setAlerts(data)
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setPage(1)
    fetchAlerts(tab)
  }

  const filtered = alerts
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const getAlertIcon = (type: string) => {
    const config = TYPE_ICON[type] || { icon: AlertTriangle, color: 'text-accent' }
    return config
  }

  const formatTime = (t: string) => {
    try {
      return new Date(t).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return t
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <AlertTriangle className="w-5 h-5 text-accent" />
        环境预警记录
      </h2>

      <div className="flex gap-1 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-accent text-primary font-medium'
                : 'text-text-secondary hover:bg-card border border-border'
            }`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paged.length === 0 ? (
        <div className="card-base p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">暂无预警记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((alert, idx) => {
            const { icon: AlertIcon, color } = getAlertIcon(alert.type)
            return (
              <div
                key={alert.id}
                className="card-base p-4 animate-slide-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 ${color}`}>
                    <AlertIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">{alert.warehouse_name}</span>
                      <span className={STATUS_BADGE[alert.status] || 'badge-accent'}>{alert.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm mb-1">
                      <span className="text-text-secondary">参数: <span className="text-text-primary">{alert.parameter}</span></span>
                      <span className="text-text-secondary">当前值: <span className="text-danger font-medium">{alert.value}</span></span>
                      <span className="text-text-secondary">阈值: <span className="text-text-primary">{alert.threshold}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>触发时间: {formatTime(alert.triggered_at)}</span>
                      {alert.resolved_at && <span>解决时间: {formatTime(alert.resolved_at)}</span>}
                    </div>
                  </div>
                  {alert.status === '未处理' && (
                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse-alert flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-text-muted text-sm">共 {filtered.length} 条</span>
          <div className="flex items-center gap-2">
            <button
              className="p-1 rounded hover:bg-card text-text-secondary disabled:opacity-30"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="text-text-muted px-1">...</span>}
                  <button
                    className={`w-8 h-8 rounded text-sm ${
                      p === page ? 'bg-accent text-primary font-medium' : 'text-text-secondary hover:bg-card'
                    }`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              className="p-1 rounded hover:bg-card text-text-secondary disabled:opacity-30"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
