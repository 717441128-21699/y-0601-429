import { useState, useEffect } from 'react'
import { FileText, Search, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { Archive, BorrowCreateResult } from '@/types/api'

const BORROW_TYPES = ['阅览', '外借', '复制']

export default function BorrowApply() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Archive | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<BorrowCreateResult | null>(null)
  const [error, setError] = useState('')
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
        const res = await api.getArchives({ pageSize: '20' })
        setArchives(res.list.filter((a) => a.status === '在库'))
      } catch {
        setArchives([])
      } finally {
        setSearching(false)
      }
    }
    doSearch()
  }, [])

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await api.getArchives({ keyword, pageSize: '20' })
      setArchives(res.list.filter((a) => a.status === '在库'))
    } catch {
      setArchives([])
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const res = await api.createBorrow({
        archiveId: selected.id,
        userId: '3',
        purpose: form.purpose,
        borrowType: form.borrowType,
        appointmentTime: form.appointmentTime || undefined,
        expectedReturnDate: form.expectedReturnDate || undefined,
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
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <FileText className="w-5 h-5 text-accent" />
        借阅申请
      </h2>

      {result ? (
        <div className="card-base p-8 animate-card-enter text-center">
          {result.autoApproved ? (
            <>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h3 className="text-heading text-lg mb-2">申请已通过</h3>
              <p className="text-body mb-2">{result.approvalResult}</p>
            </>
          ) : result.status === '已拒绝' ? (
            <>
              <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h3 className="text-heading text-lg mb-2">申请已拒绝</h3>
              <p className="text-body mb-2">{result.approvalResult}</p>
            </>
          ) : (
            <>
              <Clock className="w-16 h-16 text-warning mx-auto mb-4" />
              <h3 className="text-heading text-lg mb-2">等待审批</h3>
              <p className="text-body mb-2">您的借阅申请已提交，等待管理员审批</p>
            </>
          )}
          <button className="btn-primary mt-4" onClick={handleReset}>继续申请</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
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
            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {searching ? (
                <p className="text-text-muted text-sm text-center py-4">搜索中...</p>
              ) : archives.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">暂无可借阅档案</p>
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
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-accent text-xs font-mono">{a.archive_number}</span>
                      <span className="text-text-muted text-xs">{a.type}</span>
                      <span className="badge-success">{a.status}</span>
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
                  <div className="flex items-center gap-3 mt-1 text-xs">
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
                  <label className="text-label block mb-1">预约时间</label>
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
                {error && <p className="text-danger text-sm">{error}</p>}
                <button
                  className="btn-primary w-full"
                  onClick={handleSubmit}
                  disabled={loading || !form.purpose}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  提交申请
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <FileText className="w-10 h-10 mb-2" />
                <p className="text-sm">请先从左侧选择档案</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
