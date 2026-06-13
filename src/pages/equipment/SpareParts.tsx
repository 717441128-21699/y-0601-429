import { useState, useEffect } from 'react'
import { Package, AlertTriangle, X, Minus } from 'lucide-react'
import { api } from '@/lib/api'
import type { SparePart } from '@/types/api'

export default function SpareParts() {
  const [parts, setParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeductModal, setShowDeductModal] = useState(false)
  const [deducting, setDeducting] = useState(false)
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null)
  const [deductQty, setDeductQty] = useState('')
  const [deductOrderId, setDeductOrderId] = useState('')

  const fetchParts = async () => {
    setLoading(true)
    try {
      const data = await api.getSpareParts()
      setParts(data)
    } catch {
      setParts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [])

  const lowStockCount = parts.filter(p => p.quantity < p.safety_stock).length

  const openDeductModal = (part: SparePart) => {
    setSelectedPart(part)
    setDeductQty('')
    setDeductOrderId('')
    setShowDeductModal(true)
  }

  const handleDeduct = async () => {
    if (!selectedPart || !deductQty || Number(deductQty) <= 0) return
    setDeducting(true)
    try {
      await api.deductSparePart(selectedPart.id, Number(deductQty))
      setShowDeductModal(false)
      fetchParts()
    } catch (e) {
      alert(e instanceof Error ? e.message : '扣减失败')
    } finally {
      setDeducting(false)
    }
  }

  const StockBar = ({ current, safety }: { current: number; safety: number }) => {
    const max = Math.max(current, safety) * 1.2
    const currentPct = Math.min(100, (current / max) * 100)
    const safetyPct = Math.min(100, (safety / max) * 100)
    const isLow = current < safety
    return (
      <div className="relative h-4 w-full">
        <div className="absolute inset-0 bg-border/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isLow ? 'bg-danger/60' : 'bg-success/60'}`}
            style={{ width: `${currentPct}%` }}
          />
        </div>
        <div
          className="absolute top-0 h-full w-0.5 bg-warning"
          style={{ left: `${safetyPct}%` }}
        />
      </div>
    )
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
      <h2 className="section-title mb-6">
        <Package className="w-5 h-5 text-accent" />
        备件库存管理
      </h2>

      {lowStockCount > 0 && (
        <div className="card-base p-4 mb-4 border-danger/30 flex items-center gap-3 animate-card-enter">
          <AlertTriangle className="w-5 h-5 text-danger animate-pulse-alert flex-shrink-0" />
          <span className="text-danger font-medium">
            <strong className="text-danger">{lowStockCount}</strong> 种备件库存不足，请及时补充
          </span>
        </div>
      )}

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">备件名称</th>
                <th className="px-4 py-3 text-left">规格</th>
                <th className="px-4 py-3 text-left">库存状况</th>
                <th className="px-4 py-3 text-left">当前库存</th>
                <th className="px-4 py-3 text-left">安全库存</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">暂无备件数据</td>
                </tr>
              ) : (
                parts.map(part => {
                  const isLow = part.quantity < part.safety_stock
                  return (
                    <tr
                      key={part.id}
                      className={`table-row ${isLow ? 'border-l-2 border-l-danger' : ''}`}
                    >
                      <td className="px-4 py-3 text-text-primary">{part.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{part.specification}</td>
                      <td className="px-4 py-3 w-40">
                        <StockBar current={part.quantity} safety={part.safety_stock} />
                      </td>
                      <td className={`px-4 py-3 font-mono ${isLow ? 'text-danger font-medium' : 'text-text-primary'}`}>
                        {part.quantity}
                      </td>
                      <td className="px-4 py-3 text-text-muted font-mono">{part.safety_stock}</td>
                      <td className="px-4 py-3">
                        <span className={isLow ? 'badge-danger' : 'badge-success'}>
                          {isLow ? '库存不足' : '正常'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="btn-secondary text-xs !px-2 !py-1"
                          onClick={() => openDeductModal(part)}
                          disabled={part.quantity <= 0}
                        >
                          <Minus className="w-3 h-3" />
                          扣减
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDeductModal && selectedPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeductModal(false)}>
          <div className="card-base p-6 w-[400px] animate-card-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading text-base">扣减备件</h3>
              <button className="text-text-muted hover:text-text-primary" onClick={() => setShowDeductModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">备件名称</span>
                  <span className="text-text-primary">{selectedPart.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-text-secondary">当前库存</span>
                  <span className={`font-mono ${selectedPart.quantity < selectedPart.safety_stock ? 'text-danger' : 'text-text-primary'}`}>
                    {selectedPart.quantity}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">扣减数量</label>
                <input
                  type="number"
                  className="input-base w-full"
                  value={deductQty}
                  onChange={e => setDeductQty(e.target.value)}
                  min={1}
                  max={selectedPart.quantity}
                  placeholder="请输入扣减数量"
                />
                {Number(deductQty) > selectedPart.quantity && (
                  <p className="text-danger text-xs mt-1">扣减数量不能超过当前库存</p>
                )}
              </div>
              <div>
                <label className="text-text-secondary text-xs mb-1 block">维保工单号（可选）</label>
                <input
                  className="input-base w-full"
                  value={deductOrderId}
                  onChange={e => setDeductOrderId(e.target.value)}
                  placeholder="关联维保工单..."
                />
              </div>
              <button
                className="btn-primary w-full justify-center"
                onClick={handleDeduct}
                disabled={!deductQty || Number(deductQty) <= 0 || Number(deductQty) > selectedPart.quantity || deducting}
              >
                {deducting ? '扣减中...' : '确认扣减'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
