import { create } from 'zustand'

interface User {
  id: string
  name: string
  role: string
  department: string
  permission_level: number
}

interface Notification {
  id: string
  type: 'info' | 'warning' | 'danger' | 'success'
  title: string
  message: string
  time: string
  read: boolean
}

interface AppState {
  sidebarCollapsed: boolean
  currentUser: User
  notifications: Notification[]
  toggleSidebar: () => void
  setCurrentUser: (user: User) => void
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void
  markNotificationRead: (id: string) => void
}

const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentUser: {
    id: '1',
    name: '管理员',
    role: '系统管理员',
    department: '档案管理部',
    permission_level: 1,
  },
  notifications: [],
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCurrentUser: (user) => set({ currentUser: user }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: Date.now().toString(),
          read: false,
        },
        ...state.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
}))

export default useAppStore
