import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { ChevronRight, Bell, Menu, LogOut, User, ChevronDown, Loader2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import useAppStore from '@/stores/useAppStore'
import { api } from '@/lib/api'
import type { User as UserType } from '@/types/api'

const pathNameMap: Record<string, string> = {
  '/': '仪表盘',
  '/archive/intake': '档案入库',
  '/archive/list': '档案查询',
  '/borrow/apply': '借阅申请',
  '/borrow/approval': '借阅审批',
  '/borrow/records': '借阅记录',
  '/environment/monitor': '环境监测',
  '/environment/alerts': '预警记录',
  '/equipment/list': '设备台账',
  '/equipment/maintenance': '维保工单',
  '/equipment/spare-parts': '备件库存',
  '/statistics/borrowing': '统计分析',
  '/statistics/utilization': '利用率统计',
  '/warehouse/map': '库房地图',
}

const parentMap: Record<string, { path: string; label: string }> = {
  '/archive/intake': { path: '/archive', label: '档案管理' },
  '/archive/list': { path: '/archive', label: '档案管理' },
  '/borrow/apply': { path: '/borrow', label: '借阅管理' },
  '/borrow/approval': { path: '/borrow', label: '借阅管理' },
  '/borrow/records': { path: '/borrow', label: '借阅管理' },
  '/environment/monitor': { path: '/environment', label: '环境管理' },
  '/environment/alerts': { path: '/environment', label: '环境管理' },
  '/equipment/list': { path: '/equipment', label: '设备管理' },
  '/equipment/maintenance': { path: '/equipment', label: '设备管理' },
  '/equipment/spare-parts': { path: '/equipment', label: '设备管理' },
  '/statistics/borrowing': { path: '/statistics', label: '统计分析' },
  '/statistics/utilization': { path: '/statistics', label: '统计分析' },
}

export default function Layout() {
  const location = useLocation()
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const notifications = useAppStore((s) => s.notifications)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const currentUser = useAppStore((s) => s.currentUser)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userList, setUserList] = useState<UserType[]>([])
  const [userLoading, setUserLoading] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length
  const currentPath = location.pathname
  const currentLabel = pathNameMap[currentPath] || '未知页面'
  const parent = parentMap[currentPath]

  useEffect(() => {
    setShowNotifications(false)
    setShowUserMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const list = await api.getUsers()
        setUserList(list)
        const defaultAdmin = list.find(u => u.role === 'admin' || u.role === '系统管理员')
        if (currentUser.id === '1' && defaultAdmin) {
          setCurrentUser({
            id: defaultAdmin.id,
            name: defaultAdmin.name,
            role: defaultAdmin.role,
            department: defaultAdmin.department,
            permission_level:
              typeof defaultAdmin.permissionLevel === 'number'
                ? defaultAdmin.permissionLevel
                : ({ admin: 4, high: 3, normal: 2, low: 1 } as Record<string, number>)[String(defaultAdmin.permissionLevel)] || 2,
          })
        }
      } catch {
        setUserList([])
      }
    }
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSwitchUser = async (u: UserType) => {
    setUserLoading(true)
    try {
      const logged = await api.login({ username: u.name })
      setCurrentUser({
        id: logged.id,
        name: logged.name,
        role: logged.role,
        department: logged.department,
        permission_level:
          typeof logged.permissionLevel === 'number'
            ? logged.permissionLevel
            : ({ admin: 4, high: 3, normal: 2, low: 1 } as Record<string, number>)[String(logged.permissionLevel)] || 2,
      })
    } catch {
      // fallback
      setCurrentUser({
        id: u.id,
        name: u.name,
        role: u.role,
        department: u.department,
        permission_level:
          typeof u.permissionLevel === 'number'
            ? u.permissionLevel
            : ({ admin: 4, high: 3, normal: 2, low: 1 } as Record<string, number>)[String(u.permissionLevel)] || 2,
      })
    } finally {
      setShowUserMenu(false)
      setUserLoading(false)
    }
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === '系统管理员'

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'
        }`}
      >
        <header className="h-16 bg-surface/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="flex items-center gap-1.5 text-sm">
              <Link to="/" className="text-text-muted hover:text-text-secondary transition-colors">
                首页
              </Link>
              {parent && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-muted">{parent.label}</span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-text-primary font-medium">{currentLabel}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full text-[10px] text-white flex items-center justify-center animate-pulse-alert">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-card-hover overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">通知</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-accent">{unreadCount} 条未读</span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-text-muted text-sm">
                        暂无通知
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-card-50 transition-colors ${
                            !n.read ? 'bg-accent/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`badge ${
                                n.type === 'danger'
                                  ? 'badge-danger'
                                  : n.type === 'warning'
                                  ? 'badge-warning'
                                  : n.type === 'success'
                                  ? 'badge-success'
                                  : 'badge-accent'
                              }`}
                            >
                              {n.type === 'danger'
                                ? '紧急'
                                : n.type === 'warning'
                                ? '警告'
                                : n.type === 'success'
                                ? '成功'
                                : '信息'}
                            </span>
                            <span className="text-xs text-text-muted">{n.time}</span>
                          </div>
                          <p className="text-sm text-text-primary font-medium">{n.title}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-border" />

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                disabled={userLoading}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary transition-colors"
              >
                {userLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-accent" />
                  </div>
                )}
                <div className="text-left leading-tight">
                  <p className="text-sm font-medium text-text-primary">{currentUser.name}</p>
                  <p className="text-[11px] text-text-muted">{currentUser.department}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-card-hover overflow-hidden animate-fade-in z-50">
                  <div className="px-4 py-3 border-b border-border bg-surface/50">
                    <p className="text-xs text-text-muted">当前身份</p>
                    <p className="text-sm font-medium text-text-primary mt-0.5">
                      {currentUser.name} · {currentUser.role}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{currentUser.department}</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    <div className="px-3 py-2 text-[11px] text-text-muted uppercase tracking-widest">切换账号</div>
                    {userList.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u)}
                        disabled={userLoading || u.id === currentUser.id}
                        className={`w-full text-left px-4 py-2.5 hover:bg-surface transition-colors flex items-center gap-3 ${
                          u.id === currentUser.id ? 'bg-accent/10' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          u.id === currentUser.id ? 'bg-accent text-primary' : 'bg-primary'
                        }`}>
                          <User className={`w-4 h-4 ${u.id === currentUser.id ? '' : 'text-accent'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                          <p className="text-xs text-text-muted truncate">
                            {u.role} · {u.department}
                          </p>
                        </div>
                        {u.id === currentUser.id && (
                          <span className="text-[10px] text-accent font-medium">当前</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-2">
                    <button className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors text-sm">
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
