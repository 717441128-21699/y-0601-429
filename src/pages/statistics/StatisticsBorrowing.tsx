import { useEffect, useState } from 'react'
import { BarChart3, Users, AlertTriangle, BookOpen } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { api } from '@/lib/api'
import type { BorrowingStats, BorrowStatItem } from '@/types/api'

type GroupBy = 'fonds' | 'year' | 'type'

const groupLabels: Record<GroupBy, string> = { fonds: '全宗', year: '年度', type: '类型' }

export default function StatisticsBorrowing() {
  const [data, setData] = useState<BorrowingStats | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('fonds')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.getBorrowingStats({ groupBy })
        setData(res)
      } catch {
        setData({ stats: [], total: 0, monthlyTrend: [] })
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [groupBy])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalBorrows = data.stats.reduce((s, i) => s + i.borrow_count, 0)
  const totalBorrowers = data.stats.reduce((s, i) => s + i.borrower_count, 0)
  const totalOverdue = data.stats.reduce((s, i) => s + i.overdue_count, 0)
  const chartData = data.stats.map(s => ({ name: s.label, 借阅次数: s.borrow_count, 逾期次数: s.overdue_count }))
  const trendData = [...data.monthlyTrend].reverse().map(t => ({ month: t.month, 借阅量: t.count }))

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="section-title">
        <BarChart3 className="w-5 h-5 text-accent" />
        借阅统计分析
      </h2>

      <div className="grid grid-cols-3 gap-5">
        <MetricCard icon={BookOpen} label="总借阅次数" value={totalBorrows} color="text-accent" bg="bg-accent/10" />
        <MetricCard icon={Users} label="借阅人数" value={totalBorrowers} color="text-blue-400" bg="bg-blue-400/10" />
        <MetricCard icon={AlertTriangle} label="逾期次数" value={totalOverdue} color="text-danger" bg="bg-danger/10" />
      </div>

      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title text-base">借阅分布</h3>
          <div className="flex gap-1 bg-surface rounded-lg p-1">
            {(Object.keys(groupLabels) as GroupBy[]).map(key => (
              <button
                key={key}
                onClick={() => setGroupBy(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  groupBy === key
                    ? 'bg-accent text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {groupLabels[key]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--color-text-primary)' }}
            />
            <Legend />
            <Bar dataKey="借阅次数" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="逾期次数" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-base p-5">
        <h3 className="section-title text-base mb-4">月度趋势</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--color-text-primary)' }}
            />
            <Line type="monotone" dataKey="借阅量" stroke="var(--color-accent)" strokeWidth={2} dot={{ fill: 'var(--color-accent)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card-base overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="section-title text-base">详细数据</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3 text-left">{groupLabels[groupBy]}</th>
                <th className="px-5 py-3 text-right">借阅次数</th>
                <th className="px-5 py-3 text-right">借阅人数</th>
                <th className="px-5 py-3 text-right">逾期次数</th>
                <th className="px-5 py-3 text-right">逾期费用</th>
              </tr>
            </thead>
            <tbody>
              {data.stats.map(item => (
                <tr key={item.group_key} className="table-row">
                  <td className="px-5 py-3 text-text-primary font-medium">{item.label}</td>
                  <td className="px-5 py-3 text-right text-text-primary">{item.borrow_count}</td>
                  <td className="px-5 py-3 text-right text-text-primary">{item.borrower_count}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={item.overdue_count > 0 ? 'text-danger' : 'text-text-primary'}>
                      {item.overdue_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-text-secondary">
                    ¥{item.total_overdue_fee.toFixed(2)}
                  </td>
                </tr>
              ))}
              {data.stats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-muted">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string
}) {
  return (
    <div className="metric-card animate-card-enter">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-text-primary font-serif">{value.toLocaleString()}</p>
        <p className="text-text-muted text-xs mt-1">{label}</p>
      </div>
    </div>
  )
}
