import { useState, useEffect, useRef } from 'react'
import { Plus, FileCode2, FileText, File, X, XCircle, Layers, Pencil } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const fileIcon = (name: string) => {
  if (name.endsWith('.lua')) return FileCode2
  if (name.endsWith('.txt') || name.endsWith('.md')) return FileText
  return File
}

export default function EditorTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab, closeOthers, closeAll } = useAppStore()
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string } | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ctxActions = [
    { label: 'Close', icon: X, disabled: false, action: () => { if (ctxMenu) { closeTab(ctxMenu.tabId); setCtxMenu(null) } } },
    { label: 'Close Others', icon: XCircle, disabled: tabs.length <= 2, action: () => { if (ctxMenu) { closeOthers(ctxMenu.tabId); setCtxMenu(null) } } },
    { label: 'Close All', icon: Layers, disabled: false, action: () => { closeAll(); setCtxMenu(null) } },
    { label: 'Rename', icon: Pencil, disabled: false, action: () => { if (ctxMenu) { window.dispatchEvent(new CustomEvent('opencode:rename', { detail: { tabId: ctxMenu.tabId } })); setCtxMenu(null) } } },
  ]

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, tabId })
  }

  return (
    <>
    <div className="flex items-center h-9 bg-app-surface border-b border-app-border shrink-0 overflow-hidden select-none">
      <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId
          const isMain = index === 0
          const Icon = fileIcon(tab.name)
          return (
            <div
              key={tab.id}
              className={`relative flex items-center gap-2 px-3 h-9 cursor-pointer shrink-0 border-r border-app-border group transition-colors ${
                active
                  ? 'bg-app-bg text-app-accent'
                  : 'text-zinc-500 hover:bg-app-hover hover:text-zinc-400'
              }`}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={!isMain ? (e) => handleContextMenu(e, tab.id) : undefined}
            >
              <Icon size={12} strokeWidth={1.8} className={active ? 'text-app-accent' : ''} />
              <span className={`text-xs font-medium whitespace-nowrap max-w-[120px] truncate ${
                active ? 'text-app-accent' : ''
              }`}>
                {tab.name}
              </span>
              {!tab.saved && <span className="w-1.5 h-1.5 rounded-full bg-app-accent shrink-0" />}
              {!isMain && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  className="w-3.5 h-3.5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--app-border)_60%,transparent)] text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <X size={9} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button
        onClick={() => addTab()}
        className="shrink-0 w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-app-hover transition-colors border-l border-app-border"
      >
        <Plus size={13} strokeWidth={1.8} />
      </button>
    </div>
    {ctxMenu && (
      <div
        ref={ctxRef}
        className="fixed z-[999] min-w-[140px] bg-app-card border border-app-border rounded-lg shadow-lg py-1"
        style={{ left: ctxMenu.x, top: ctxMenu.y }}
      >
        {ctxActions.map((item) => (
          <button
            key={item.label}
            disabled={item.disabled}
            onClick={() => item.action()}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              item.disabled
                ? 'text-zinc-700 cursor-not-allowed'
                : 'text-zinc-400 hover:bg-app-hover hover:text-zinc-200'
            }`}
          >
            <item.icon size={11} className="shrink-0" />
            {item.label}
          </button>
        ))}
      </div>
    )}
    </>
  )
}
