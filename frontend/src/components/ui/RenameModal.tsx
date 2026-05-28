import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { File, Check, X, FileCode2, FileText, Pencil } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const fileIcon = (name: string) => {
  if (name.endsWith('.lua')) return FileCode2
  if (name.endsWith('.txt') || name.endsWith('.md')) return FileText
  return File
}

export default function RenameModal() {
  const { tabs, renameTab } = useAppStore()
  const [open, setOpen] = useState(false)
  const [tabId, setTabId] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const tab = tabId ? tabs.find((t) => t.id === tabId) : null

  useEffect(() => {
    const handler = (e: CustomEvent<{ tabId: string }>) => {
      setTabId(e.detail.tabId)
      const t = tabs.find((t) => t.id === e.detail.tabId)
      if (t) { setValue(t.name); setOpen(true) }
    }
    window.addEventListener('opencode:rename' as any, handler as any)
    return () => window.removeEventListener('opencode:rename' as any, handler as any)
  }, [tabs])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [open])

  const confirm = () => {
    if (tabId && value.trim() && tab?.name !== 'main.lua' && tab?.path !== 'main.lua') {
      renameTab(tabId, value.trim())
    }
    setOpen(false)
  }

  const cancel = () => setOpen(false)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={cancel}
        >
          <motion.div
            className="bg-app-card border border-app-border rounded-xl shadow-2xl w-80 overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-app-border">
              <Pencil size={14} className="text-app-accent" />
              <span className="text-xs font-medium text-zinc-300">Rename file</span>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                {tab && (() => { const Icon = fileIcon(tab.name); return <Icon size={14} className="text-zinc-400 shrink-0" /> })()}
                <span className="text-xs text-zinc-500 truncate">{tab?.name}</span>
              </div>
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel() }}
                className="w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none placeholder-zinc-600 focus:border-app-accent transition-colors"
                placeholder="New file name"
              />
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-app-border bg-app-surface/50">
              <button
                onClick={cancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-300 hover:bg-app-hover transition-colors"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                onClick={confirm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-app-accent hover:brightness-110 transition-all"
              >
                <Check size={12} />
                Rename
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
