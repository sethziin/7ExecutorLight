import { Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export default function CleanButton() {
  const clearCurrentTab = useAppStore((s) => s.clearCurrentTab)
  const addLog = useAppStore((s) => s.addLog)

  const handleClean = () => {
    clearCurrentTab()
    addLog('Editor cleared.', 'warn')
  }

  return (
    <button
      onClick={handleClean}
      className="flex items-center gap-1.5 pl-3 pr-3 h-8 rounded-full text-xs font-semibold bg-app-accent hover:opacity-90 text-white transition-all shadow-sm"
    >
      <Trash2 size={11} />
      <span>Clear</span>
    </button>
  )
}
