import { useState, useEffect } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { Archive } from '@/types/api'

const TYPE_OPTIONS = ['文书', '科技', '会计', '人事', '声像', '电子']
const SECRECY_OPTIONS = ['公开', '内部', '秘密', '机密']
const STATUS_OPTIONS = ['在库', '借出', '锁定']

const STATUS_BADGE: Record<string, string> = {
  '在库': 'badge-success',
  '借出': 'badge-warning',
  '锁定': 'badge-accent',
}

export default function ArchiveList() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<Archive | null>(null)
  const [filters, setFilters] = useState({
    type: '',
    secrecyLevel: '',
    status: '',
    keyword: '',
  })

  const fetchData = async (p: number = page) => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(p), pageSize: '10' }
      if (filters.type) params.type = filters.type
      if (filters.secrecyLevel) params.secrecyLevel = filters.secrecyLevel
      if (filters.status) params.status = filters.status
      if (filters.keyword) params.keyword = filters.keyword
      const res = await api.getArchives(params)
      setArchives(res.list)
      setTotal(res.total)
      setTotalPages(res.totalPages)
      setPage(res.page)
    } catch {
      setArchives([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => fetchData(1)

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages) fetchData(p)
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <Search className="w-5 h-5 text-accent" />
        档案查询
      </h2>

      <div className="card-base p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input-base"
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">全部类型</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="input-base"
            value={filters.secrecyLevel}
            onChange={(e) => setFilters((f) => ({ ...f, secrecyLevel: e.target.value }))}
          >
            <option value="">全部密级</option>
            {SECRECY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="input-base"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="input-base flex-1 min-w-[200px]"
            placeholder="搜索档号、标题或部门..."
            value={filters.keyword}
            onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn-primary" onClick={handleSearch}>
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">档号</th>
                <th className="px-4 py-3 text-left">标题</th>
                <th className="px-4 py-3 text-left">类型</th>
                <th className="px-4 py-3 text-left">保密等级</th>
                <th className="px-4 py-3 text-left">载体材质</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">库房</th>
                <th className="px-4 py-3 text-left">密集架</th>
                <th className="px-4 py-3 text-left">入库日期</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">加载中...</td></tr>
              ) : archives.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">暂无数据</td></tr>
              ) : (
                archives.map((a) => (
                  <tr
                    key={a.id}
                    className="table-row cursor-pointer"
                    onClick={() => setDetail(a)}
                  >
                    <td className="px-4 py-3 text-accent font-mono text-xs">{a.archive_number}</td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate">{a.title}</td>
                    <td className="px-4 py-3 text-text-secondary">{a.type}</td>
                    <td className="px-4 py-3 text-text-secondary">{a.secrecy_level}</td>
                    <td className="px-4 py-3 text-text-secondary">{a.carrier_material}</td>
                    <td className="px-4 py-3"><span className={STATUS_BADGE[a.status] || 'badge-accent'}>{a.status}</span></td>
                    <td className="px-4 py-3 text-text-secondary">{a.warehouse_name}</td>
                    <td className="px-4 py-3 text-text-secondary">{a.shelf_code}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{a.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-text-muted text-sm">共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button
              className="p-1 rounded hover:bg-card text-text-secondary disabled:opacity-30"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="text-text-muted px-1">...</span>}
                  <button
                    className={`w-8 h-8 rounded text-sm ${
                      p === page ? 'bg-accent text-primary font-medium' : 'text-text-secondary hover:bg-card'
                    }`}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              className="p-1 rounded hover:bg-card text-text-secondary disabled:opacity-30"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="card-base p-6 w-[500px] max-h-[80vh] overflow-y-auto animate-card-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading text-base">档案详情</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setDetail(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['档号', detail.archive_number],
                ['标题', detail.title],
                ['类型', detail.type],
                ['保密等级', detail.secrecy_level],
                ['载体材质', detail.carrier_material],
                ['全宗号', detail.fonds],
                ['年度', detail.year],
                ['部门', detail.department],
                ['状态', detail.status],
                ['库房', detail.warehouse_name],
                ['密集架', detail.shelf_code],
                ['条形码', detail.barcode],
                ['描述', detail.description],
                ['入库日期', detail.created_at?.slice(0, 10)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex">
                  <span className="text-text-muted w-24 shrink-0">{label}</span>
                  <span className="text-text-primary flex-1">{value || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
