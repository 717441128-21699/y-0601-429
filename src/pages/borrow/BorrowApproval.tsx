import { useState, useEffect } from 'react'
import { CheckSquare, Check, X, MapPin, Loader2, Calendar, User, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import type { Borrow, AppointmentItem } from '@/types/api'

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
  const [detailModal, setDetailModal] = useState<Borrow | null>(null)
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [apptLoading, setApptLoading] = useState(false)

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

  const openDetail = async (b: Borrow) => {
    setDetailModal(b)
    if (b.archive_id) {
      setApptLoading(true)
      try {
        const data = await api.getArchiveAppointments(b.archive_id)
        setAppointments(data.filter(a => a.id !== b.id))
      } catch {
        setAppointments([])
      } finally {
        setApptLoading(false)
      }
    }
  }

  const handleApprove = async (id: string, approved: boolean) => {
    setActionLoading(id)
    try {
      const updated = await api.approveBorrow(id, approved)
      await fetchData()
      if (approved && updated.warehouse_name) {
        setPickupModal(updated as Borrow)
      }
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

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-'
    return iso.slice(0, 16).replace('T', ' ')
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
            {tab.key && (
              <span className="ml-1.5 text-xs opacity-70">
                ({borrows.filter(b => b.status === tab.key).length})
              </span>
            )}
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
                <th className="px-4 py-3 text-left">预约时间</th>
                <th className="px-4 py-3 text-left">审批结果</th>
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
                    <td className="px-4 py-3 text-text-muted text-xs">{formatDateTime(b.created_at)}</td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate">{b.archive_title}</td>
                    <td className="px-4 py-3 text-accent font-mono text-xs">{b.archive_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <User className="w-3 h-3 text-text-muted" />
                        <span>{b.user_name}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{b.user_department}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{b.borrow_type}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{b.appointment_time ? formatDateTime(b.appointment_time) : '-'}</td>
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
                          <button
                            className="btn-secondary text-xs !px-3 !py-1"
                            onClick={() => openDetail(b)}
                          >
                            <FileText className="w-3 h-3" />
                            详情
                          </button>
                        </div>
                      ) : b.status === '已通过' ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-secondary text-xs !px-3 !py-1"
                            onClick={() => setPickupModal(b)}
                          >
                            <MapPin className="w-3 h-3" />
                            取卷通知
                          </button>
                          <button
                            className="btn-ghost text-xs !px-3 !py-1"
                            onClick={() => openDetail(b)}
                          >
                            <FileText className="w-3 h-3" />
                            详情
                          </button>
                        </div>
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
          <div className="card-base p-6 w-[460px] animate-card-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-heading text-lg">取卷通知</h3>
                <p className="text-text-muted text-xs">请前往以下位置取卷</p>
              </div>
            </div>

            <div className="bg-surface rounded-lg p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">档案标题</span>
                <span className="text-text-primary font-medium max-w-[240px] text-right">{pickupModal.archive_title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">档号</span>
                <span className="text-accent font-mono">{pickupModal.archive_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">借阅人</span>
                <span className="text-text-primary">{pickupModal.user_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">预约时间</span>
                <span className="text-text-primary">{pickupModal.appointment_time ? formatDateTime(pickupModal.appointment_time) : '待定'}</span>
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-text-primary">取卷位置</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">库房名称</span>
                <span className="text-text-primary font-medium">{pickupModal.warehouse_name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">密集架号</span>
                <span className="text-text-primary font-medium">{pickupModal.shelf_code || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">具体位置</span>
                <span className="text-text-primary font-medium">{pickupModal.shelf_position || '-'}</span>
              </div>
            </div>

            <button className="btn-primary w-full mt-5" onClick={() => setPickupModal(null)}>知道了</button>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setDetailModal(null); setAppointments([]) }}>
          <div className="card-base p-6 w-[600px] max-h-[85vh] animate-card-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-heading text-lg">借阅详情</h3>
              <button className="btn-ghost !p-2" onClick={() => { setDetailModal(null); setAppointments([]) }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-label text-xs mb-1">档案标题</p>
                <p className="text-text-primary text-sm">{detailModal.archive_title}</p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">档号</p>
                <p className="text-accent font-mono text-sm">{detailModal.archive_number}</p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">申请人</p>
                <p className="text-text-primary text-sm">{detailModal.user_name} · {detailModal.user_department}</p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">借阅类型</p>
                <p className="text-text-primary text-sm">{detailModal.borrow_type}</p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">预约时间</p>
                <p className="text-text-primary text-sm">{detailModal.appointment_time ? formatDateTime(detailModal.appointment_time) : '-'}</p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">预计归还</p>
                <p className="text-text-primary text-sm">{detailModal.expected_return ? formatDateTime(detailModal.expected_return) : '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-label text-xs mb-1">借阅目的</p>
                <p className="text-text-primary text-sm">{detailModal.purpose || '-'}</p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">审批状态</p>
                <p className="text-sm">
                  <span className={STATUS_BADGE[detailModal.status] || 'badge-accent'}>{detailModal.status}</span>
                </p>
              </div>
              <div>
                <p className="text-label text-xs mb-1">审批结果</p>
                <p className="text-text-primary text-sm">{detailModal.approval_result || '-'}</p>
              </div>
            </div>

            <div className="border-t border-card pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-heading text-sm flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent" />
                  该档案其他预约占用
                </h4>
                {apptLoading && <Loader2 className="w-3 h-3 animate-spin text-text-muted" />}
              </div>
              {appointments.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-4">无其他预约占用记录</p>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="bg-surface rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs ${STATUS_BADGE[appt.status] || 'badge-accent'}`}>{appt.status}</span>
                        <span className="text-xs text-text-muted">{appt.user_name} · {appt.user_department}</span>
                      </div>
                      <div className="text-xs text-text-secondary space-y-0.5">
                        <p>预约：{formatDateTime(appt.appointment_time)}</p>
                        <p>归还：{formatDateTime(appt.expected_return)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detailModal.status === '待审批' && (
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-card">
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    handleApprove(detailModal.id, true)
                    setDetailModal(null)
                  }}
                  disabled={actionLoading === detailModal.id}
                >
                  {actionLoading === detailModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  通过
                </button>
                <button
                  className="btn-danger flex-1"
                  onClick={() => {
                    handleApprove(detailModal.id, false)
                    setDetailModal(null)
                  }}
                  disabled={actionLoading === detailModal.id}
                >
                  <X className="w-4 h-4" />
                  拒绝
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
