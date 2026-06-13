import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, role } = req.body
    const user = db.prepare(
      `SELECT * FROM users WHERE name = ? OR role = ? ORDER BY 
        CASE WHEN name = ? THEN 0 ELSE 1 END
      LIMIT 1`
    ).get(username || '张建国', role || 'admin', username || '张建国') as any

    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.department,
        permissionLevel: user.permission_level,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/current-user', (req: Request, res: Response): void => {
  try {
    const defaultUser = db.prepare(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    ).get() as any

    if (!defaultUser) {
      res.status(404).json({ success: false, error: '未找到默认用户' })
      return
    }

    res.json({
      success: true,
      data: {
        id: defaultUser.id,
        name: defaultUser.name,
        role: defaultUser.role,
        department: defaultUser.department,
        permissionLevel: defaultUser.permission_level,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取当前用户失败' })
  }
})

router.get('/users', (req: Request, res: Response): void => {
  try {
    const users = db.prepare(
      'SELECT id, name, role, department, permission_level FROM users ORDER BY role'
    ).all()
    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户列表失败' })
  }
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement register logic
})

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: '已退出登录' })
})

export default router
