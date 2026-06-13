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

function buildSummary(startDate: string, endDate: string) {
  const monthBorrows = db.prepare(
    `SELECT COUNT(*) as count
     FROM borrows
     WHERE created_at >= ? AND created_at <= ?`
  ).get(startDate, endDate) as any

  const monthApproved = db.prepare(
    `SELECT COUNT(*) as count
     FROM borrows
     WHERE created_at >= ? AND created_at <= ?
       AND status IN ('已通过', '待取卷', '借出中', '已归还', '已超期')`
  ).get(startDate, endDate) as any

  const monthPending = db.prepare(
    `SELECT COUNT(*) as count
     FROM borrows
     WHERE created_at >= ? AND created_at <= ?
       AND status = '待审批'`
  ).get(startDate, endDate) as any

  const monthRejected = db.prepare(
    `SELECT COUNT(*) as count
     FROM borrows
     WHERE created_at >= ? AND created_at <= ?
       AND status = '已拒绝'`
  ).get(startDate, endDate) as any

  const monthOverdue = db.prepare(
    `SELECT COUNT(*) as count,
            COALESCE(SUM(overdue_fee), 0) as total_fee
     FROM borrows
     WHERE expected_return >= ? AND expected_return <= ?
       AND status IN ('已超期', '借出中')
       AND datetime(expected_return) < datetime('now')`
  ).get(startDate, endDate) as any

  return {
    monthBorrows: monthBorrows.count,
    monthApproved: monthApproved.count,
    monthPending: monthPending.count,
    monthRejected: monthRejected.count,
    monthOverdueCount: monthOverdue.count || 0,
    monthOverdueFee: monthOverdue.total_fee || 0,
  }
}

router.get('/monthly-report', (req: Request, res: Response): void => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7)
    const startDate = `${month}-01T00:00:00.000Z`
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0, 23, 59, 59).toISOString()

    const currentYear = new Date(startDate).getFullYear()
    const currentMonth = new Date(startDate).getMonth()
    const prevDate = new Date(currentYear, currentMonth - 1, 1)
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const prevStartDate = `${prevMonth}-01T00:00:00.000Z`
    const prevEndDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const summary = buildSummary(startDate, endDate)
    const prevMonthSummary = buildSummary(prevStartDate, prevEndDate)

    const totalArchives = db.prepare('SELECT COUNT(*) as count FROM archives').get() as any

    const totalOverdue = db.prepare(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(overdue_fee), 0) as total_fee
       FROM borrows
       WHERE status IN ('已超期', '借出中')
         AND expected_return IS NOT NULL
         AND datetime(expected_return) < datetime('now')`
    ).get() as any

    const borrowsChange = summary.monthBorrows - prevMonthSummary.monthBorrows
    const borrowsChangeRate = prevMonthSummary.monthBorrows > 0
      ? Math.round((borrowsChange / prevMonthSummary.monthBorrows) * 1000) / 10
      : 0
    const overdueCountChange = summary.monthOverdueCount - prevMonthSummary.monthOverdueCount
    const overdueFeeChange = summary.monthOverdueFee - prevMonthSummary.monthOverdueFee

    const currentApprovalRate = summary.monthBorrows > 0 ? summary.monthApproved / summary.monthBorrows : 0
    const prevApprovalRate = prevMonthSummary.monthBorrows > 0 ? prevMonthSummary.monthApproved / prevMonthSummary.monthBorrows : 0
    const approvalRateChange = Math.round((currentApprovalRate - prevApprovalRate) * 1000) / 10

    const chainGrowth = {
      borrowsChange,
      borrowsChangeRate,
      overdueCountChange,
      overdueFeeChange,
      approvalRateChange,
    }

    const borrowingTrend = db.prepare(
      `SELECT strftime('%Y-%m-%d', created_at) as date,
              COUNT(*) as count,
              SUM(CASE WHEN status IN ('已通过','待取卷','借出中','已归还','已超期') THEN 1 ELSE 0 END) as approved
       FROM borrows
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY strftime('%Y-%m-%d', created_at)
       ORDER BY date ASC`
    ).all(startDate, endDate)

    const borrowByType = db.prepare(
      `SELECT borrow_type as type, COUNT(*) as count
       FROM borrows
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY borrow_type
       ORDER BY count DESC`
    ).all(startDate, endDate)

    const borrowByDepartment = db.prepare(
      `SELECT u.department as department,
              COUNT(*) as count,
              SUM(CASE WHEN b.status IN ('已通过','待取卷','借出中','已归还','已超期') THEN 1 ELSE 0 END) as approved
       FROM borrows b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.created_at >= ? AND b.created_at <= ?
       GROUP BY u.department
       ORDER BY count DESC`
    ).all(startDate, endDate)

    const warehouseUtil = db.prepare(
      `SELECT w.id, w.name, w.location, w.capacity, w.used,
              ROUND(CAST(w.used AS REAL) / w.capacity * 100, 2) as usage_rate,
              (
                SELECT COUNT(*)
                FROM borrows b
                LEFT JOIN archives a ON b.archive_id = a.id
                WHERE a.warehouse_id = w.id
                  AND b.created_at >= ? AND b.created_at <= ?
                  AND b.status IN ('已通过','待取卷','借出中','已归还','已超期')
              ) as month_borrow_count
       FROM warehouses w
       ORDER BY w.name`
    ).all(startDate, endDate)

    const warehouseArchiveStats = db.prepare(
      `SELECT w.id, w.name,
              a.type,
              COUNT(*) as count
       FROM archives a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       GROUP BY w.id, a.type
       ORDER BY w.name, count DESC`
    ).all()

    const typeStats = db.prepare(
      `SELECT a.type,
              COUNT(*) as total,
              SUM(CASE WHEN a.status IN ('借出','锁定') THEN 1 ELSE 0 END) as borrowed,
              SUM(CASE WHEN a.status = '在库' THEN 1 ELSE 0 END) as in_stock,
              (
                SELECT COUNT(*)
                FROM borrows b
                WHERE b.archive_id IN (SELECT id FROM archives WHERE type = a.type)
                  AND b.created_at >= ? AND b.created_at <= ?
                  AND b.status IN ('已通过','待取卷','借出中','已归还','已超期')
              ) as month_borrowed
       FROM archives a
       GROUP BY a.type
       ORDER BY total DESC`
    ).all(startDate, endDate)

    res.json({
      success: true,
      data: {
        month,
        summary: {
          totalArchives: totalArchives.count,
          ...summary,
          totalOverdueCount: totalOverdue.count || 0,
          totalOverdueFee: totalOverdue.total_fee || 0,
        },
        prevMonthSummary,
        chainGrowth,
        borrowingTrend,
        borrowByType,
        borrowByDepartment,
        warehouseUtilization: warehouseUtil,
        warehouseArchiveStats,
        typeStats,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取月度报告失败' })
  }
})

router.get('/monthly-comparison', (req: Request, res: Response): void => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months as string) || 6, 3), 12)
    const now = new Date()
    const result = []

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const startDate = `${month}-01T00:00:00.000Z`
      const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const summary = buildSummary(startDate, endDate)
      const approvalRate = summary.monthBorrows > 0
        ? Math.round((summary.monthApproved / summary.monthBorrows) * 1000) / 10
        : 0

      result.push({
        month,
        ...summary,
        approvalRate,
      })
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取多月对比数据失败' })
  }
})

export default router
