import { FolderOpen } from 'lucide-react'
import { ipc } from '../../ipc/manager'

export default function OpenButton() {
  return (
    <button
      onClick={() => ipc.send('openFile')}
      className="flex items-center gap-1.5 pl-3 pr-3 h-8 rounded-full text-xs font-semibold bg-zinc-600 hover:bg-zinc-500 text-white transition-all shadow-sm"
    >
      <FolderOpen size={11} />
      <span>Open</span>
    </button>
  )
}
