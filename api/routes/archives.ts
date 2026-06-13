import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const type = req.query.type as string
    const secrecyLevel = req.query.secrecyLevel as string
    const status = req.query.status as string
    const keyword = req.query.keyword as string

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (type) {
      where += ' AND a.type = ?'
      params.push(type)
    }
    if (secrecyLevel) {
      where += ' AND a.secrecy_level = ?'
      params.push(secrecyLevel)
    }
    if (status) {
      where += ' AND a.status = ?'
      params.push(status)
    }
    if (keyword) {
      where += ' AND (a.title LIKE ? OR a.archive_number LIKE ? OR a.department LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM archives a ${where}`).get(...params) as { total: number }
    const total = countRow.total

    const offset = (page - 1) * pageSize
    const archives = db.prepare(
      `SELECT a.*, w.name as warehouse_name, s.code as shelf_code
       FROM archives a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset) as any[]

    res.json({
      success: true,
      data: {
        list: archives,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取档案列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const archive = db.prepare(
      `SELECT a.*, w.name as warehouse_name, w.location as warehouse_location,
              s.code as shelf_code, s.position as shelf_position
       FROM archives a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       WHERE a.id = ?`
    ).get(req.params.id) as any

    if (!archive) {
      res.status(404).json({ success: false, error: '档案不存在' })
      return
    }

    res.json({ success: true, data: archive })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取档案详情失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { title, type, secrecyLevel, carrierMaterial, fonds, year, department, description } = req.body

    if (!title || !type || !secrecyLevel || !carrierMaterial) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const warehouses = db.prepare('SELECT * FROM warehouses').all() as any[]
    let targetWarehouse: any = null

    for (const w of warehouses) {
      const allowedTypes = w.allowed_types ? w.allowed_types.split(',') : []
      const allowedSecrecy = w.allowed_secrecy ? w.allowed_secrecy.split(',') : []
      if (allowedTypes.includes(type) && allowedSecrecy.includes(secrecyLevel)) {
        if (w.used < w.capacity) {
          targetWarehouse = w
          break
        }
      }
    }

    if (!targetWarehouse) {
      res.status(400).json({ success: false, error: '未找到匹配的库房，请检查档案类型和保密等级' })
      return
    }

    const shelves = db.prepare('SELECT * FROM shelves WHERE warehouse_id = ?').all(targetWarehouse.id) as any[]
    let targetShelf: any = null

    for (const s of shelves) {
      const allowedMaterials = s.allowed_materials ? s.allowed_materials.split(',') : []
      if (allowedMaterials.includes(carrierMaterial)) {
        if (s.used < s.capacity) {
          targetShelf = s
          break
        }
      }
    }

    if (!targetShelf) {
      res.status(400).json({ success: false, error: '未找到匹配的密集架，请检查载体材质' })
      return
    }

    const key = `${fonds || 'XX'}-${year || new Date().getFullYear()}`
    const existing = db.prepare(
      "SELECT archive_number FROM archives WHERE archive_number LIKE ? ORDER BY archive_number DESC LIMIT 1"
    ).get(`${key}%`) as any

    let seq = 1
    if (existing) {
      const parts = existing.archive_number.split('-')
      seq = parseInt(parts[parts.length - 1]) + 1
    }

    const archiveNumber = `${key}-${String(seq).padStart(4, '0')}`
    const barcode = `BC-${archiveNumber}`

    const id = uuidv4()
    const insert = db.transaction(() => {
      db.prepare(
        `INSERT INTO archives (id, archive_number, title, type, secrecy_level, carrier_material, fonds, year, department, description, status, warehouse_id, shelf_id, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '在库', ?, ?, ?)`
      ).run(id, archiveNumber, title, type, secrecyLevel, carrierMaterial, fonds || null, year || null, department || null, description || null, targetWarehouse.id, targetShelf.id, barcode)

      db.prepare('UPDATE shelves SET used = used + 1 WHERE id = ?').run(targetShelf.id)
      db.prepare('UPDATE warehouses SET used = used + 1 WHERE id = ?').run(targetWarehouse.id)
    })

    insert()

    res.status(201).json({
      success: true,
      data: {
        id,
        archiveNumber,
        warehouseId: targetWarehouse.id,
        warehouseName: targetWarehouse.name,
        shelfId: targetShelf.id,
        shelfPosition: targetShelf.position,
        barcode,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建档案失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const archive = db.prepare('SELECT * FROM archives WHERE id = ?').get(req.params.id) as any
    if (!archive) {
      res.status(404).json({ success: false, error: '档案不存在' })
      return
    }

    const { title, type, secrecyLevel, carrierMaterial, fonds, year, department, description, status } = req.body

    const updates: string[] = []
    const params: any[] = []

    if (title !== undefined) { updates.push('title = ?'); params.push(title) }
    if (type !== undefined) { updates.push('type = ?'); params.push(type) }
    if (secrecyLevel !== undefined) { updates.push('secrecy_level = ?'); params.push(secrecyLevel) }
    if (carrierMaterial !== undefined) { updates.push('carrier_material = ?'); params.push(carrierMaterial) }
    if (fonds !== undefined) { updates.push('fonds = ?'); params.push(fonds) }
    if (year !== undefined) { updates.push('year = ?'); params.push(year) }
    if (department !== undefined) { updates.push('department = ?'); params.push(department) }
    if (description !== undefined) { updates.push('description = ?'); params.push(description) }
    if (status !== undefined) { updates.push('status = ?'); params.push(status) }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' })
      return
    }

    params.push(req.params.id)
    db.prepare(`UPDATE archives SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare(
      `SELECT a.*, w.name as warehouse_name, s.code as shelf_code
       FROM archives a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       WHERE a.id = ?`
    ).get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新档案失败' })
  }
})

export default router
