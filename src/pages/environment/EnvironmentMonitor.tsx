import { useState, useEffect, useCallback } from 'react'
import { Thermometer, Droplets, Sun, Wind, RefreshCw, Power, PowerOff } from 'lucide-react'
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'
import type { RealtimeEnvironmentData, EnvironmentData, Threshold, Equipment } from '@/types/api'

const METRICS = [
  { key: 'temperature', label: '温度', unit: '°C', icon: Thermometer, color: '#EF4444', normalColor: '#10B981' },
  { key: 'humidity', label: '湿度', unit: '%RH', icon: Droplets, color: '#3B82F6', normalColor: '#10B981' },
  { key: 'lightIntensity', label: '光照', unit: 'Lux', icon: Sun, color: '#F59E0B', normalColor: '#10B981' },
  { key: 'harmfulGas', label: '有害气体', unit: 'ppm', icon: Wind, color: '#8B5CF6', normalColor: '#10B981' },
] as const

type MetricKey = typeof METRICS[number]['key']

interface MetricCardProps {
  label: string
  unit: string
  value: number | null
  icon: React.ElementType
  color: string
  normalColor: string
  isOver: boolean
  data: { value: number }[]
}

function MetricCard({ label, unit, value, icon: Icon, color, normalColor, isOver, data }: MetricCardProps) {
  const displayColor = isOver ? color : normalColor
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${displayColor}20` }}>
            <Icon className="w-5 h-5" style={{ color: displayColor }} />
          </div>
          <span className="text-text-secondary text-sm">{label}</span>
        </div>
        {isOver && <span className="badge-danger animate-pulse-alert">超限</span>}
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold font-serif" style={{ color: displayColor }}>
          {value !== null ? value.toFixed(1) : '--'}
        </span>
        <span className="text-text-muted text-sm">{unit}</span>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
            <Tooltip
              contentStyle={{ background: '#162032', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }}
              itemStyle={{ color: displayColor }}
              formatter={(v: number) => [v.toFixed(1), label]}
            />
            <Line type="monotone" dataKey="value" stroke={displayColor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function EnvironmentMonitor() {
  const [realtimeData, setRealtimeData] = useState<RealtimeEnvironmentData[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [historyData, setHistoryData] = useState<EnvironmentData[]>([])
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [controlling, setControlling] = useState<string | null>(null)

  const fetchRealtime = useCallback(async () => {
    try {
      const data = await api.getEnvironmentRealtime()
      setRealtimeData(data)
    } catch {
      setRealtimeData([])
    }
  }, [])

  const fetchThresholds = useCallback(async () => {
    try {
      const data = await api.getThresholds()
      setThresholds(data)
    } catch {
      setThresholds([])
    }
  }, [])

  const fetchEquipment = useCallback(async () => {
    try {
      const wh = realtimeData[selectedIdx]
      if (!wh) return
      const data = await api.getEquipment({ warehouseId: wh.warehouseId })
      setEquipment(data)
    } catch {
      setEquipment([])
    }
  }, [realtimeData, selectedIdx])

  const fetchHistory = useCallback(async () => {
    try {
      const wh = realtimeData[selectedIdx]
      if (!wh) return
      const data = await api.getEnvironmentHistory({ warehouseId: wh.warehouseId, hours: '24' })
      setHistoryData(data)
    } catch {
      setHistoryData([])
    }
  }, [realtimeData, selectedIdx])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchRealtime()
      await fetchThresholds()
      setLoading(false)
    }
    init()
  }, [fetchRealtime, fetchThresholds])

  useEffect(() => {
    if (realtimeData.length > 0) {
      fetchHistory()
      fetchEquipment()
    }
  }, [realtimeData, selectedIdx, fetchHistory, fetchEquipment])

  useEffect(() => {
    const interval = setInterval(fetchRealtime, 30000)
    return () => clearInterval(interval)
  }, [fetchRealtime])

  const handleDeviceControl = async (eqId: string, action: 'on' | 'off') => {
    setControlling(eqId)
    try {
      await api.controlDevice(eqId, action)
      await fetchEquipment()
      await fetchRealtime()
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setControlling(null)
    }
  }

  const isOverThreshold = (key: MetricKey, value: number | null): boolean => {
    if (value === null) return false
    const wh = realtimeData[selectedIdx]
    if (!wh) return false
    const t = thresholds.find(th => th.warehouse_id === wh.warehouseId && th.parameter === key)
    if (!t) return false
    return value < t.min_value || value > t.max_value
  }

  const getMetricHistory = (key: MetricKey): { value: number }[] => {
    const fieldMap: Record<MetricKey, keyof EnvironmentData> = {
      temperature: 'temperature',
      humidity: 'humidity',
      lightIntensity: 'light_intensity',
      harmfulGas: 'harmful_gas',
    }
    return historyData.map(d => ({ value: Number(d[fieldMap[key]]) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const current = realtimeData[selectedIdx]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">
          <Thermometer className="w-5 h-5 text-accent" />
          库房环境监测
        </h2>
        <button className="btn-secondary text-sm" onClick={fetchRealtime}>
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {realtimeData.map((wh, i) => (
          <button
            key={wh.warehouseId}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedIdx === i
                ? 'bg-accent text-primary font-medium'
                : 'text-text-secondary hover:bg-card border border-border'
            }`}
            onClick={() => setSelectedIdx(i)}
          >
            {wh.warehouseName}
          </button>
        ))}
      </div>

      {current && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {METRICS.map(m => {
              const val = current[m.key] as number | null
              return (
                <MetricCard
                  key={m.key}
                  label={m.label}
                  unit={m.unit}
                  value={val}
                  icon={m.icon}
                  color={m.color}
                  normalColor={m.normalColor}
                  isOver={isOverThreshold(m.key, val)}
                  data={getMetricHistory(m.key)}
                />
              )
            })}
          </div>

          <div className="card-base p-5">
            <h3 className="section-title text-base mb-4">设备控制面板</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {equipment.map(eq => (
                <div key={eq.id} className="p-3 rounded-lg bg-surface/50 border border-border/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary">{eq.name}</p>
                    <p className="text-xs text-text-muted">{eq.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${eq.status === '运行中' ? 'badge-success' : 'badge-warning'}`}>
                      {eq.status}
                    </span>
                    <button
                      className={`p-1.5 rounded-lg transition-colors ${
                        eq.status === '运行中'
                          ? 'bg-danger/20 text-danger hover:bg-danger/30'
                          : 'bg-success/20 text-success hover:bg-success/30'
                      } disabled:opacity-50`}
                      onClick={() => handleDeviceControl(eq.id, eq.status === '运行中' ? 'off' : 'on')}
                      disabled={controlling === eq.id}
                    >
                      {eq.status === '运行中' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {equipment.length === 0 && (
                <div className="col-span-full text-center py-6 text-text-muted text-sm">该库房暂无设备</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
