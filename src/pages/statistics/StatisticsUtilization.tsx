import { useEffect, useState } from 'react'
import { PieChart as PieIcon, Download, X } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api'
import type { UtilizationStats, WarehouseCapacityItem } from '@/types/api'

const PIE_COLORS = ['var(--color-accent)', 'var(--color-success)']

export default function StatisticsUtilization() {
  const [utilData, setUtilData] = useState<UtilizationStats | null>(null)
  const [capacityData, setCapacityData] = useState<WarehouseCapacityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf')
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7))
  const [toast, setToast] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const [util, cap] = await Promise.all([
          api.getUtilizationStats(),
          api.getWarehouseCapacity(),
        ])
        setUtilData(util)
        setCapacityData(cap)
      } catch {
        setUtilData(null)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleExport = () => {
    setShowExport(false)
    showToast('报告生成中...')
  }

  if (loading || !utilData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inStockRate = utilData.totalArchives > 0
    ? ((utilData.inStockArchives / utilData.totalArchives) * 100)
    : 0

  const pieData = [
    { name: '借出', value: utilData.borrowedArchives },
    { name: '在库', value: utilData.inStockArchives },
  ]

  const barData = capacityData.map(w => ({
    name: w.name,
    容量: w.capacity,
    已用: w.used,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-accent text-primary px-5 py-3 rounded-lg shadow-lg animate-slide-in font-medium">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="section-title">
          <PieIcon className="w-5 h-5 text-accent" />
          利用率与库容统计
        </h2>
        <button onClick={() => setShowExport(true)} className="btn-primary">
          <Download className="w-4 h-4" />
          导出报告
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="card-base p-5 flex flex-col items-center justify-center">
          <CircularProgress value={utilData.utilizationRate} label="总利用率" />
        </div>
        <div className="card-base p-5 flex flex-col items-center justify-center">
          <CircularProgress value={inStockRate} label="在库率" />
        </div>
        <div className="card-base p-5">
          <h4 className="text-sm text-text-muted mb-2 text-center">档案状态分布</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={4}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="section-title text-base mb-4">按类型统计</h3>
        <div className="grid grid-cols-2 gap-4">
          {utilData.typeStats.map(ts => {
            const rate = ts.total > 0 ? ((ts.borrowed / ts.total) * 100) : 0
            return (
              <div key={ts.type} className="p-4 rounded-lg bg-surface/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{ts.type}</span>
                  <span className="text-xs text-text-muted">利用率 {rate.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
                </div>
                <div className="flex justify-between text-xs text-text-muted">
                  <span>总计 {ts.total}</span>
                  <span>借出 {ts.borrowed}</span>
                  <span>在库 {ts.in_stock}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="section-title text-base mb-4">库房容量统计</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
            <Bar dataKey="容量" fill="var(--color-border-light)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="已用" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {capacityData.map(w => (
          <div key={w.id} className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">{w.name}</span>
              <span className={`badge ${w.usage_rate > 80 ? 'badge-danger' : w.usage_rate > 60 ? 'badge-warning' : 'badge-success'}`}>
                {w.usage_rate}%
              </span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  w.usage_rate > 80 ? 'bg-danger' : w.usage_rate > 60 ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${Math.min(w.usage_rate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>已用 {w.used}</span>
              <span>容量 {w.capacity}</span>
            </div>
          </div>
        ))}
      </div>

      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowExport(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-serif font-semibold text-text-primary">导出报告</h3>
              <button onClick={() => setShowExport(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-2 block">导出格式</label>
                <div className="flex gap-2">
                  {(['pdf', 'excel'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        exportFormat === fmt
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-secondary hover:border-accent/40'
                      }`}
                    >
                      {fmt === 'pdf' ? 'PDF' : 'Excel'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-2 block">统计月份</label>
                <input
                  type="month"
                  value={exportMonth}
                  onChange={e => setExportMonth(e.target.value)}
                  className="input-base w-full"
                />
              </div>
              <button onClick={handleExport} className="btn-primary w-full justify-center mt-2">
                <Download className="w-4 h-4" />
                生成报告
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CircularProgress({ value, label }: { value: number; label: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke="var(--color-accent)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute mt-8 flex flex-col items-center">
        <span className="text-2xl font-bold text-text-primary font-serif">{value.toFixed(1)}%</span>
        <span className="text-xs text-text-muted mt-1">{label}</span>
      </div>
      <span className="text-xs text-text-muted mt-2">{label}</span>
    </div>
  )
}
