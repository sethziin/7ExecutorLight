import { Save } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function SaveButton() {
  const saveTab = useAppStore((s) => s.saveTab)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const tabs = useAppStore((s) => s.tabs)
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isSaved = activeTab?.saved ?? false

  return (
    <button
      onClick={() => { if (activeTabId) saveTab(activeTabId) }}
      className={`flex items-center gap-1.5 pl-3 pr-3 h-8 rounded-full text-xs font-semibold text-white transition-all shadow-sm ${
        isSaved
          ? 'bg-zinc-600 hover:bg-zinc-500'
          : 'bg-app-accent hover:opacity-90'
      }`}
    >
      <Save size={11} />
      <span>Save</span>
    </button>
  )
}
