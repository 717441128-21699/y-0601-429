import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const warehouseId = req.query.warehouseId as string
    const status = req.query.status as string

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (warehouseId) {
      where += ' AND e.warehouse_id = ?'
      params.push(warehouseId)
    }
    if (status) {
      where += ' AND e.status = ?'
      params.push(status)
    }

    const equipment = db.prepare(
      `SELECT e.*, w.name as warehouse_name
       FROM equipment e
       LEFT JOIN warehouses w ON e.warehouse_id = w.id
       ${where}
       ORDER BY e.name`
    ).all(...params)

    res.json({ success: true, data: equipment })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取设备列表失败' })
  }
})

router.get('/maintenance', (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      where += ' AND mo.status = ?'
      params.push(status)
    }

    const orders = db.prepare(
      `SELECT mo.*, e.name as equipment_name, e.type as equipment_type,
              mt.name as team_name
       FROM maintenance_orders mo
       LEFT JOIN equipment e ON mo.equipment_id = e.id
       LEFT JOIN maintenance_teams mt ON mo.team_id = mt.id
       ${where}
       ORDER BY mo.created_at DESC`
    ).all(...params)

    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取维保工单失败' })
  }
})

router.post('/maintenance', (req: Request, res: Response): void => {
  try {
    const { equipmentId, type, description, teamId } = req.body

    if (!equipmentId || !type) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId) as any
    if (!equipment) {
      res.status(404).json({ success: false, error: '设备不存在' })
      return
    }

    const suggestions: string[] = []
    if (equipment.running_hours > 2000) {
      suggestions.push(`运行时长${equipment.running_hours}小时，超过2000小时维保阈值`)
    }
    if (equipment.switch_count > 5000) {
      suggestions.push(`开关次数${equipment.switch_count}次，超过5000次维保阈值`)
    }

    const id = uuidv4()

    db.prepare(
      `INSERT INTO maintenance_orders (id, equipment_id, type, description, team_id, status)
       VALUES (?, ?, ?, ?, ?, '待处理')`
    ).run(id, equipmentId, type, description || null, teamId || null)

    if (suggestions.length > 0) {
      db.prepare("UPDATE equipment SET status = '维修中' WHERE id = ?").run(equipmentId)
    }

    res.status(201).json({
      success: true,
      data: {
        id,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建维保工单失败' })
  }
})

router.put('/maintenance/:id', (req: Request, res: Response): void => {
  try {
    const order = db.prepare('SELECT * FROM maintenance_orders WHERE id = ?').get(req.params.id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '维保工单不存在' })
      return
    }

    const { status, sparePartsUsed } = req.body

    if (!status) {
      res.status(400).json({ success: false, error: '缺少状态字段' })
      return
    }

    const update = db.transaction(() => {
      if (status === '已完成') {
        db.prepare(
          "UPDATE maintenance_orders SET status = '已完成', completed_at = datetime('now') WHERE id = ?"
        ).run(req.params.id)

        db.prepare(
          "UPDATE equipment SET status = '运行中', running_hours = 0, switch_count = 0, last_maintenance = datetime('now') WHERE id = ?"
        ).run(order.equipment_id)

        if (sparePartsUsed && Array.isArray(sparePartsUsed)) {
          for (const sp of sparePartsUsed) {
            const part = db.prepare('SELECT * FROM spare_parts WHERE id = ?').get(sp.sparePartId) as any
            if (part) {
              const deductQty = Math.min(sp.quantity || 0, part.quantity)
              db.prepare(
                'UPDATE spare_parts SET quantity = quantity - ? WHERE id = ?'
              ).run(deductQty, sp.sparePartId)
            }
          }
        }
      } else if (status === '进行中') {
        db.prepare(
          "UPDATE maintenance_orders SET status = '进行中' WHERE id = ?"
        ).run(req.params.id)
      }
    })

    update()

    const updated = db.prepare(
      `SELECT mo.*, e.name as equipment_name, mt.name as team_name
       FROM maintenance_orders mo
       LEFT JOIN equipment e ON mo.equipment_id = e.id
       LEFT JOIN maintenance_teams mt ON mo.team_id = mt.id
       WHERE mo.id = ?`
    ).get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新维保工单失败' })
  }
})

router.get('/spare-parts', (req: Request, res: Response): void => {
  try {
    const lowStock = req.query.lowStock as string

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (lowStock === 'true') {
      where += ' AND sp.quantity < sp.safety_stock'
    }

    const parts = db.prepare(
      `SELECT sp.*, w.name as warehouse_name
       FROM spare_parts sp
       LEFT JOIN warehouses w ON sp.warehouse_id = w.id
       ${where}
       ORDER BY sp.name`
    ).all(...params)

    res.json({ success: true, data: parts })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取备件列表失败' })
  }
})

router.post('/spare-parts/deduct', (req: Request, res: Response): void => {
  try {
    const { sparePartId, quantity } = req.body

    if (!sparePartId || !quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: '无效的扣减参数' })
      return
    }

    const part = db.prepare('SELECT * FROM spare_parts WHERE id = ?').get(sparePartId) as any
    if (!part) {
      res.status(404).json({ success: false, error: '备件不存在' })
      return
    }

    if (part.quantity < quantity) {
      res.status(400).json({ success: false, error: '库存不足' })
      return
    }

    db.prepare('UPDATE spare_parts SET quantity = quantity - ? WHERE id = ?').run(quantity, sparePartId)

    const updated = db.prepare(
      `SELECT sp.*, w.name as warehouse_name
       FROM spare_parts sp
       LEFT JOIN warehouses w ON sp.warehouse_id = w.id
       WHERE sp.id = ?`
    ).get(sparePartId)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '扣减备件失败' })
  }
})

router.get('/teams', (req: Request, res: Response): void => {
  try {
    const teams = db.prepare(
      `SELECT mt.*,
              (SELECT COUNT(*) FROM maintenance_orders WHERE team_id = mt.id AND status = '待处理') as pending_count,
              (SELECT COUNT(*) FROM maintenance_orders WHERE team_id = mt.id AND status = '进行中') as in_progress_count
       FROM maintenance_teams mt
       ORDER BY mt.name`
    ).all()

    res.json({ success: true, data: teams })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取维修班组失败' })
  }
})

export default router
