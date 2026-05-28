import { PanelLeft } from 'lucide-react'
import { useCallback } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { ipc } from '../../ipc/manager'
import AttachButton from './AttachButton'
import StatusIndicator from './StatusIndicator'
import WindowControls from './WindowControls'

export default function Topbar() {
  const handleDragStart = useCallback(() => ipc.send('drag'), [])

  return (
    <div
      onMouseDown={handleDragStart}
      className="flex items-center justify-between h-12 px-3 bg-app-surface border-b border-app-border shrink-0 z-30 select-none will-change-transform"
    >
      <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
        <button
          onClick={() => useAppStore.getState().toggleSidebar()}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-400 hover:bg-app-hover rounded-md transition-colors"
        >
          <PanelLeft size={16} strokeWidth={1.5} />
        </button>
        <StatusIndicator />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-sm font-semibold text-app-text tracking-wide">7E</span>
      </div>

      <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
        <AttachButton />
        <WindowControls />
      </div>
    </div>
  )
}
