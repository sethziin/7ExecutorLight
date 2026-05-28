import { Link, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRuntimeStore } from '../../store/useRuntimeStore'

export default function AttachButton() {
  const state = useRuntimeStore((s) => s.state)
  const attach = useRuntimeStore((s) => s.attach)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isAttached = state === 'attached'
  const isBusy = state === 'attaching'

  return (
    <div ref={ref} className="relative shrink-0 min-h-[32px] max-h-[32px]">
      <div className="flex items-center h-8 min-h-[32px] max-h-[32px] rounded-full bg-app-card border border-app-border shadow-sm">
        <button
          onClick={attach}
          disabled={isBusy}
          className="flex items-center gap-1.5 pl-3 pr-2 h-8 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors rounded-l-full"
        >
          <Link size={12} strokeWidth={1.8} className={isAttached ? 'text-emerald-600' : 'text-zinc-500'} />
          <span>{isBusy ? 'Attaching...' : isAttached ? 'Attached' : 'Attach'}</span>
        </button>
        <div className="w-px h-4 bg-app-border shrink-0" />
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-6 h-8 text-zinc-500 hover:text-zinc-300 transition-colors rounded-r-full"
        >
          <ChevronDown
            size={12}
            strokeWidth={2}
            className="transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1 min-w-[140px] bg-app-card border border-app-border rounded-lg shadow-lg py-1 z-50 origin-top-right"
          >
            <button
              onClick={() => { useRuntimeStore.getState().killRoblox(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-app-hover transition-colors"
            >
              Kill Roblox
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
