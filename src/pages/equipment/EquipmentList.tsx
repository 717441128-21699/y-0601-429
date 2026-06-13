import { useState, useEffect } from 'react'
import { Server, Plus, X, Wrench } from 'lucide-react'
import { api } from '@/lib/api'
import type { Equipment } from '@/types/api'

const STATUS_BADGE: Record<string, string> = {
  '运行中': 'badge-success',
  '停机': 'badge-warning',
  '维修中': 'badge-danger',
}

const TYPE_OPTIONS = ['定期维保', '故障维修', '紧急维修']
const PRIORITY_OPTIONS = ['低', '中', '高', '紧急']
const PRIORITY_BADGE: Record<string, string> = {
  '低': 'badge-success',
  '中': 'badge-accent',
  '高': 'badge-warning',
  '紧急': 'badge-danger',
}

interface CreateOrderForm {
  equipmentId: string
  equipmentName: string
  type: string
  description: string
  priority: string
}

export default function EquipmentList() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateOrderForm>({
    equipmentId: '', equipmentName: '', type: '', description: '', priority: '中',
  })

  const fetchEquipment = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (warehouseFilter) params.warehouseId = warehouseFilter
      if (statusFilter) params.status = statusFilter
      const data = await api.getEquipment(params)
      setEquipment(data)
    } catch {
      setEquipment([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [warehouseFilter, statusFilter])

  const openCreateModal = (eq?: Equipment) => {
    if (eq) {
      setForm({
        equipmentId: eq.id,
        equipmentName: eq.name,
        type: '',
        description: '',
        priority: '中',
      })
    } else {
      setForm({ equipmentId: '', equipmentName: '', type: '', description: '', priority: '中' })
    }
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.equipmentId || !form.type) return
    setSubmitting(true)
    try {
      await api.createMaintenanceOrder({
        equipmentId: form.equipmentId,
        type: form.type,
        description: form.description,
        priority: form.priority,
      })
      setShowModal(false)
      fetchEquipment()
    } catch (e) {
      alert(e instanceof Error ? e.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const ProgressBar = ({ value, max, dangerThreshold }: { value: number; max: number; dangerThreshold: number }) => {
    const pct = Math.min(100, (value / max) * 100)
    const isDanger = value > dangerThreshold
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isDanger ? 'bg-danger' : 'bg-success'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-mono w-14 text-right ${isDanger ? 'text-danger' : 'text-text-muted'}`}>
          {value.toLocaleString()}/{max.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">
          <Server className="w-5 h-5 text-accent" />
          设备台账
        </h2>
        <button className="btn-primary" onClick={() => openCreateModal()}>
          <Plus className="w-4 h-4" />
          新建维保工单
        </button>
      </div>

      <div className="card-base p-4 mb-4">
        <div className="flex items-center gap-3">
          <select className="input-base" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="">全部库房</option>
            {[...new Set(equipment.map(e => e.warehouse_name))].map(name => (
              <option key={name} value={equipment.find(e => e.warehouse_name === name)?.warehouse_id || ''}>{name}</option>
            ))}
          </select>
          <select className="input-base" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="运行中">运行中</option>
            <option value="停机">停机</option>
            <option value="维修中">维修中</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : equipment.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Server className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">暂无设备数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map(eq => {
            const needsMaintenance = eq.running_hours > 2000 || eq.switch_count > 5000
            return (
              <div key={eq.id} className="card-base p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">{eq.name}</h4>
                    <p className="text-xs text-text-muted">{eq.type}</p>
                  </div>
                  <span className={STATUS_BADGE[eq.status] || 'badge-accent'}>{eq.status}</span>
                </div>
                <p className="text-xs text-text-muted mb-3">{eq.warehouse_name}</p>

                <div className="space-y-2 mb-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>运行时长</span>
                    </div>
                    <ProgressBar value={eq.running_hours} max={5000} dangerThreshold={2000} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>开关次数</span>
                    </div>
                    <ProgressBar value={eq.switch_count} max={10000} dangerThreshold={5000} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted mb-3">
                  <span>上次维保: {eq.last_maintenance ? eq.last_maintenance.slice(0, 10) : '无记录'}</span>
                </div>

                {needsMaintenance && (
                  <button
                    className="btn-danger text-xs w-full justify-center"
                    onClick={() => openCreateModal(eq)}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    创建维保工单
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card-base p-6 w-[440px] animate-card-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading text-base">新建维保工单</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {form.equipmentName && (
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">设备名称</label>
                  <input className="input-base w-full bg-card" value={form.equipmentName} readOnly />
                </div>
              )}
              {!form.equipmentId && (
                <div>
                  <label className="text-text-secondary text-xs mb-1 block">选择设备</label>
                  <select
                    className="input-base w-full"
                    value={form.equipmentId}
                    onChange={e => {
                      const eq = equipment.find(eq => eq.id === e.target.value)
                      setForm(f => ({ ...f, equipmentId: e.target.value, equipmentName: eq?.name || '' }))
                    }}
                  >
                    <option value="">请选择设备</option>
                    {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-text-secondary text-xs mb-1 block">工单类型</label>
                <select className="input-base w-full" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="">请选择类型</option>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">优先级</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                        form.priority === p ? PRIORITY_BADGE[p] : 'bg-surface text-text-secondary border border-border'
                      }`}
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">描述</label>
                <textarea
                  className="input-base w-full h-20 resize-none"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="请描述维保原因..."
                />
              </div>
              <button
                className="btn-primary w-full justify-center"
                onClick={handleSubmit}
                disabled={!form.equipmentId || !form.type || submitting}
              >
                {submitting ? '提交中...' : '提交工单'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
