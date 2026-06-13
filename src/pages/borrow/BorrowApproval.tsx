import { useState, useEffect } from 'react'
import { CheckSquare, Check, X, MapPin, Loader2, Calendar, User, FileText, AlertTriangle, PackageCheck } from 'lucide-react'
import { api } from '@/lib/api'
import type { Borrow, AppointmentItem } from '@/types/api'

const TABS = [
  { key: '', label: '全部' },
  { key: '待审批', label: '待审批' },
  { key: '已通过', label: '已通过' },
  { key: '待取卷', label: '待取卷' },
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

  const handleConfirmPickup = async (id: string) => {
    setActionLoading(id)
    try {
      await api.confirmPickup(id)
      await fetchData()
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
    '待取卷': 'badge-accent',
  }

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-'
    return iso.slice(0, 16).replace('T', ' ')
  }

  const formatApptRange = (start?: string, end?: string) => {
    if (!start || !end) return '-'
    const fmt = (s: string) => {
      const d = new Date(s)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${mm}/${dd} ${hh}:${mi}`
    }
    return `${fmt(start)} ~ ${fmt(end)}`
  }

  const isTimeOverlap = (
    aStart: string | undefined,
    aEnd: string | undefined,
    bStart: string | undefined,
    bEnd: string | undefined,
  ) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false
    const aS = new Date(aStart).getTime()
    const aE = new Date(aEnd).getTime()
    const bS = new Date(bStart).getTime()
    const bE = new Date(bEnd).getTime()
    return !(bE <= aS || bS >= aE)
  }

  const hasTableConflict = (b: Borrow, all: Borrow[]) => {
    if (!b.appointment_time || !b.expected_return || !b.archive_id) return false
    return all.some(
      other =>
        other.id !== b.id &&
        other.archive_id === b.archive_id &&
        other.appointment_time &&
        other.expected_return &&
        isTimeOverlap(b.appointment_time, b.expected_return, other.appointment_time, other.expected_return)
    )
  }

  const renderTimeline = () => {
    const allAppts = [
      {
        id: detailModal!.id,
        appointment_time: detailModal!.appointment_time!,
        expected_return: detailModal!.expected_return!,
        status: detailModal!.status,
        user_name: detailModal!.user_name,
      },
      ...appointments.filter(a => a.appointment_time && a.expected_return).map(a => ({
        id: a.id,
        appointment_time: a.appointment_time,
        expected_return: a.expected_return,
        status: a.status,
        user_name: a.user_name,
      })),
    ].filter(a => a.appointment_time && a.expected_return)

    if (allAppts.length === 0) return null

    const times = allAppts.flatMap(a => [new Date(a.appointment_time).getTime(), new Date(a.expected_return).getTime()])
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const totalSpan = maxTime - minTime || 1

    const getColor = (s: string) => {
      switch (s) {
        case '待审批': return '#F59E0B'
        case '已通过': return '#10B981'
        case '待取卷': return '#8B5CF6'
        case '借出中': return '#3B82F6'
        default: return '#6B7280'
      }
    }

    const hasOverlap = (idx: number) => {
      const a = allAppts[idx]
      return allAppts.some((b, j) =>
        j !== idx &&
        new Date(b.appointment_time).getTime() < new Date(a.expected_return).getTime() &&
        new Date(b.expected_return).getTime() > new Date(a.appointment_time).getTime()
      )
    }

    return (
      <div className="mb-4">
        <p className="text-xs text-text-muted mb-2">预约排班视图</p>
        <div className="bg-surface rounded-lg p-3 space-y-1.5">
          <div className="relative flex text-[10px] text-text-muted mb-1 px-1 h-4">
            <span>{new Date(minTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
            <span className="ml-auto">{new Date(maxTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
          </div>
          {allAppts.map((a, i) => {
            const start = ((new Date(a.appointment_time).getTime() - minTime) / totalSpan) * 100
            const end = ((new Date(a.expected_return).getTime() - minTime) / totalSpan) * 100
            const width = Math.max(end - start, 2)
            const overlap = hasOverlap(i)
            return (
              <div key={a.id} className="relative h-6">
                <div
                  className={`absolute top-0.5 h-5 rounded flex items-center px-1.5 text-[11px] text-white font-medium truncate ${overlap ? 'ring-2 ring-danger' : ''}`}
                  style={{ left: `${start}%`, width: `${width}%`, minWidth: '60px', backgroundColor: getColor(a.status) }}
                  title={`${a.user_name} ${formatApptRange(a.appointment_time, a.expected_return)}`}
                >
                  {a.user_name}
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-card">
            {[
              { label: '待审批', color: '#F59E0B' },
              { label: '已通过', color: '#10B981' },
              { label: '待取卷', color: '#8B5CF6' },
              { label: '借出中', color: '#3B82F6' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-text-muted">{l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm border-2 border-danger bg-transparent" />
              <span className="text-[10px] text-text-muted">时间冲突</span>
            </div>
          </div>
        </div>
      </div>
    )
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
                    <td className={`px-4 py-3 text-xs ${b.appointment_time && hasTableConflict(b, borrows) ? 'text-danger' : 'text-text-secondary'}`}>
                      {b.appointment_time ? formatApptRange(b.appointment_time, b.expected_return) : '-'}
                    </td>
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
                          {b.appointment_time && new Date(b.appointment_time) <= new Date() && (
                            <button
                              className="btn-primary text-xs !px-3 !py-1"
                              onClick={() => handleConfirmPickup(b.id)}
                              disabled={actionLoading === b.id}
                            >
                              {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                              确认取卷
                            </button>
                          )}
                          <button
                            className="btn-ghost text-xs !px-3 !py-1"
                            onClick={() => openDetail(b)}
                          >
                            <FileText className="w-3 h-3" />
                            详情
                          </button>
                        </div>
                      ) : b.status === '待取卷' ? (
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-primary text-xs !px-3 !py-1"
                            onClick={() => handleConfirmPickup(b.id)}
                            disabled={actionLoading === b.id}
                          >
                            {actionLoading === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                            确认取卷
                          </button>
                          <button
                            className="btn-secondary text-xs !px-3 !py-1"
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
              {renderTimeline()}
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
                  {appointments.map((appt) => {
                    const overlap = isTimeOverlap(
                      detailModal.appointment_time,
                      detailModal.expected_return,
                      appt.appointment_time,
                      appt.expected_return,
                    )
                    return (
                      <div
                        key={appt.id}
                        className={`bg-surface rounded-lg p-3 ${overlap ? 'border-l-4 border-danger pl-2' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center">
                            <span className={`text-xs ${STATUS_BADGE[appt.status] || 'badge-accent'}`}>{appt.status}</span>
                            {overlap && <AlertTriangle className="w-3 h-3 text-danger inline ml-1" />}
                          </span>
                          <span className="text-xs text-text-muted">{appt.user_name} · {appt.user_department}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          <p>预约时段：{formatApptRange(appt.appointment_time, appt.expected_return)}</p>
                        </div>
                      </div>
                    )
                  })}
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
            {detailModal.status === '待取卷' && (
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-card">
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    handleConfirmPickup(detailModal.id)
                    setDetailModal(null)
                  }}
                  disabled={actionLoading === detailModal.id}
                >
                  {actionLoading === detailModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                  确认取卷
                </button>
                <button
                  className="btn-secondary flex-1"
                  onClick={() => { setDetailModal(null); setAppointments([]) }}
                >
                  关闭
                </button>
              </div>
            )}
            {detailModal.status === '已通过' && detailModal.appointment_time && new Date(detailModal.appointment_time) <= new Date() && (
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-card">
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    handleConfirmPickup(detailModal.id)
                    setDetailModal(null)
                  }}
                  disabled={actionLoading === detailModal.id}
                >
                  {actionLoading === detailModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                  确认取卷
                </button>
                <button
                  className="btn-secondary flex-1"
                  onClick={() => { setDetailModal(null); setAppointments([]) }}
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
