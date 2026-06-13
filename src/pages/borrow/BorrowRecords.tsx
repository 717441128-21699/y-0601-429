import { useState, useEffect } from 'react'
import { History, AlertTriangle, Bell, RotateCcw, Loader2, PackageCheck } from 'lucide-react'
import { api } from '@/lib/api'
import useAppStore from '@/stores/useAppStore'
import type { Borrow } from '@/types/api'

const TABS = [
  { key: '', label: '全部' },
  { key: '待取卷', label: '待取卷' },
  { key: '借出中', label: '借出中' },
  { key: '已归还', label: '已归还' },
  { key: '已超期', label: '已超期' },
]

const STATUS_BADGE: Record<string, string> = {
  '待审批': 'badge-warning',
  '已通过': 'badge-success',
  '待取卷': 'badge-accent',
  '已拒绝': 'badge-danger',
  '借出中': 'badge-accent',
  '已归还': 'badge-success',
  '已超期': 'badge-danger',
}

export default function BorrowRecords() {
  const [overdueList, setOverdueList] = useState<Borrow[]>([])
  const [borrows, setBorrows] = useState<Borrow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [remindMsg, setRemindMsg] = useState<string | null>(null)
  const currentUser = useAppStore((s) => s.currentUser)
  const isAdmin = currentUser.role === 'admin' || currentUser.role === '系统管理员'

  const fetchOverdue = async () => {
    try {
      const res = await api.getOverdueBorrows()
      setOverdueList(isAdmin ? res : res.filter((b) => b.user_id === currentUser.id))
    } catch {
      setOverdueList([])
    }
  }

  const fetchBorrows = async (status: string = activeTab) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (status) params.status = status
      if (!isAdmin) params.userId = currentUser.id
      const res = await api.getBorrows(params)
      setBorrows(res)
    } catch {
      setBorrows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverdue()
    fetchBorrows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    fetchBorrows(tab)
  }

  const handleRemind = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await api.remindBorrow(id)
      setRemindMsg(res.message)
      fetchOverdue()
      setTimeout(() => setRemindMsg(null), 3000)
    } catch (e: unknown) {
      setRemindMsg(e instanceof Error ? e.message : '催还失败')
      setTimeout(() => setRemindMsg(null), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmPickup = async (id: string) => {
    setActionLoading(id)
    try {
      await api.confirmPickup(id)
      fetchBorrows()
      setRemindMsg('已确认取卷，档案进入借出中状态')
      setTimeout(() => setRemindMsg(null), 3000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '确认取卷失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReturn = async (id: string) => {
    setActionLoading(id)
    try {
      await api.returnBorrow(id)
      fetchBorrows()
      fetchOverdue()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '归还失败')
    } finally {
      setActionLoading(null)
    }
  }

  const getOverdueDays = (expectedReturn: string | null) => {
    if (!expectedReturn) return 0
    const diff = Date.now() - new Date(expectedReturn).getTime()
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0
  }

  const handleBatchRemind = async () => {
    for (const b of overdueList) {
      await api.remindBorrow(b.id).catch(() => {})
    }
    setRemindMsg(`已发送 ${overdueList.length} 条催还通知`)
    fetchOverdue()
    setTimeout(() => setRemindMsg(null), 3000)
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <History className="w-5 h-5 text-accent" />
        借阅记录
      </h2>

      {overdueList.length > 0 && (
        <div className="card-base p-4 mb-4 border-danger/30 animate-card-enter">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger animate-pulse-alert" />
              <span className="text-danger font-medium">逾期提醒</span>
              <span className="badge-danger">{overdueList.length} 条逾期</span>
            </div>
            <button className="btn-danger text-xs" onClick={handleBatchRemind}>
              <Bell className="w-3 h-3" />
              一键催还
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2 text-left">档案标题</th>
                  <th className="px-3 py-2 text-left">借阅人</th>
                  <th className="px-3 py-2 text-left">应还日期</th>
                  <th className="px-3 py-2 text-left">逾期天数</th>
                  <th className="px-3 py-2 text-left">逾期费用</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="px-3 py-2 text-text-primary max-w-[180px] truncate">{b.archive_title}</td>
                    <td className="px-3 py-2 text-text-secondary">{b.user_name}</td>
                    <td className="px-3 py-2 text-text-muted text-xs">{b.expected_return?.slice(0, 10)}</td>
                    <td className="px-3 py-2 text-danger font-medium">{getOverdueDays(b.expected_return)}天</td>
                    <td className="px-3 py-2 text-danger">¥{b.overdue_fee}</td>
                    <td className="px-3 py-2">
                      <button
                        className="btn-danger text-xs !px-2 !py-1"
                        onClick={() => handleRemind(b.id)}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                        催还
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {remindMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm animate-fade-in">
          {remindMsg}
        </div>
      )}

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
                <th className="px-4 py-3 text-left">借阅人</th>
                <th className="px-4 py-3 text-left">借阅类型</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">应还日期</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">加载中...</td></tr>
              ) : borrows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">暂无数据</td></tr>
              ) : (
                borrows.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="px-4 py-3 text-text-muted text-xs">{b.created_at?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-text-primary max-w-[180px] truncate">{b.archive_title}</td>
                    <td className="px-4 py-3 text-accent font-mono text-xs">{b.archive_number}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.user_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.borrow_type}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[b.status] || 'badge-accent'}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{b.expected_return?.slice(0, 10) || '-'}</td>
                    <td className="px-4 py-3">
                      {b.status === '已通过' && b.appointment_time && new Date(b.appointment_time) <= new Date() && isAdmin && (
                        <button
                          className="btn-primary text-xs !px-2 !py-1 mr-1"
                          onClick={() => handleConfirmPickup(b.id)}
                          disabled={actionLoading === b.id}
                        >
                          {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                          确认取卷
                        </button>
                      )}
                      {b.status === '待取卷' && isAdmin && (
                        <button
                          className="btn-primary text-xs !px-2 !py-1 mr-1"
                          onClick={() => handleConfirmPickup(b.id)}
                          disabled={actionLoading === b.id}
                        >
                          {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                          确认取卷
                        </button>
                      )}
                      {['已通过', '待取卷', '借出中', '已超期'].includes(b.status) && isAdmin && (
                        <button
                          className="btn-secondary text-xs !px-2 !py-1"
                          onClick={() => handleReturn(b.id)}
                          disabled={actionLoading === b.id}
                        >
                          {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          归还
                        </button>
                      )}
                      {b.status === '借出中' && isAdmin && (
                        <button
                          className="btn-danger text-xs !px-2 !py-1 ml-1"
                          onClick={() => handleRemind(b.id)}
                          disabled={actionLoading === b.id}
                        >
                          <Bell className="w-3 h-3" />
                          催还
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
