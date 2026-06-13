import { useState, useEffect } from 'react'
import { Wrench, Plus, X, Play, Check, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { MaintenanceOrder, MaintenanceTeam, Equipment } from '@/types/api'

const COLUMNS = [
  { key: '待处理', label: '待处理', color: 'border-warning', bg: 'bg-warning/5' },
  { key: '进行中', label: '进行中', color: 'border-accent', bg: 'bg-accent/5' },
  { key: '已完成', label: '已完成', color: 'border-success', bg: 'bg-success/5' },
] as const

const TYPE_BADGE: Record<string, string> = {
  '定期维保': 'badge-accent',
  '故障维修': 'badge-warning',
  '紧急维修': 'badge-danger',
}

const PRIORITY_BADGE: Record<string, string> = {
  '低': 'badge-success',
  '中': 'badge-accent',
  '高': 'badge-warning',
  '紧急': 'badge-danger',
}

const ORDER_TYPES = ['定期维保', '故障维修', '紧急维修']
const PRIORITY_OPTIONS = ['低', '中', '高', '紧急']

export default function EquipmentMaintenance() {
  const [orders, setOrders] = useState<MaintenanceOrder[]>([])
  const [teams, setTeams] = useState<MaintenanceTeam[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    equipmentId: '', type: '', description: '', priority: '中',
  })

  const fetchOrders = async () => {
    try {
      const data = await api.getMaintenanceOrders()
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const data = await api.getMaintenanceTeams()
      setTeams(data)
    } catch {
      setTeams([])
    }
  }

  const fetchEquipment = async () => {
    try {
      const data = await api.getEquipment()
      setEquipmentList(data)
    } catch {
      setEquipmentList([])
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchTeams()
    fetchEquipment()
  }, [])

  const handleStartOrder = (orderId: string) => {
    setActiveOrderId(orderId)
    setShowTeamModal(true)
  }

  const handleAssignTeam = async (teamId: string) => {
    if (!activeOrderId) return
    try {
      await api.updateMaintenanceOrder(activeOrderId, { status: '进行中', teamId })
      setShowTeamModal(false)
      setActiveOrderId(null)
      fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await api.updateMaintenanceOrder(orderId, { status: '已完成' })
      fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleCreate = async () => {
    if (!createForm.equipmentId || !createForm.type) return
    setSubmitting(true)
    try {
      await api.createMaintenanceOrder({
        equipmentId: createForm.equipmentId,
        type: createForm.type,
        description: createForm.description,
        priority: createForm.priority,
      })
      setShowCreateModal(false)
      setCreateForm({ equipmentId: '', type: '', description: '', priority: '中' })
      fetchOrders()
    } catch (e) {
      alert(e instanceof Error ? e.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getOrdersByStatus = (status: string) => orders.filter(o => o.status === status)

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    } catch {
      return d
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">
          <Wrench className="w-5 h-5 text-accent" />
          维保工单管理
        </h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          新建工单
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colOrders = getOrdersByStatus(col.key)
          return (
            <div key={col.key} className={`rounded-lg border-t-2 ${col.color} ${col.bg} p-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">{col.label}</h3>
                <span className="badge badge-accent">{colOrders.length}</span>
              </div>
              <div className="space-y-3">
                {colOrders.map(order => (
                  <div key={order.id} className="card-base p-4 animate-card-enter">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary">{order.equipment_name}</span>
                      {order.priority && <span className={PRIORITY_BADGE[order.priority] || 'badge-accent'}>{order.priority}</span>}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={TYPE_BADGE[order.type] || 'badge-accent'}>{order.type}</span>
                    </div>
                    {order.description && (
                      <p className="text-xs text-text-secondary mb-2 line-clamp-2">{order.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                      {order.team_name && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {order.team_name}
                        </span>
                      )}
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    {order.status === '待处理' && (
                      <button
                        className="btn-primary text-xs w-full justify-center !py-1.5"
                        onClick={() => handleStartOrder(order.id)}
                      >
                        <Play className="w-3 h-3" />
                        开始处理
                      </button>
                    )}
                    {order.status === '进行中' && (
                      <button
                        className="btn-secondary text-xs w-full justify-center !py-1.5"
                        onClick={() => handleCompleteOrder(order.id)}
                      >
                        <Check className="w-3 h-3" />
                        完成
                      </button>
                    )}
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <div className="text-center py-8 text-text-muted text-sm">暂无工单</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTeamModal(false)}>
          <div className="card-base p-6 w-[400px] animate-card-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading text-base">选择维修班组</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShowTeamModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {teams.map(team => (
                <button
                  key={team.id}
                  className="w-full p-3 rounded-lg bg-surface border border-border hover:border-accent/30 text-left transition-colors"
                  onClick={() => handleAssignTeam(team.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{team.name}</span>
                    <span className="badge badge-accent">{team.specialty}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{team.members} 人</p>
                </button>
              ))}
              {teams.length === 0 && <p className="text-center text-text-muted text-sm py-4">暂无班组</p>}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="card-base p-6 w-[440px] animate-card-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading text-base">新建工单</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-text-secondary text-xs mb-1 block">选择设备</label>
                <select className="input-base w-full" value={createForm.equipmentId} onChange={e => setCreateForm(f => ({ ...f, equipmentId: e.target.value }))}>
                  <option value="">请选择设备</option>
                  {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.warehouse_name})</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">工单类型</label>
                <select className="input-base w-full" value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="">请选择类型</option>
                  {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">优先级</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                        createForm.priority === p ? PRIORITY_BADGE[p] : 'bg-surface text-text-secondary border border-border'
                      }`}
                      onClick={() => setCreateForm(f => ({ ...f, priority: p }))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">描述</label>
                <textarea className="input-base w-full h-20 resize-none" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="请描述问题..." />
              </div>
              <button className="btn-primary w-full justify-center" onClick={handleCreate} disabled={!createForm.equipmentId || !createForm.type || submitting}>
                {submitting ? '提交中...' : '创建工单'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
