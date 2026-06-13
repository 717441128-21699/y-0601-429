import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

router.get('/realtime', (req: Request, res: Response): void => {
  try {
    const warehouses = db.prepare('SELECT * FROM warehouses').all() as any[]

    const data = warehouses.map(w => {
      const latestSensor = db.prepare(
        'SELECT * FROM sensor_data WHERE warehouse_id = ? ORDER BY recorded_at DESC LIMIT 1'
      ).get(w.id) as any

      const equipment = db.prepare(
        "SELECT * FROM equipment WHERE warehouse_id = ? AND status = '运行中'"
      ).all(w.id) as any[]

      return {
        warehouseId: w.id,
        warehouseName: w.name,
        temperature: latestSensor?.temperature ?? null,
        humidity: latestSensor?.humidity ?? null,
        lightIntensity: latestSensor?.light_intensity ?? null,
        harmfulGas: latestSensor?.harmful_gas ?? null,
        recordedAt: latestSensor?.recorded_at ?? null,
        runningEquipment: equipment.length,
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取实时环境数据失败' })
  }
})

router.get('/history/:warehouseId', (req: Request, res: Response): void => {
  try {
    const { warehouseId } = req.params
    const hours = parseInt(req.query.hours as string) || 24

    const data = db.prepare(
      `SELECT * FROM sensor_data
       WHERE warehouse_id = ?
         AND recorded_at >= datetime('now', ?||' hours')
       ORDER BY recorded_at ASC`
    ).all(warehouseId, `-${hours}`)

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取历史环境数据失败' })
  }
})

router.get('/alerts', (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string
    const warehouseId = req.query.warehouseId as string

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      where += ' AND a.status = ?'
      params.push(status)
    }
    if (warehouseId) {
      where += ' AND a.warehouse_id = ?'
      params.push(warehouseId)
    }

    const alerts = db.prepare(
      `SELECT a.*, w.name as warehouse_name
       FROM alerts a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       ${where}
       ORDER BY a.triggered_at DESC`
    ).all(...params)

    res.json({ success: true, data: alerts })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取预警记录失败' })
  }
})

router.put('/threshold/:warehouseId', (req: Request, res: Response): void => {
  try {
    const { warehouseId } = req.params
    const { thresholds } = req.body

    if (!thresholds || !Array.isArray(thresholds)) {
      res.status(400).json({ success: false, error: '无效的阈值数据' })
      return
    }

    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(warehouseId)
    if (!warehouse) {
      res.status(404).json({ success: false, error: '库房不存在' })
      return
    }

    const update = db.transaction(() => {
      for (const t of thresholds) {
        const existing = db.prepare(
          'SELECT * FROM thresholds WHERE warehouse_id = ? AND parameter = ?'
        ).get(warehouseId, t.parameter) as any

        if (existing) {
          db.prepare(
            'UPDATE thresholds SET min_value = ?, max_value = ? WHERE id = ?'
          ).run(t.minValue, t.maxValue, existing.id)
        } else {
          db.prepare(
            'INSERT INTO thresholds (id, warehouse_id, parameter, min_value, max_value) VALUES (?, ?, ?, ?, ?)'
          ).run(uuidv4(), warehouseId, t.parameter, t.minValue, t.maxValue)
        }
      }
    })

    update()

    const updated = db.prepare(
      'SELECT * FROM thresholds WHERE warehouse_id = ?'
    ).all(warehouseId)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '设置阈值失败' })
  }
})

router.post('/device-control', (req: Request, res: Response): void => {
  try {
    const { equipmentId, action } = req.body

    if (!equipmentId || !action) {
      res.status(400).json({ success: false, error: '缺少设备ID或操作指令' })
      return
    }

    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId) as any
    if (!equipment) {
      res.status(404).json({ success: false, error: '设备不存在' })
      return
    }

    if (action === 'on') {
      db.prepare(
        "UPDATE equipment SET status = '运行中', switch_count = switch_count + 1 WHERE id = ?"
      ).run(equipmentId)
    } else if (action === 'off') {
      db.prepare(
        "UPDATE equipment SET status = '停机', switch_count = switch_count + 1 WHERE id = ?"
      ).run(equipmentId)
    } else {
      res.status(400).json({ success: false, error: '无效操作，仅支持 on/off' })
      return
    }

    const updated = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '设备控制失败' })
  }
})

router.get('/thresholds', (req: Request, res: Response): void => {
  try {
    const thresholds = db.prepare(
      `SELECT t.*, w.name as warehouse_name
       FROM thresholds t
       LEFT JOIN warehouses w ON t.warehouse_id = w.id
       ORDER BY w.name, t.parameter`
    ).all()

    res.json({ success: true, data: thresholds })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取阈值配置失败' })
  }
})

export default router
