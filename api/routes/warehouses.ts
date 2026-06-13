import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const warehouses = db.prepare('SELECT * FROM warehouses').all() as any[]

    const data = warehouses.map(w => {
      const shelves = db.prepare(
        'SELECT * FROM shelves WHERE warehouse_id = ? ORDER BY code'
      ).all(w.id) as any[]

      return {
        ...w,
        shelves,
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取库房列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id) as any
    if (!warehouse) {
      res.status(404).json({ success: false, error: '库房不存在' })
      return
    }

    const shelves = db.prepare(
      `SELECT s.*,
              ROUND(CAST(s.used AS REAL) / s.capacity * 100, 2) as usage_rate
       FROM shelves s
       WHERE s.warehouse_id = ?
       ORDER BY s.code`
    ).all(req.params.id) as any[]

    const latestSensor = db.prepare(
      'SELECT * FROM sensor_data WHERE warehouse_id = ? ORDER BY recorded_at DESC LIMIT 1'
    ).get(req.params.id) as any

    const equipment = db.prepare(
      'SELECT * FROM equipment WHERE warehouse_id = ?'
    ).all(req.params.id) as any[]

    const archiveStats = db.prepare(
      `SELECT a.type, a.secrecy_level, COUNT(*) as count
       FROM archives a
       WHERE a.warehouse_id = ?
       GROUP BY a.type, a.secrecy_level`
    ).all(req.params.id)

    const thresholdData = db.prepare(
      'SELECT * FROM thresholds WHERE warehouse_id = ?'
    ).all(req.params.id)

    res.json({
      success: true,
      data: {
        ...warehouse,
        usageRate: warehouse.capacity > 0
          ? parseFloat(((warehouse.used / warehouse.capacity) * 100).toFixed(2))
          : 0,
        shelves,
        environment: latestSensor || null,
        equipment,
        archiveStats,
        thresholds: thresholdData,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取库房详情失败' })
  }
})

export default router
