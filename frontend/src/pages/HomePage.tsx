import { useEffect } from 'react'
import { Plus, FileCode2, Cloud, Clock, Settings, ArrowRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HomePage() {
  const { setPage, addTab, tabs, recentFiles } = useAppStore()
  const { files, readFile } = useWorkspaceStore()
  const fileCount = tabs.length

  const validFiles = recentFiles.filter((f) =>
    files.some((wf) => wf.path === f.name || wf.path.endsWith('/' + f.name) || wf.path.endsWith('\\' + f.name))
  )

  useEffect(() => {
    if (files.length > 0 && validFiles.length !== recentFiles.length) {
      useAppStore.getState().setRecentFiles(validFiles)
    }
  }, [files])

  const handleRecentClick = (fileName: string) => {
    const match = files.find(
      (wf) => wf.path === fileName || wf.path.endsWith('/' + fileName) || wf.path.endsWith('\\' + fileName)
    )
    if (match && !match.isDirectory) {
      readFile(match.path)
      setPage('editor')
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-app-bg p-6 flex flex-col gap-6">
      {/* Quick Actions */}
      <div>
        <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Quick Actions</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Plus, label: 'New File', desc: `${fileCount} file${fileCount !== 1 ? 's' : ''} open`, action: () => { addTab(); setPage('editor') } },
            { icon: FileCode2, label: 'Open Editor', desc: 'Go to editor view', action: () => setPage('editor') },
            { icon: Cloud, label: 'Script Hub', desc: 'Browse community scripts', action: () => setPage('scripthub') },
          ].map(({ icon: Icon, label, desc, action }) => (
            <button
              key={label}
              onClick={action}
              className="group flex flex-col items-center justify-center gap-3 p-6 bg-app-card border border-app-border rounded-lg hover:border-app-hover transition-all text-center min-h-[130px]"
            >
              <div className="w-11 h-11 rounded-xl bg-app-hover flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                <Icon size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-200 transition-colors">{label}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Files */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Recent Files</div>
        </div>
        <div className="flex-1 bg-app-card border border-app-border rounded-lg overflow-hidden min-h-0">
          <div className="h-full overflow-y-auto divide-y divide-app-border">
            {validFiles.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-xs">No recent files</div>
            ) : validFiles.map((file) => (
              <button
                key={file.name}
                onClick={() => handleRecentClick(file.name)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-app-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileCode2 size={14} className="text-app-accent opacity-60 shrink-0" />
                  <span className="text-sm text-zinc-300 font-mono truncate">{file.name}</span>
                </div>
                <span className="text-[11px] text-zinc-600 flex items-center gap-1.5 shrink-0">
                  <Clock size={10} />
                  {relativeTime(file.openedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings shortcut */}
      <div>
        <button
          onClick={() => setPage('settings')}
          className="w-full flex items-center justify-between px-5 py-3 bg-app-card border border-app-border rounded-lg hover:border-app-hover transition-all group"
        >
          <div className="flex items-center gap-3">
            <Settings size={14} className="text-zinc-600" />
            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Settings</span>
          </div>
          <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
        </button>
      </div>
    </div>
  )
}
