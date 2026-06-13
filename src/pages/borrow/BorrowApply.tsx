import { useState, useEffect } from 'react'
import { FileText, Search, Loader2, CheckCircle, Clock, XCircle, Calendar, User, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import useAppStore from '@/stores/useAppStore'
import type { Archive, BorrowCreateResult, AppointmentItem } from '@/types/api'

const BORROW_TYPES = ['阅览', '外借', '复制']

export default function BorrowApply() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Archive | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<BorrowCreateResult | null>(null)
  const [error, setError] = useState('')
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [apptLoading, setApptLoading] = useState(false)
  const currentUser = useAppStore((s) => s.currentUser)
  const [form, setForm] = useState({
    purpose: '',
    borrowType: '阅览',
    appointmentTime: '',
    expectedReturnDate: '',
  })

  useEffect(() => {
    const doSearch = async () => {
      setSearching(true)
      try {
        const res = await api.getArchives({ pageSize: '50' })
        setArchives(res.list)
      } catch {
        setArchives([])
      } finally {
        setSearching(false)
      }
    }
    doSearch()
  }, [])

  useEffect(() => {
    const loadAppointments = async () => {
      if (!selected) {
        setAppointments([])
        return
      }
      setApptLoading(true)
      try {
        const data = await api.getArchiveAppointments(selected.id)
        setAppointments(data)
      } catch {
        setAppointments([])
      } finally {
        setApptLoading(false)
      }
    }
    loadAppointments()
  }, [selected])

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await api.getArchives({ keyword, pageSize: '50' })
      setArchives(res.list)
    } catch {
      setArchives([])
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selected || !currentUser) return
    setLoading(true)
    setError('')
    try {
      const res = await api.createBorrow({
        archiveId: selected.id,
        userId: currentUser.id,
        purpose: form.purpose,
        borrowType: form.borrowType,
        appointmentTime: form.appointmentTime ? new Date(form.appointmentTime).toISOString() : undefined,
        expectedReturnDate: form.expectedReturnDate ? new Date(form.expectedReturnDate + 'T23:59:59').toISOString() : undefined,
      })
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '申请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setSelected(null)
    setForm({ purpose: '', borrowType: '阅览', appointmentTime: '', expectedReturnDate: '' })
    setError('')
    setAppointments([])
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const getAppointmentStatusBadge = (status: string) => {
    switch (status) {
      case '已通过': return 'badge-success'
      case '待审批': return 'badge-warning'
      case '借出中': return 'badge-accent'
      default: return 'badge-accent'
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title m-0">
          <FileText className="w-5 h-5 text-accent" />
          借阅申请
        </h2>
        {currentUser && (
          <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface px-4 py-2 rounded-lg">
            <User className="w-4 h-4 text-accent" />
            <span>{currentUser.name}</span>
            <span className="text-text-muted">·</span>
            <span>{currentUser.department}</span>
          </div>
        )}
      </div>

      {result ? (
        <div className="card-base p-8 animate-card-enter text-center">
          {result.autoApproved ? (
            <>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h3 className="text-heading text-lg mb-2">自动通过</h3>
              <p className="text-body mb-2">{result.approvalResult || '您的借阅申请已自动通过审批'}</p>
            </>
          ) : result.status === '已拒绝' ? (
            <>
              <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h3 className="text-heading text-lg mb-2">已拒绝</h3>
              <p className="text-body mb-2">{result.approvalResult || '您的借阅申请未通过审批'}</p>
            </>
          ) : (
            <>
              <Clock className="w-16 h-16 text-warning mx-auto mb-4" />
              <h3 className="text-heading text-lg mb-2">待人工审批</h3>
              <p className="text-body mb-2">{result.approvalResult || '您的借阅申请已提交，等待管理员审批'}</p>
            </>
          )}
          <button className="btn-primary mt-4" onClick={handleReset}>继续申请</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="card-base p-4">
            <h3 className="text-heading text-sm mb-3">档案搜索</h3>
            <div className="flex gap-2 mb-3">
              <input
                className="input-base flex-1"
                placeholder="输入关键词搜索档案..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn-primary" onClick={handleSearch} disabled={searching}>
                <Search className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[600px] overflow-y-auto space-y-1">
              {searching ? (
                <p className="text-text-muted text-sm text-center py-4">搜索中...</p>
              ) : archives.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">暂无档案</p>
              ) : (
                archives.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selected?.id === a.id
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-card-50 border border-transparent'
                    }`}
                    onClick={() => setSelected(a)}
                  >
                    <p className="text-text-primary text-sm font-medium truncate">{a.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-accent text-xs font-mono">{a.archive_number}</span>
                      <span className="text-text-muted text-xs">{a.type}</span>
                      <span className={a.status === '在库' ? 'badge-success' : a.status === '借出' ? 'badge-danger' : 'badge-warning'}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-base p-4">
            <h3 className="text-heading text-sm mb-3">申请信息</h3>
            {selected ? (
              <div className="space-y-4">
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-text-primary font-medium">{selected.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                    <span className="text-accent font-mono">{selected.archive_number}</span>
                    <span className="text-text-muted">{selected.type} · {selected.secrecy_level}</span>
                  </div>
                </div>
                <div>
                  <label className="text-label block mb-1">借阅目的</label>
                  <textarea
                    className="input-base w-full h-20 resize-none"
                    value={form.purpose}
                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                    placeholder="请输入借阅目的"
                  />
                </div>
                <div>
                  <label className="text-label block mb-1">借阅类型</label>
                  <select
                    className="input-base w-full"
                    value={form.borrowType}
                    onChange={(e) => setForm((f) => ({ ...f, borrowType: e.target.value }))}
                  >
                    {BORROW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-label block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    预约时间
                  </label>
                  <input
                    type="datetime-local"
                    className="input-base w-full"
                    value={form.appointmentTime}
                    onChange={(e) => setForm((f) => ({ ...f, appointmentTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-label block mb-1">预计归还日期</label>
                  <input
                    type="date"
                    className="input-base w-full"
                    value={form.expectedReturnDate}
                    onChange={(e) => setForm((f) => ({ ...f, expectedReturnDate: e.target.value }))}
                  />
                </div>
                {selected.status !== '在库' && (
                  <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary">
                      档案当前状态为 <span className="text-warning font-medium">{selected.status}</span>，
                      可通过预约时间选择未来时段借阅
                    </p>
                  </div>
                )}
                {error && <p className="text-danger text-sm">{error}</p>}
                <button
                  className="btn-primary w-full"
                  onClick={handleSubmit}
                  disabled={loading || !form.purpose || !currentUser || selected.status === '借出'}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selected.status === '借出' ? '档案已借出，无法预约' : '提交申请'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <FileText className="w-10 h-10 mb-2" />
                <p className="text-sm">请先从左侧选择档案</p>
              </div>
            )}
          </div>

          <div className="card-base p-4">
            <h3 className="text-heading text-sm mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-accent" />
                预约占用视图
              </span>
              {apptLoading && <Loader2 className="w-3 h-3 animate-spin text-text-muted" />}
            </h3>
            {selected ? (
              <div className="space-y-3">
                <div className="bg-surface rounded-lg p-3 mb-4">
                  <p className="text-xs text-text-muted mb-1">选中档案</p>
                  <p className="text-sm font-medium text-text-primary truncate">{selected.title}</p>
                  <p className="text-xs text-accent font-mono mt-1">{selected.archive_number}</p>
                </div>
                {appointments.length === 0 ? (
                  <div className="py-12 text-center text-text-muted">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success/60" />
                    <p className="text-sm">暂无预约占用</p>
                    <p className="text-xs mt-1">该档案所有时段均可预约</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {appointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="bg-surface rounded-lg p-3 border border-card"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={getAppointmentStatusBadge(appt.status)}>{appt.status}</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-text-muted">申请人</span>
                            <span className="text-text-primary">{appt.user_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">部门</span>
                            <span className="text-text-primary">{appt.user_department}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">预约时间</span>
                            <span className="text-text-primary text-right">{formatDateTime(appt.appointment_time)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">预计归还</span>
                            <span className="text-text-primary text-right">{formatDateTime(appt.expected_return)}</span>
                          </div>
                          {appt.approval_result && (
                            <div className="pt-1 border-t border-card mt-2">
                              <span className="text-text-muted">{appt.approval_result}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Calendar className="w-10 h-10 mb-2" />
                <p className="text-sm">选择档案后查看</p>
                <p className="text-xs mt-1">该档案未来预约占用情况</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
