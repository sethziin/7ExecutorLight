import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ipc } from '../ipc/manager'
import { useWorkspaceStore } from './useWorkspaceStore'
import type { PageId, Tab, ConsoleLine, AppSettings, Toast, RecentFile } from '../types'

const MAX_TABS = 6
const genId = () => Math.random().toString(36).slice(2, 10)

const now = () => new Date().toLocaleTimeString('en-US', { hour12: false })

const DEFAULT_CONTENT = `-- Welcome to CodeForge
-- A modern, lightweight code editor

local function greet(name)
  print("Hello, " .. name .. "!")
end

greet("World")
`

const AUTOSAVE_MS = 800
const _autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  minimap: false,
  explorerOpen: false,
  consoleOpen: false,
  theme: 'dark',
  topMost: false,
  autoAttach: false,
  wordWrap: false,
  lineNumbers: true,
  uiScale: 1,
}

interface AppStore {
  currentPage: PageId
  tabs: Tab[]
  activeTabId: string | null
  recentFiles: RecentFile[]
  consoleLogs: ConsoleLine[]
  settings: AppSettings
  toasts: Toast[]
  contextMenu: { x: number; y: number; tabId: string } | null
  sidebarOpen: boolean
  toggleSidebar: () => void
  setPage: (page: PageId) => void
  addTab: (overrides?: Partial<Tab>) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  renameTab: (id: string, name: string) => void
  duplicateTab: (id: string) => void
  closeOthers: (id: string) => void
  closeAll: () => void
  saveTab: (id: string) => void
  clearCurrentTab: () => void
  openFile: (name: string, content: string, language?: string, path?: string) => void

  trackRecentFile: (name: string) => void
  setRecentFiles: (files: RecentFile[]) => void

  addLog: (text: string, type?: ConsoleLine['type']) => void
  clearLogs: () => void

  updateSettings: (s: Partial<AppSettings>) => void

  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  setContextMenu: (menu: { x: number; y: number; tabId: string } | null) => void
}

const initialTab: Tab = {
  id: genId(),
  name: 'main.lua',
  path: 'main.lua',
  content: DEFAULT_CONTENT,
  saved: true,
  language: 'lua',
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      tabs: [initialTab],
      activeTabId: initialTab.id,
      recentFiles: [],
      consoleLogs: [],
      settings: DEFAULT_SETTINGS,
      toasts: [],
      contextMenu: null,
      sidebarOpen: true,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setPage: (page) => set({ currentPage: page }),

      addTab: (overrides) => {
        const { tabs } = get()
        if (tabs.length >= MAX_TABS) {
          get().addToast(`Tab limit reached (max ${MAX_TABS})`, 'info')
          return
        }
        const id = genId()
        const count = tabs.length + 1
        const name = overrides?.name ?? `script_${count}.lua`
        set({
          tabs: [...tabs, { id, name, content: '-- New script\n', saved: false, language: 'lua', ...overrides }],
          activeTabId: id,
        })
        get().trackRecentFile(name)
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get()
        if (tabs.length <= 1) return
        const next = tabs.filter((t) => t.id !== id)
        if (next.length === 0) return
        let nextActive = activeTabId
        if (activeTabId === id) {
          const idx = tabs.findIndex((t) => t.id === id)
          nextActive = next[Math.min(Math.max(idx - 1, 0), next.length - 1)]?.id ?? null
        }
        set({ tabs: next, activeTabId: nextActive })
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      updateTabContent: (id, content) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, content, saved: false } : t)),
        }))
        const tab = get().tabs.find((t) => t.id === id)
        if (tab?.path) {
          const existing = _autosaveTimers.get(id)
          if (existing) clearTimeout(existing)
          _autosaveTimers.set(
            id,
            setTimeout(() => {
              const current = get().tabs.find((t) => t.id === id)
              if (current?.path) {
                ipc.send('fsSave', { path: current.path, content: current.content })
                set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, saved: true } : t)) }))
              }
              _autosaveTimers.delete(id)
            }, AUTOSAVE_MS)
          )
        }
      },

      renameTab: (id, name) => {
        const tab = get().tabs.find((t) => t.id === id)
        if (tab?.name === 'main.lua' || tab?.path === 'main.lua') return
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
        }))
      },

      duplicateTab: (id) => {
        const { tabs } = get()
        if (tabs.length >= MAX_TABS) {
          get().addToast(`Tab limit reached (max ${MAX_TABS})`, 'info')
          return
        }
        const tab = tabs.find((t) => t.id === id)
        if (!tab) return
        const newId = genId()
        set({ tabs: [...tabs, { ...tab, id: newId, name: `${tab.name} (copy)`, saved: false }], activeTabId: newId })
      },

      closeOthers: (id) =>
        set((s) => ({
          tabs: s.tabs.filter((t) => t.id === id || t.id === s.tabs[0]?.id),
          activeTabId: id,
        })),

      closeAll: () =>
        set((s) => {
          const first = s.tabs[0]
          return first ? { tabs: [first], activeTabId: first.id } : s
        }),

      saveTab: (id) => {
        const { tabs } = get()
        const tab = tabs.find((t) => t.id === id)
        if (!tab) return

        const existing = _autosaveTimers.get(id)
        if (existing) { clearTimeout(existing); _autosaveTimers.delete(id) }

        get().trackRecentFile(tab.name)

        if (tab.path) {
          ipc.send('fsSave', { path: tab.path, content: tab.content })
          set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, saved: true } : t)) }))
          get().addToast('Saved', 'success')
        } else {
          ipc.send('fsSave', { path: tab.name, content: tab.content })
          set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, path: tab.name, saved: true } : t)) }))
          const root = useWorkspaceStore.getState().root
          get().addToast(root ? `${root}\\${tab.name}` : tab.name, 'success')
        }
      },

      clearCurrentTab: () => {
        const { activeTabId } = get()
        if (!activeTabId) return
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === activeTabId ? { ...t, content: '', saved: false } : t)),
        }))
      },

      openFile: (name, content, language = 'lua', path?) => {
        const { tabs } = get()
        if (path) {
          const existing = tabs.find((t) => t.path === path)
          if (existing) {
            set({ activeTabId: existing.id, currentPage: 'editor', tabs: tabs.map((t) => t.id === existing.id ? { ...t, content, saved: true } : t) })
            get().trackRecentFile(name)
            return
          }
        } else {
          const existing = tabs.find((t) => t.name === name)
          if (existing) {
            set({ activeTabId: existing.id, currentPage: 'editor' })
            get().trackRecentFile(name)
            return
          }
        }
        if (tabs.length >= MAX_TABS) {
          get().addToast(`Tab limit reached (max ${MAX_TABS})`, 'info')
          return
        }
        const id = genId()
        set({ tabs: [...tabs, { id, name, content, saved: true, language, ...(path ? { path } : {}) }], activeTabId: id, currentPage: 'editor' })
        get().trackRecentFile(name)
      },

      trackRecentFile: (name) => {
        const { recentFiles } = get()
        const filtered = recentFiles.filter((f) => f.name !== name)
        set({ recentFiles: [{ name, openedAt: Date.now() }, ...filtered].slice(0, 20) })
      },

      setRecentFiles: (files) => set({ recentFiles: files }),

      addLog: (text, type = 'info') => {
        set((s) => ({ consoleLogs: [...s.consoleLogs.slice(-200), { id: genId(), text, type, timestamp: now() }] }))
      },

      clearLogs: () => set({ consoleLogs: [] }),

      updateSettings: (s) =>
        set((prev) => ({ settings: { ...prev.settings, ...s } })),

      addToast: (message, type = 'info') => {
        const id = genId()
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => get().removeToast(id), 3000)
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setContextMenu: (menu) => set({ contextMenu: menu }),
    }),
    {
      name: 'codeforge-settings',
      partialize: (state) => ({ settings: state.settings, recentFiles: state.recentFiles, tabs: state.tabs, activeTabId: state.activeTabId, currentPage: state.currentPage }),
    }
  )
)
