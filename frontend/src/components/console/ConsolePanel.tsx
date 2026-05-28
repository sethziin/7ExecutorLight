import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Trash2, ChevronDown, ChevronUp, X, TriangleAlert } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const linePrefix: Record<string, string> = {
  info: '\u203A',
  success: '\u2713',
  error: '\u2717',
  warn: '!',
  system: '#',
}

const lineColors: Record<string, string> = {
  info: 'text-zinc-400',
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warn: 'text-amber-400',
  system: 'text-indigo-400',
}

export default function ConsolePanel() {
  const { consoleLogs, clearLogs, settings, updateSettings } = useAppStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consoleLogs])

  return (
    <div className="border-t border-app-border flex flex-col bg-app-panel shrink-0">
      {/* Header */}
      <div
        onClick={() => updateSettings({ consoleOpen: !settings.consoleOpen })}
        className="flex items-center justify-between h-11 px-4 border-b border-app-border shrink-0 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Terminal size={13} className="text-app-accent opacity-70" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Console</span>
          {consoleLogs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-app-border text-zinc-500 font-mono leading-none">
              {consoleLogs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={clearLogs}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-app-hover transition-colors"
            title="Clear console">
            <Trash2 size={12} />
          </button>
          <button onClick={() => updateSettings({ consoleOpen: !settings.consoleOpen })}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-app-hover transition-colors">
            {settings.consoleOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          <button onClick={() => updateSettings({ consoleOpen: false })}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-app-hover transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Log output */}
      <AnimatePresence>
        {settings.consoleOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 180, opacity: 1 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-y-auto font-mono text-xs scroll-thin"
            style={{ minHeight: 0 }}
          >
            <div className="px-3 py-2">
            {consoleLogs.length === 0 ? (
              <div className="text-zinc-500 text-sm py-3 text-center">No output yet.</div>
            ) : (
              consoleLogs.map((line) => (
                <div key={line.id} className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-[color-mix(in_srgb,var(--app-hover)_30%,transparent)] transition-colors ${lineColors[line.type] || 'text-zinc-400'}`}>
                  <span className="text-zinc-500 shrink-0 text-[10px] pt-px font-mono">{line.timestamp}</span>
                  {line.type === 'warn' ? (
                    <TriangleAlert size={10} className="shrink-0 mt-0.5" />
                  ) : (
                    <span className="shrink-0 text-xs leading-tight opacity-60">{linePrefix[line.type]}</span>
                  )}
                  <span className="flex-1 break-words text-xs leading-tight">{line.text}</span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
