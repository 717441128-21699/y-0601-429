import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { ChevronRight, Bell, Menu, LogOut } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import useAppStore from '@/stores/useAppStore'

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
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length
  const currentPath = location.pathname
  const currentLabel = pathNameMap[currentPath] || '未知页面'
  const parent = parentMap[currentPath]

  useEffect(() => {
    setShowNotifications(false)
  }, [location.pathname])

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

            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card text-text-secondary hover:text-text-primary transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="text-sm">退出</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
