import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const status = req.query.status as string
    const userId = req.query.userId as string
    const archiveId = req.query.archiveId as string

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      where += ' AND b.status = ?'
      params.push(status)
    }
    if (userId) {
      where += ' AND b.user_id = ?'
      params.push(userId)
    }
    if (archiveId) {
      where += ' AND b.archive_id = ?'
      params.push(archiveId)
    }

    const borrows = db.prepare(
      `SELECT b.*, a.title as archive_title, a.archive_number, a.secrecy_level,
              a.warehouse_id, a.shelf_id,
              w.name as warehouse_name, s.code as shelf_code, s.position as shelf_position,
              u.name as user_name, u.department as user_department, u.permission_level
       FROM borrows b
       LEFT JOIN archives a ON b.archive_id = a.id
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       LEFT JOIN users u ON b.user_id = u.id
       ${where}
       ORDER BY b.created_at DESC`
    ).all(...params)

    res.json({ success: true, data: borrows })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取借阅记录失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { archiveId, userId, purpose, borrowType, appointmentTime, expectedReturnDate } = req.body

    if (!archiveId || !userId || !borrowType) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const archive = db.prepare('SELECT * FROM archives WHERE id = ?').get(archiveId) as any
    if (!archive) {
      res.status(404).json({ success: false, error: '档案不存在' })
      return
    }

    if (!appointmentTime && archive.status !== '在库') {
      res.status(400).json({ success: false, error: `档案当前状态为${archive.status}，无法借阅` })
      return
    }

    if (archive.status === '借出') {
      res.status(400).json({ success: false, error: '档案已借出，无法预约' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const permissionMap: Record<string, number> = {
      'admin': 4,
      'high': 3,
      'normal': 2,
      'low': 1,
    }

    const secrecyMap: Record<string, number> = {
      '公开': 1,
      '内部': 2,
      '秘密': 3,
      '机密': 4,
    }

    const userPermLevel = permissionMap[user.permission_level] || 2
    const archiveSecrecyLevel = secrecyMap[archive.secrecy_level] || 1

    let hasConflict = false
    if (appointmentTime && expectedReturnDate) {
      const conflict = db.prepare(
        `SELECT COUNT(*) as count FROM borrows
         WHERE archive_id = ?
           AND status IN ('已通过', '借出中', '待审批')
           AND appointment_time IS NOT NULL
           AND expected_return IS NOT NULL
           AND NOT (
             datetime(expected_return) <= datetime(?)
             OR datetime(appointment_time) >= datetime(?)
           )`
      ).get(archiveId, appointmentTime, expectedReturnDate) as any
      hasConflict = conflict.count > 0
    }

    let status: string
    let approvalResult: string

    if (hasConflict) {
      status = '待审批'
      approvalResult = '预约时间冲突，需人工审批'
    } else if (userPermLevel >= archiveSecrecyLevel && archive.secrecy_level !== '机密') {
      status = '已通过'
      approvalResult = '自动审批通过'
    } else if (userPermLevel < archiveSecrecyLevel) {
      status = '已拒绝'
      approvalResult = '用户权限不足，无法借阅该保密等级档案'
    } else {
      status = '待审批'
      approvalResult = null
    }

    const id = uuidv4()

    const insertBorrow = db.transaction(() => {
      db.prepare(
        `INSERT INTO borrows (id, archive_id, user_id, purpose, borrow_type, appointment_time, expected_return, status, approval_result, overdue_fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      ).run(id, archiveId, userId, purpose || null, borrowType, appointmentTime || null, expectedReturnDate || null, status, approvalResult)

      if (status === '已通过' && !appointmentTime) {
        db.prepare("UPDATE archives SET status = '锁定' WHERE id = ?").run(archiveId)
      }
    })

    insertBorrow()

    res.status(201).json({
      success: true,
      data: {
        id,
        status,
        approvalResult,
        autoApproved: status === '已通过',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建借阅申请失败' })
  }
})

router.put('/:id/approve', (req: Request, res: Response): void => {
  try {
    const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(req.params.id) as any
    if (!borrow) {
      res.status(404).json({ success: false, error: '借阅记录不存在' })
      return
    }

    if (borrow.status !== '待审批') {
      res.status(400).json({ success: false, error: '该借阅申请不在待审批状态' })
      return
    }

    const { approved } = req.body

    const update = db.transaction(() => {
      if (approved) {
        db.prepare("UPDATE borrows SET status = '已通过', approval_result = '人工审批通过' WHERE id = ?").run(req.params.id)
        if (!borrow.appointment_time) {
          db.prepare("UPDATE archives SET status = '锁定' WHERE id = ?").run(borrow.archive_id)
        }
      } else {
        db.prepare("UPDATE borrows SET status = '已拒绝', approval_result = '人工审批拒绝' WHERE id = ?").run(req.params.id)
      }
    })

    update()

    const updated = db.prepare(
      `SELECT b.*, a.title as archive_title, a.archive_number,
              a.warehouse_id, a.shelf_id,
              w.name as warehouse_name, s.code as shelf_code, s.position as shelf_position
       FROM borrows b
       LEFT JOIN archives a ON b.archive_id = a.id
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       WHERE b.id = ?`
    ).get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '审批操作失败' })
  }
})

router.post('/:id/return', (req: Request, res: Response): void => {
  try {
    const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(req.params.id) as any
    if (!borrow) {
      res.status(404).json({ success: false, error: '借阅记录不存在' })
      return
    }

    if (!['已通过', '借出中', '已超期'].includes(borrow.status)) {
      res.status(400).json({ success: false, error: '该借阅记录无法执行归还操作' })
      return
    }

    const returnTime = new Date().toISOString()

    const update = db.transaction(() => {
      db.prepare(
        "UPDATE borrows SET status = '已归还', actual_return = ? WHERE id = ?"
      ).run(returnTime, req.params.id)

      db.prepare("UPDATE archives SET status = '在库' WHERE id = ?").run(borrow.archive_id)
    })

    update()

    const updated = db.prepare(
      `SELECT b.*, a.title as archive_title, a.archive_number,
              a.warehouse_id, a.shelf_id,
              w.name as warehouse_name, s.code as shelf_code, s.position as shelf_position
       FROM borrows b
       LEFT JOIN archives a ON b.archive_id = a.id
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       WHERE b.id = ?`
    ).get(req.params.id)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '归还操作失败' })
  }
})

router.get('/overdue', (req: Request, res: Response): void => {
  try {
    const overdueBorrows = db.prepare(
      `SELECT b.*, a.title as archive_title, a.archive_number, a.secrecy_level,
              a.warehouse_id, a.shelf_id,
              w.name as warehouse_name, s.code as shelf_code, s.position as shelf_position,
              u.name as user_name, u.department as user_department
       FROM borrows b
       LEFT JOIN archives a ON b.archive_id = a.id
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN shelves s ON a.shelf_id = s.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.status IN ('已超期', '借出中')
         AND b.expected_return IS NOT NULL
         AND datetime(b.expected_return) < datetime('now')
       ORDER BY b.expected_return ASC`
    ).all()

    res.json({ success: true, data: overdueBorrows })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取逾期记录失败' })
  }
})

router.post('/:id/remind', (req: Request, res: Response): void => {
  try {
    const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(req.params.id) as any
    if (!borrow) {
      res.status(404).json({ success: false, error: '借阅记录不存在' })
      return
    }

    const now = new Date()
    const expectedReturn = borrow.expected_return ? new Date(borrow.expected_return) : null
    let overdueDays = 0
    let overdueFee = 0

    if (expectedReturn && now > expectedReturn) {
      const diffMs = now.getTime() - expectedReturn.getTime()
      overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      overdueFee = overdueDays * 0.5

      db.prepare(
        "UPDATE borrows SET status = '已超期', overdue_fee = ? WHERE id = ?"
      ).run(overdueFee, req.params.id)
    }

    res.json({
      success: true,
      data: {
        borrowId: req.params.id,
        overdueDays,
        overdueFee,
        message: overdueDays > 0
          ? `已发送催还通知，逾期${overdueDays}天，逾期费${overdueFee}元`
          : '已发送催还提醒',
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '催还操作失败' })
  }
})

router.get('/appointments/:archiveId', (req: Request, res: Response): void => {
  try {
    const { archiveId } = req.params

    const appointments = db.prepare(
      `SELECT b.id, b.appointment_time, b.expected_return, b.status, b.approval_result,
              u.name as user_name, u.department as user_department
       FROM borrows b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.archive_id = ?
         AND b.status IN ('待审批', '已通过', '借出中')
         AND b.appointment_time IS NOT NULL
       ORDER BY b.appointment_time ASC`
    ).all(archiveId)

    res.json({ success: true, data: appointments })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取预约占用失败' })
  }
})

export default router
