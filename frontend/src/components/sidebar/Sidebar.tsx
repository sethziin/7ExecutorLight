import React from 'react'
import { motion } from 'framer-motion'
import { Home, Code, Cloud, Settings } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { PageId } from '../../types'

interface SidebarItem {
  id: PageId
  Icon: React.ElementType
}

const ITEMS: SidebarItem[] = [
  { id: 'home', Icon: Home },
  { id: 'editor', Icon: Code },
  { id: 'scripthub', Icon: Cloud },
  { id: 'settings', Icon: Settings },
]

export default function Sidebar({ sidebarOpen }: { sidebarOpen: boolean }) {
  const currentPage = useAppStore((s) => s.currentPage)
  const setPage = useAppStore((s) => s.setPage)

  const renderIcon = (id: string, Icon: React.ElementType) => {
    const active = currentPage === id
    return (
      <button
        key={id}
        onClick={() => setPage(id as PageId)}
        className={`w-[52px] h-[52px] flex items-center justify-center rounded-xl transition-colors ${
          active
            ? 'border border-app-accent bg-app-card'
            : 'text-zinc-500 hover:text-zinc-400 hover:bg-[color-mix(in_srgb,var(--app-hover)_60%,transparent)]'
        }`}
      >
        <Icon
          size={18}
          strokeWidth={active ? 2 : 1.6}
          className={active ? 'text-app-accent' : 'text-inherit'}
        />
      </button>
    )
  }

  return (
    <motion.div
      animate={{ width: sidebarOpen ? 76 : 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="bg-app-panel border-r border-app-border flex flex-col items-center py-4 shrink-0 overflow-hidden select-none"
    >
      <div className="flex flex-col items-center gap-3 flex-1 justify-center min-w-0">
        {ITEMS.filter(i => i.id !== 'settings').map(({ id, Icon }) => renderIcon(id, Icon))}
      </div>
      <div className="flex flex-col items-center gap-3 min-w-0">
        <div className="w-8 h-px bg-app-border shrink-0" />
        {renderIcon('settings', Settings)}
      </div>
    </motion.div>
  )
}
