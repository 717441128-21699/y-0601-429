import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/borrowing', (req: Request, res: Response): void => {
  try {
    const groupBy = (req.query.groupBy as string) || 'fonds'

    let selectExpr: string
    let groupExpr: string

    switch (groupBy) {
      case 'year':
        selectExpr = 'a.year as group_key, a.year as label'
        groupExpr = 'a.year'
        break
      case 'type':
        selectExpr = 'a.type as group_key, a.type as label'
        groupExpr = 'a.type'
        break
      default:
        selectExpr = 'a.fonds as group_key, a.fonds as label'
        groupExpr = 'a.fonds'
    }

    const stats = db.prepare(
      `SELECT ${selectExpr},
              COUNT(b.id) as borrow_count,
              COUNT(DISTINCT b.user_id) as borrower_count,
              SUM(CASE WHEN b.status = '已超期' THEN 1 ELSE 0 END) as overdue_count,
              SUM(b.overdue_fee) as total_overdue_fee
       FROM borrows b
       LEFT JOIN archives a ON b.archive_id = a.id
       GROUP BY ${groupExpr}
       ORDER BY borrow_count DESC`
    ).all()

    const totalBorrows = db.prepare('SELECT COUNT(*) as count FROM borrows').get() as any
    const monthlyTrend = db.prepare(
      `SELECT strftime('%Y-%m', b.created_at) as month,
              COUNT(*) as count
       FROM borrows b
       GROUP BY strftime('%Y-%m', b.created_at)
       ORDER BY month DESC
       LIMIT 12`
    ).all()

    res.json({
      success: true,
      data: {
        stats,
        total: totalBorrows.count,
        monthlyTrend,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取借阅统计失败' })
  }
})

router.get('/utilization', (req: Request, res: Response): void => {
  try {
    const totalArchives = db.prepare('SELECT COUNT(*) as count FROM archives').get() as any
    const borrowedArchives = db.prepare("SELECT COUNT(*) as count FROM archives WHERE status IN ('借出','锁定')").get() as any
    const inStockArchives = db.prepare("SELECT COUNT(*) as count FROM archives WHERE status = '在库'").get() as any

    const utilizationRate = totalArchives.count > 0
      ? ((borrowedArchives.count / totalArchives.count) * 100).toFixed(2)
      : '0'

    const typeStats = db.prepare(
      `SELECT a.type,
              COUNT(*) as total,
              SUM(CASE WHEN a.status IN ('借出','锁定') THEN 1 ELSE 0 END) as borrowed,
              SUM(CASE WHEN a.status = '在库' THEN 1 ELSE 0 END) as in_stock
       FROM archives a
       GROUP BY a.type
       ORDER BY total DESC`
    ).all()

    const warehouseUtil = db.prepare(
      `SELECT w.id, w.name, w.capacity, w.used,
              ROUND(CAST(w.used AS REAL) / w.capacity * 100, 2) as utilization_rate
       FROM warehouses w
       ORDER BY utilization_rate DESC`
    ).all()

    res.json({
      success: true,
      data: {
        totalArchives: totalArchives.count,
        borrowedArchives: borrowedArchives.count,
        inStockArchives: inStockArchives.count,
        utilizationRate: parseFloat(utilizationRate),
        typeStats,
        warehouseUtilization: warehouseUtil,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取利用率统计失败' })
  }
})

router.get('/warehouse-capacity', (req: Request, res: Response): void => {
  try {
    const warehouses = db.prepare(
      `SELECT w.id, w.name, w.location, w.capacity, w.used,
              ROUND(CAST(w.used AS REAL) / w.capacity * 100, 2) as usage_rate
       FROM warehouses w
       ORDER BY w.name`
    ).all() as any[]

    const details = warehouses.map(w => {
      const shelves = db.prepare(
        `SELECT s.id, s.code, s.position, s.capacity, s.used,
                ROUND(CAST(s.used AS REAL) / s.capacity * 100, 2) as usage_rate
         FROM shelves s
         WHERE s.warehouse_id = ?
         ORDER BY s.code`
      ).all(w.id) as any[]

      const archiveTypes = db.prepare(
        `SELECT a.type, COUNT(*) as count
         FROM archives a
         WHERE a.warehouse_id = ?
         GROUP BY a.type
         ORDER BY count DESC`
      ).all(w.id)

      return {
        ...w,
        shelves,
        archiveTypes,
      }
    })

    res.json({ success: true, data: details })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取库容统计失败' })
  }
})

router.get('/overview', (req: Request, res: Response): void => {
  try {
    const totalArchives = db.prepare('SELECT COUNT(*) as count FROM archives').get() as any
    const inStock = db.prepare("SELECT COUNT(*) as count FROM archives WHERE status = '在库'").get() as any
    const borrowed = db.prepare("SELECT COUNT(*) as count FROM archives WHERE status IN ('借出','锁定')").get() as any
    const alertCount = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status IN ('未处理','处理中')").get() as any
    const overdueBorrows = db.prepare(
      `SELECT COUNT(*) as count FROM borrows
       WHERE status IN ('已超期', '借出中')
         AND expected_return IS NOT NULL
         AND datetime(expected_return) < datetime('now')`
    ).get() as any
    const pendingApprovals = db.prepare("SELECT COUNT(*) as count FROM borrows WHERE status = '待审批'").get() as any
    const lowStockParts = db.prepare('SELECT COUNT(*) as count FROM spare_parts WHERE quantity < safety_stock').get() as any
    const maintenancePending = db.prepare("SELECT COUNT(*) as count FROM maintenance_orders WHERE status = '待处理'").get() as any

    const recentAlerts = db.prepare(
      `SELECT a.*, w.name as warehouse_name
       FROM alerts a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       WHERE a.status IN ('未处理','处理中')
       ORDER BY a.triggered_at DESC
       LIMIT 5`
    ).all()

    const recentBorrows = db.prepare(
      `SELECT b.*, arch.title as archive_title, u.name as user_name
       FROM borrows b
       LEFT JOIN archives arch ON b.archive_id = arch.id
       LEFT JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC
       LIMIT 5`
    ).all()

    res.json({
      success: true,
      data: {
        totalArchives: totalArchives.count,
        inStock: inStock.count,
        borrowed: borrowed.count,
        alertCount: alertCount.count,
        overdueBorrows: overdueBorrows.count,
        pendingApprovals: pendingApprovals.count,
        lowStockParts: lowStockParts.count,
        maintenancePending: maintenancePending.count,
        recentAlerts,
        recentBorrows,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取概览数据失败' })
  }
})

export default router
