import { Play, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRuntimeStore } from '../../store/useRuntimeStore'
import { useAppStore } from '../../store/useAppStore'

export default function ExecuteButton() {
  const execute = useRuntimeStore((s) => s.execute)
  const state = useRuntimeStore((s) => s.state)
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isAttached = state === 'attached'

  const handleExecute = () => {
    if (!isAttached || !activeTab) return
    execute(activeTab.content)
  }

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center rounded-full transition-all ${
        isAttached
          ? 'bg-app-accent shadow-sm'
          : 'bg-zinc-500'
      }`}>
        <button
          onClick={handleExecute}
          disabled={!isAttached}
          className="flex items-center gap-1.5 pl-3 pr-1.5 h-8 text-xs font-semibold text-white disabled:opacity-50 transition-colors rounded-l-full"
        >
          <Play size={11} fill="white" strokeWidth={0} />
          <span>Execute</span>
        </button>
        <div className="w-px h-3 bg-white/20" />
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-6 h-8 text-white/80 hover:text-white transition-colors rounded-r-full"
        >
          <ChevronDown
            size={11}
            strokeWidth={2}
            className="transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 bottom-full mb-1 min-w-[140px] bg-app-card border border-app-border rounded-lg shadow-lg py-1 z-50 origin-bottom-right"
          >
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-app-hover transition-colors"
            >
              Execute All
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
