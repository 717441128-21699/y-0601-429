import { useState } from 'react'
import { Archive, Check, Loader2, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { ArchiveCreateResult } from '@/types/api'

const TYPE_OPTIONS = ['文书', '科技', '会计', '人事', '声像', '电子']
const SECRECY_OPTIONS = ['公开', '内部', '秘密', '机密']
const CARRIER_OPTIONS = ['纸质', '胶片', '磁带', '光盘', '硬盘']
const STEPS = ['基本信息', '分配确认', '入库完成']

export default function ArchiveIntake() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ArchiveCreateResult | null>(null)
  const [form, setForm] = useState({
    title: '',
    type: '',
    secrecyLevel: '',
    carrierMaterial: '',
    fonds: '',
    year: '',
    department: '',
    description: '',
  })

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.createArchive({
        title: form.title,
        type: form.type,
        secrecyLevel: form.secrecyLevel,
        carrierMaterial: form.carrierMaterial,
        fonds: form.fonds || undefined,
        year: form.year || undefined,
        department: form.department || undefined,
        description: form.description || undefined,
      })
      setResult(res)
      setStep(1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(0)
    setResult(null)
    setForm({
      title: '',
      type: '',
      secrecyLevel: '',
      carrierMaterial: '',
      fonds: '',
      year: '',
      department: '',
      description: '',
    })
    setError('')
  }

  return (
    <div className="animate-fade-in">
      <h2 className="section-title mb-6">
        <Archive className="w-5 h-5 text-accent" />
        档案入库登记
      </h2>

      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= step ? 'bg-accent text-primary' : 'bg-card text-text-muted border border-border'
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i <= step ? 'text-text-primary' : 'text-text-muted'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card-base p-6 animate-card-enter">
          <h3 className="text-heading text-base mb-4">基本信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-label block mb-1">档案标题 *</label>
              <input
                className="input-base w-full"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="请输入档案标题"
              />
            </div>
            <div>
              <label className="text-label block mb-1">档案类型 *</label>
              <select
                className="input-base w-full"
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              >
                <option value="">请选择</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label block mb-1">保密等级 *</label>
              <select
                className="input-base w-full"
                value={form.secrecyLevel}
                onChange={(e) => updateForm('secrecyLevel', e.target.value)}
              >
                <option value="">请选择</option>
                {SECRECY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label block mb-1">载体材质 *</label>
              <select
                className="input-base w-full"
                value={form.carrierMaterial}
                onChange={(e) => updateForm('carrierMaterial', e.target.value)}
              >
                <option value="">请选择</option>
                {CARRIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label block mb-1">全宗号</label>
              <input
                className="input-base w-full"
                value={form.fonds}
                onChange={(e) => updateForm('fonds', e.target.value)}
                placeholder="如 XX"
              />
            </div>
            <div>
              <label className="text-label block mb-1">年度</label>
              <input
                className="input-base w-full"
                value={form.year}
                onChange={(e) => updateForm('year', e.target.value)}
                placeholder="如 2024"
              />
            </div>
            <div>
              <label className="text-label block mb-1">所属部门</label>
              <input
                className="input-base w-full"
                value={form.department}
                onChange={(e) => updateForm('department', e.target.value)}
                placeholder="请输入部门名称"
              />
            </div>
            <div className="col-span-2">
              <label className="text-label block mb-1">描述</label>
              <textarea
                className="input-base w-full h-20 resize-none"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="请输入档案描述"
              />
            </div>
          </div>
          {error && <p className="text-danger text-sm mt-3">{error}</p>}
          <div className="flex justify-end mt-4">
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !form.title || !form.type || !form.secrecyLevel || !form.carrierMaterial}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              提交并分配库房
            </button>
          </div>
        </div>
      )}

      {step === 1 && result && (
        <div className="card-base p-6 animate-card-enter">
          <h3 className="text-heading text-base mb-4">分配确认</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-label">档号</span>
              <p className="text-text-primary font-medium mt-1">{result.archiveNumber}</p>
            </div>
            <div>
              <span className="text-label">条形码</span>
              <p className="text-text-primary font-medium mt-1">{result.barcode}</p>
            </div>
            <div>
              <span className="text-label">分配库房</span>
              <p className="text-text-primary font-medium mt-1">{result.warehouseName}</p>
            </div>
            <div>
              <span className="text-label">密集架位置</span>
              <p className="text-text-primary font-medium mt-1">{result.shelfPosition}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={handleReset}>取消</button>
            <button className="btn-primary" onClick={() => setStep(2)}>确认入库</button>
          </div>
        </div>
      )}

      {step === 2 && result && (
        <div className="card-base p-8 animate-card-enter text-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-heading text-lg mb-2">入库完成</h3>
          <p className="text-body mb-6">档案已成功入库登记</p>
          <div className="inline-block text-left bg-surface rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <span className="text-text-muted">档号</span>
              <span className="text-text-primary">{result.archiveNumber}</span>
              <span className="text-text-muted">库房</span>
              <span className="text-text-primary">{result.warehouseName}</span>
              <span className="text-text-muted">位置</span>
              <span className="text-text-primary">{result.shelfPosition}</span>
              <span className="text-text-muted">条形码</span>
              <span className="text-text-primary">{result.barcode}</span>
            </div>
          </div>
          <div>
            <button className="btn-primary" onClick={handleReset}>继续入库</button>
          </div>
        </div>
      )}
    </div>
  )
}
