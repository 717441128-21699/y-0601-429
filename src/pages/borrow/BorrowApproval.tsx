import { useState, useEffect } from 'react'
import { CheckSquare, Check, X, MapPin, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Borrow } from '@/types/api'

const TABS = [
  { key: '', label: '全部' },
  { key: '待审批', label: '待审批' },
  { key: '已通过', label: '已通过' },
  { key: '已拒绝', label: '已拒绝' },
]

export default function BorrowApproval() {
  const [borrows, setBorrows] = useState<Borrow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('待审批')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [pickupModal, setPickupModal] = useState<Borrow | null>(null)

  const fetchData = async (status: string = activeTab) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (status) params.status = status
      const res = await api.getBorrows(params)
      setBorrows(res)
    } catch {
      setBorrows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    fetchData(tab)
  }

  const handleApprove = async (id: string, approved: boolean) => {
    setActionLoading(id)
    try {
      await api.approveBorrow(id, approved)
      fetchData()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setActionLoading(null)
    }
  }

  const STATUS_BADGE: Record<string, string> = {
    '待审批': 'badge-warning',
    '已通过': 'badge-success',
    '已拒绝': 'badge-danger',
    '借出中': 'badge-accent',
    '已归还': 'badge-success',
    '已超期': 'badge-danger',
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <CheckSquare className="w-5 h-5 text-accent" />
        借阅审批
      </h2>

      <div className="flex gap-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-accent text-primary font-medium'
                : 'text-text-secondary hover:bg-card'
            }`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">申请时间</th>
                <th className="px-4 py-3 text-left">档案标题</th>
                <th className="px-4 py-3 text-left">档号</th>
                <th className="px-4 py-3 text-left">申请人</th>
                <th className="px-4 py-3 text-left">借阅类型</th>
                <th className="px-4 py-3 text-left">审批结果</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">加载中...</td></tr>
              ) : borrows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">暂无数据</td></tr>
              ) : (
                borrows.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="px-4 py-3 text-text-muted text-xs">{b.created_at?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate">{b.archive_title}</td>
                    <td className="px-4 py-3 text-accent font-mono text-xs">{b.archive_number}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.user_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.borrow_type}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[b.status] || 'badge-accent'}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {b.status === '待审批' ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-primary text-xs !px-3 !py-1"
                            onClick={() => handleApprove(b.id, true)}
                            disabled={actionLoading === b.id}
                          >
                            {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            通过
                          </button>
                          <button
                            className="btn-danger text-xs !px-3 !py-1"
                            onClick={() => handleApprove(b.id, false)}
                            disabled={actionLoading === b.id}
                          >
                            <X className="w-3 h-3" />
                            拒绝
                          </button>
                        </div>
                      ) : b.status === '已通过' ? (
                        <button
                          className="btn-secondary text-xs !px-3 !py-1"
                          onClick={() => setPickupModal(b)}
                        >
                          <MapPin className="w-3 h-3" />
                          取卷通知
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs">{b.approval_result || '-'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pickupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPickupModal(null)}>
          <div className="card-base p-6 w-[400px] animate-card-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-heading text-base">取卷通知</h3>
                <p className="text-text-muted text-xs">请前往以下位置取卷</p>
              </div>
            </div>
            <div className="bg-surface rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">档案标题</span>
                <span className="text-text-primary">{pickupModal.archive_title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">档号</span>
                <span className="text-accent font-mono">{pickupModal.archive_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">借阅人</span>
                <span className="text-text-primary">{pickupModal.user_name}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">预约时间</span>
                <span className="text-text-primary">{pickupModal.appointment_time?.slice(0, 16).replace('T', ' ') || '待定'}</span>
              </div>
            </div>
            <button className="btn-primary w-full mt-4" onClick={() => setPickupModal(null)}>知道了</button>
          </div>
        </div>
      )}
    </div>
  )
}
