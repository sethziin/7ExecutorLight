import { useState, useCallback } from 'react'
import { Minus, Square, X, Minimize2 } from 'lucide-react'
import { ipc } from '../../ipc/manager'

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  const handleMinimize = useCallback(() => ipc.send('minimize'), [])
  const handleMaximize = useCallback(() => {
    setMaximized((p) => !p)
    ipc.send('maximize')
  }, [])
  const handleClose = useCallback(() => ipc.send('close'), [])

  return (
    <div className="flex items-center">
      <button
        onClick={handleMinimize}
        className="w-9 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-app-hover rounded-md transition-colors"
        title="Minimize"
      >
        <Minus size={12} strokeWidth={1.5} />
      </button>
      <button
        onClick={handleMaximize}
        className="w-9 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-app-hover rounded-md transition-colors"
        title={maximized ? 'Restore' : 'Maximize'}
      >
        {maximized ? <Minimize2 size={11} strokeWidth={1.5} /> : <Square size={10} strokeWidth={1.5} />}
      </button>
      <button
        onClick={handleClose}
        className="w-9 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-red-500 rounded-md transition-colors"
        title="Close"
      >
        <X size={13} strokeWidth={1.5} />
      </button>
    </div>
  )
}
