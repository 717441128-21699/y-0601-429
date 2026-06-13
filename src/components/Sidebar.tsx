import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Archive,
  Search,
  FileText,
  CheckSquare,
  History,
  Thermometer,
  AlertTriangle,
  Server,
  Wrench,
  Package,
  BarChart3,
  Map,
  ChevronDown,
  ChevronRight,
  Landmark,
  User,
} from 'lucide-react'
import useAppStore from '@/stores/useAppStore'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: '',
    items: [
      { label: '仪表盘', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    title: '档案管理',
    items: [
      { label: '档案入库', icon: Archive, path: '/archive/intake' },
      { label: '档案查询', icon: Search, path: '/archive/list' },
    ],
  },
  {
    title: '借阅管理',
    items: [
      { label: '借阅申请', icon: FileText, path: '/borrow/apply' },
      { label: '借阅审批', icon: CheckSquare, path: '/borrow/approval' },
      { label: '借阅记录', icon: History, path: '/borrow/records' },
    ],
  },
  {
    title: '环境管理',
    items: [
      { label: '环境监测', icon: Thermometer, path: '/environment/monitor' },
      { label: '预警记录', icon: AlertTriangle, path: '/environment/alerts' },
    ],
  },
  {
    title: '设备管理',
    items: [
      { label: '设备台账', icon: Server, path: '/equipment/list' },
      { label: '维保工单', icon: Wrench, path: '/equipment/maintenance' },
      { label: '备件库存', icon: Package, path: '/equipment/spare-parts' },
    ],
  },
  {
    title: '统计分析',
    items: [
      { label: '月度报告', icon: BarChart3, path: '/statistics/utilization' },
      { label: '借阅统计', icon: FileText, path: '/statistics/borrowing' },
      { label: '库房地图', icon: Map, path: '/warehouse/map' },
    ],
  },
]

export default function Sidebar() {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const currentUser = useAppStore((s) => s.currentUser)

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-surface border-r border-border flex flex-col transition-all duration-300 z-50 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
          <Landmark className="w-5 h-5 text-accent" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-serif text-lg font-bold text-text-primary tracking-wider whitespace-nowrap">
              数智档案
            </h1>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-1">
            {section.title && !sidebarCollapsed && (
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted uppercase tracking-widest hover:text-text-secondary transition-colors"
              >
                <span>{section.title}</span>
                {collapsedSections[section.title] ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            {section.title && sidebarCollapsed && (
              <div className="my-2 mx-3 h-px bg-border" />
            )}
            {!collapsedSections[section.title] && (
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      isActive ? 'sidebar-item-active' : 'sidebar-item'
                    }
                    title={item.label}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-accent" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-text-primary truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-text-muted truncate">
                {currentUser.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
