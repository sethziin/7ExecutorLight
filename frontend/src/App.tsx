import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import { useRuntimeStore } from './store/useRuntimeStore'
import { useWorkspaceStore } from './store/useWorkspaceStore'
import { ipc } from './ipc/manager'
import type { ExecutorStateType, ApiType, AppSettings } from './types'
import type { ConsoleLine } from './types'
import type { WorkspaceFile } from './types'
import Topbar from './components/topbar/Topbar'
import Sidebar from './components/sidebar/Sidebar'
import EditorTabBar from './components/editor/EditorTabBar'
import EditorPane from './components/editor/EditorPane'
import ExecuteButton from './components/editor/ExecuteButton'
import ActionPill from './components/editor/ActionPill'
import ConsolePanel from './components/console/ConsolePanel'
import ExplorerSidebar from './components/sidebar/ExplorerSidebar'
import RenameModal from './components/ui/RenameModal'
import ScriptHubPage from './pages/ScriptHubPage'
import SettingsPage from './pages/SettingsPage'
import HomePage from './pages/HomePage'

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const toastColors = {
  success: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
  error: 'text-rose-600 border-rose-500/30 bg-rose-500/10',
  info: 'text-sky-600 border-sky-500/30 bg-sky-500/10',
}

function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-lg border border-app-border text-sm font-medium bg-app-card shadow-lg text-app-text"
            >
              <Icon size={14} className={toastColors[toast.type].split(' ')[0]} />
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-1 text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const { currentPage, settings } = useAppStore()
  const wsInit = useRef(false)
  const initialRead = useRef(false)

  useEffect(() => {
    if (settings.topMost) ipc.send('topmost', { value: true })
    else ipc.send('topmost', { value: false })
  }, [settings.topMost])

  useEffect(() => {
    useRuntimeStore.getState().setAutoAttach(settings.autoAttach)
  }, [settings.autoAttach])

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * settings.uiScale}px`
  }, [settings.uiScale])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
    ipc.send('loadingTheme', { value: settings.theme })
    ipc.send('settingsSet', { key: 'theme', value: settings.theme })
  }, [settings.theme])

  useEffect(() => {
    ipc.send('appReady')
    ipc.send('settingsGetAll')
    ipc.register()
    useRuntimeStore.getState().requestFullState()

    const unsub = ipc.subscribe((data) => {
      const store = useAppStore.getState()

      if (data.type === 'stateUpdate') {
        useRuntimeStore.getState().update(
          data.state as ExecutorStateType,
          data.robloxRunning as boolean,
          (data.robloxProcessId as number) ?? 0,
          (data.apiType as ApiType) ?? 'xeno'
        )
      } else if (data.type === 'settingsData') {
        const s = data.settings as Record<string, string> | undefined
        if (s?.theme) store.updateSettings({ theme: s.theme as AppSettings['theme'] })
      } else if (data.type === 'log') {
        store.addLog(
          data.message as string,
          (data.level as ConsoleLine['type']) ?? 'info'
        )
      } else if (data.type === 'openFileResult') {
        store.openFile(data.name as string, data.content as string, data.language as string)
      } else if (data.type === 'fsDirectory') {
        const files = (data.files as WorkspaceFile[]) ?? []
        useWorkspaceStore.getState().setFiles(data.root as string, files)
        if (!initialRead.current && files.length > 0) {
          initialRead.current = true
          const { tabs, activeTabId } = useAppStore.getState()
          const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]
          if (tab?.path && files.some((f) => f.path === tab.path && !f.isDirectory)) {
            useWorkspaceStore.getState().readFile(tab.path)
          }
        }
      } else if (data.type === 'fsReadResult') {
        const path = data.path as string
        const content = data.content as string
        const language = data.language as string ?? 'lua'
        const name = path.split(/[/\\]/).pop() ?? 'untitled'
        store.openFile(name, content, language, path)
      } else if (data.type === 'fsError') {
        store.addToast((data.message as string) ?? 'Filesystem error', 'error')
      }
    })

    return () => unsub()
  }, [])

  useEffect(() => {
    if (!wsInit.current) {
      wsInit.current = true
      useWorkspaceStore.getState().init()
    }
  }, [])

  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-app-bg text-zinc-800 font-sans select-none">
      <Topbar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar sidebarOpen={sidebarOpen} />

        <div className="flex-1 relative overflow-hidden min-w-0">
          {/* Page: Editor (always mounted so Monaco stays alive) */}
          <div
            className={`absolute inset-0 flex flex-col overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
              currentPage === 'editor' ? 'opacity-100 z-10' : 'opacity-0 translate-y-0.5 z-0 pointer-events-none'
            }`}
          >
            <EditorTabBar />
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 flex flex-col min-w-0">
                <EditorPane />
                <ConsolePanel />
              </div>
              <AnimatePresence>
                {settings.explorerOpen && <ExplorerSidebar />}
              </AnimatePresence>
            </div>
            <motion.div
              initial={false}
              animate={{
                bottom: settings.consoleOpen ? 236 : 56,
              }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="absolute left-3 z-50"
            >
              <ActionPill />
            </motion.div>
            <motion.div
              initial={false}
              animate={{
                bottom: settings.consoleOpen ? 236 : 56,
                right: settings.explorerOpen ? 236 : 16,
              }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="absolute z-50"
            >
              <ExecuteButton />
            </motion.div>
          </div>

          {/* Page: Home */}
          <div
            className={`absolute inset-0 overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
              currentPage === 'home' ? 'opacity-100 z-10' : 'opacity-0 translate-y-0.5 z-0 pointer-events-none'
            }`}
          >
            <HomePage />
          </div>

          {/* Page: ScriptHub */}
          <div
            className={`absolute inset-0 overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
              currentPage === 'scripthub' ? 'opacity-100 z-10' : 'opacity-0 translate-y-0.5 z-0 pointer-events-none'
            }`}
          >
            <ScriptHubPage />
          </div>

          {/* Page: Settings */}
          <div
            className={`absolute inset-0 overflow-hidden transition-[opacity,transform] duration-200 ease-out ${
              currentPage === 'settings' ? 'opacity-100 z-10' : 'opacity-0 translate-y-0.5 z-0 pointer-events-none'
            }`}
          >
            <SettingsPage />
          </div>
        </div>
      </div>

      <ToastContainer />
      <RenameModal />
    </div>
  )
}
