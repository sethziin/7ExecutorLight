import { useRuntimeStore } from '../../store/useRuntimeStore'
import type { ExecutorStateType } from '../../types'

const statusConfig: Record<ExecutorStateType, { color: string; label: string }> = {
  initializing: { color: 'bg-amber-400', label: 'Initializing' },
  ready: { color: 'bg-orange-500', label: 'Waiting for Roblox' },
  'waiting-for-roblox': { color: 'bg-orange-500', label: 'Waiting for Roblox' },
  attaching: { color: 'bg-sky-500', label: 'Attaching' },
  attached: { color: 'bg-emerald-500', label: 'Attached' },
  failed: { color: 'bg-red-500', label: 'Failed' },
  'roblox-closed': { color: 'bg-red-500', label: 'Roblox Closed' },
  error: { color: 'bg-red-500', label: 'Error' },
}

export default function StatusIndicator() {
  const state = useRuntimeStore((s) => s.state)
  const robloxRunning = useRuntimeStore((s) => s.robloxRunning)

  if (!robloxRunning && (state === 'ready' || state === 'waiting-for-roblox')) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-zinc-500 shadow-sm" />
        <span className="text-[11px] font-medium text-zinc-500 truncate">Offline</span>
      </div>
    )
  }

  const { color, label } = statusConfig[state]

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`w-2 h-2 rounded-full ${color} shadow-sm`} />
      <span className="text-[11px] font-medium text-zinc-500 truncate">{label}</span>
    </div>
  )
}
