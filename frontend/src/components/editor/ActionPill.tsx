import { Trash2, Save, FolderOpen } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { ipc } from '../../ipc/manager'

export default function ActionPill() {
  const saveTab = useAppStore((s) => s.saveTab)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const clearCurrentTab = useAppStore((s) => s.clearCurrentTab)
  const addLog = useAppStore((s) => s.addLog)
  const tabs = useAppStore((s) => s.tabs)
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isSaved = activeTab?.saved ?? false

  const buttonClass = 'flex items-center gap-1.5 px-3 h-8 text-xs font-semibold text-white transition-colors'

  return (
    <div className="flex items-center rounded-full bg-zinc-700 shadow-sm overflow-hidden">
      <button
        onClick={() => { clearCurrentTab(); addLog('Editor cleared.', 'warn') }}
        className={`${buttonClass} hover:bg-zinc-600 rounded-l-full`}
      >
        <Trash2 size={11} />
        <span>Clear</span>
      </button>
      <div className="w-px h-3 bg-white/15 shrink-0" />
      <button
        onClick={() => { if (activeTabId) saveTab(activeTabId) }}
        className={`${buttonClass} hover:bg-zinc-600 ${
          !isSaved ? 'bg-app-accent hover:brightness-110' : ''
        }`}
      >
        <Save size={11} />
        <span>Save</span>
      </button>
      <div className="w-px h-3 bg-white/15 shrink-0" />
      <button
        onClick={() => ipc.send('openFile')}
        className={`${buttonClass} hover:bg-zinc-600 rounded-r-full`}
      >
        <FolderOpen size={11} />
        <span>Open</span>
      </button>
    </div>
  )
}
