import { useEffect, useState } from 'react'
import { Map, X, AlertTriangle, Thermometer, Droplets, Sun, Wind } from 'lucide-react'
import { api } from '@/lib/api'
import type { RealtimeEnvironmentData, WarehouseDetail, Alert } from '@/types/api'

interface WarehouseInfo {
  id: string
  name: string
  location: string
  capacity: number
  used: number
}

const WAREHOUSE_LAYOUT = [
  { pos: 'tl', label: '文书库房', sub: 'A区1楼' },
  { pos: 'tr', label: '科技库房', sub: 'A区2楼' },
  { pos: 'bl', label: '机密库房', sub: 'B区1楼' },
  { pos: 'br', label: '声像库房', sub: 'C区1楼' },
]

function tempColor(t: number | null): string {
  if (t == null) return 'rgba(100,116,139,0.15)'
  if (t < 18) return 'rgba(59,130,246,0.2)'
  if (t < 24) return 'rgba(16,185,129,0.2)'
  if (t < 28) return 'rgba(245,158,11,0.25)'
  return 'rgba(239,68,68,0.3)'
}

function tempLabel(t: number | null): string {
  if (t == null) return '--'
  return `${t.toFixed(1)}°C`
}

function humLabel(h: number | null): string {
  if (h == null) return '--'
  return `${h.toFixed(0)}%`
}

export default function WarehouseMap() {
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([])
  const [envData, setEnvData] = useState<RealtimeEnvironmentData[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<WarehouseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [wh, env, al] = await Promise.all([
          api.getWarehouses(),
          api.getEnvironmentRealtime(),
          api.getAlerts({ status: '未处理' }).catch(() => []),
        ])
        setWarehouses(wh)
        setEnvData(env)
        setAlerts(al as Alert[])
      } catch { /* empty */ }
      setLoading(false)
    }
    fetch()
  }, [])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    api.getWarehouse(selected).then(setDetail).catch(() => setDetail(null))
  }, [selected])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const getEnv = (id: string) => envData.find(e => e.warehouseId === id)
  const getAlerts = (id: string) => alerts.filter(a => a.warehouse_id === id)
  const getWarehouse = (idx: number) => warehouses[idx] || null

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <Map className="w-5 h-5 text-accent" />
        库房平面图
      </h2>

      <div className={`flex gap-5 ${selected ? '' : ''}`}>
        <div className={`flex-1 card-base p-5 ${selected ? 'max-w-[65%]' : ''}`}>
          <svg viewBox="0 0 800 500" className="w-full h-auto">
            <defs>
              <linearGradient id="corridorH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-border)" stopOpacity="0.3" />
                <stop offset="50%" stopColor="var(--color-border-light)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--color-border)" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="corridorV" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-border)" stopOpacity="0.3" />
                <stop offset="50%" stopColor="var(--color-border-light)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--color-border)" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="800" height="500" rx="12" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1" />

            {WAREHOUSE_LAYOUT.map((layout, idx) => {
              const wh = getWarehouse(idx)
              const env = wh ? getEnv(wh.id) : null
              const whAlerts = wh ? getAlerts(wh.id) : []
              const usageRate = wh && wh.capacity > 0 ? (wh.used / wh.capacity * 100) : 0
              const isTL = layout.pos === 'tl'
              const isTR = layout.pos === 'tr'
              const isBL = layout.pos === 'bl'
              const x = isTL || isBL ? 20 : 415
              const y = isTL || isTR ? 20 : 265
              const w = 365
              const h = 215
              const isSelected = selected === wh?.id

              return (
                <g key={layout.pos} onClick={() => wh && setSelected(wh.id)} className="cursor-pointer">
                  <rect x={x} y={y} width={w} height={h} rx="8" fill="var(--color-card)" stroke={isSelected ? 'var(--color-accent)' : 'var(--color-border)'} strokeWidth={isSelected ? 2 : 1} />
                  <rect x={x} y={y} width={w} height={h} rx="8" fill={env ? tempColor(env.temperature) : 'rgba(100,116,139,0.1)'} />
                  <text x={x + 15} y={y + 28} fill="var(--color-text-primary)" fontSize="16" fontWeight="600" fontFamily="'Noto Serif SC', serif">{layout.label}</text>
                  <text x={x + 15} y={y + 48} fill="var(--color-text-muted)" fontSize="11">{layout.sub}</text>

                  {env && (
                    <g>
                      <circle cx={x + 30} cy={y + 78} r="5" fill={env.temperature != null && env.temperature >= 28 ? 'var(--color-danger)' : env.temperature != null && env.temperature < 18 ? 'var(--color-blue-400)' : 'var(--color-success)'} />
                      <text x={x + 42} y={y + 82} fill="var(--color-text-secondary)" fontSize="12">温度 {tempLabel(env.temperature)}</text>
                      <circle cx={x + 170} cy={y + 78} r="5" fill={env.humidity != null && env.humidity > 65 ? 'var(--color-warning)' : 'var(--color-success)'} />
                      <text x={x + 182} y={y + 82} fill="var(--color-text-secondary)" fontSize="12">湿度 {humLabel(env.humidity)}</text>
                    </g>
                  )}

                  <rect x={x + 15} y={y + 100} width={w - 30} height="8" rx="4" fill="var(--color-border)" />
                  <rect x={x + 15} y={y + 100} width={Math.max((w - 30) * usageRate / 100, 0)} height="8" rx="4" fill={usageRate > 80 ? 'var(--color-danger)' : usageRate > 60 ? 'var(--color-warning)' : 'var(--color-success)'} />
                  <text x={x + 15} y={y + 126} fill="var(--color-text-muted)" fontSize="11">利用率 {usageRate.toFixed(1)}% · {wh?.used || 0}/{wh?.capacity || 0}</text>

                  {whAlerts.length > 0 && (
                    <g>
                      <circle cx={x + w - 25} cy={y + 25} r="10" fill="var(--color-danger)" opacity="0.9">
                        <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <text x={x + w - 25} y={y + 29} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{whAlerts.length}</text>
                    </g>
                  )}
                </g>
              )
            })}

            <rect x="390" y="20" width="20" height="460" fill="url(#corridorV)" rx="4" />
            <text x="400" y="250" fill="var(--color-text-muted)" fontSize="11" textAnchor="middle" transform="rotate(-90, 400, 250)">走 廊</text>
            <rect x="20" y="240" width="760" height="20" fill="url(#corridorH)" rx="4" />
            <text x="400" y="254" fill="var(--color-text-muted)" fontSize="11" textAnchor="middle">主通道</text>
          </svg>
        </div>

        {selected && detail && (
          <div className="w-[35%] card-base p-5 overflow-y-auto max-h-[calc(100vh-12rem)] animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif font-semibold text-text-primary">{detail.name}</h3>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-text-muted mb-4">{detail.location} · 容量 {detail.capacity} · 已用 {detail.used} ({detail.usageRate}%)</p>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">货架使用情况</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {detail.shelves.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="text-text-secondary w-20 truncate">{s.code}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(s.usage_rate, 100)}%` }} />
                    </div>
                    <span className="text-text-muted w-14 text-right">{s.usage_rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {detail.archiveStats.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-primary mb-2">档案类型分布</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.archiveStats.map((as, i) => (
                    <span key={i} className="badge badge-accent">{as.type}: {as.count}</span>
                  ))}
                </div>
              </div>
            )}

            {detail.environment && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-primary mb-2">环境数据</h4>
                <div className="grid grid-cols-2 gap-2">
                  <EnvItem icon={Thermometer} label="温度" value={`${detail.environment.temperature}°C`} />
                  <EnvItem icon={Droplets} label="湿度" value={`${detail.environment.humidity}%`} />
                  <EnvItem icon={Sun} label="光照" value={`${detail.environment.light_intensity}lux`} />
                  <EnvItem icon={Wind} label="有害气体" value={`${detail.environment.harmful_gas}ppm`} />
                </div>
              </div>
            )}

            {detail.equipment.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-primary mb-2">设备状态</h4>
                <div className="space-y-1.5">
                  {detail.equipment.map(eq => (
                    <div key={eq.id} className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">{eq.name}</span>
                      <span className={`badge ${eq.status === '运行中' ? 'badge-success' : eq.status === '维修中' ? 'badge-danger' : 'badge-warning'}`}>{eq.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {getAlerts(selected).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                  预警信息
                </h4>
                <div className="space-y-1.5">
                  {getAlerts(selected).map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs p-2 rounded bg-danger/10 border border-danger/20">
                      <span className="text-danger font-medium">{a.parameter}</span>
                      <span className="text-text-muted">值: {a.value} / 阈值: {a.threshold}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EnvItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-surface/50 border border-border/50">
      <Icon className="w-3.5 h-3.5 text-accent" />
      <div>
        <p className="text-[10px] text-text-muted">{label}</p>
        <p className="text-xs text-text-primary font-medium">{value}</p>
      </div>
    </div>
  )
}
