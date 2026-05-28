import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileCode2, FileText, File, Folder, FolderOpen, ChevronRight, ChevronDown, X, Plus, Trash2, Pencil, FilePlus, FolderPlus, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { ipc } from '../../ipc/manager'
import type { WorkspaceFile } from '../../types'

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
  depth: number
}

function buildTree(files: WorkspaceFile[]): TreeNode[] {
  const root: TreeNode[] = []
  const map = new Map<string, TreeNode>()

  const sorted = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })

  for (const f of sorted) {
    const parts = f.path.replace(/\\/g, '/').split('/')
    let current = root
    let accumulated = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      accumulated = accumulated ? `${accumulated}/${part}` : part
      const existing = current.find((n) => n.name === part)
      if (existing) {
        current = existing.children
      } else {
        const isDir = i < parts.length - 1 || f.isDirectory
        const node: TreeNode = { name: part, path: accumulated, isDirectory: isDir, children: [], depth: i }
        current.push(node)
        current = node.children
      }
    }
  }
  return root
}

function getFileIcon(name: string, isDirectory: boolean): React.ElementType {
  if (isDirectory) return Folder
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'lua') return FileCode2
  if (ext === 'md' || ext === 'markdown') return FileText
  if (ext === 'txt' || ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'toml' || ext === 'cfg' || ext === 'config') return FileText
  return File
}

function getFileColor(name: string, isDirectory: boolean): string {
  if (isDirectory) return 'text-zinc-500'
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'lua') return 'text-app-accent opacity-70'
  if (ext === 'md' || ext === 'markdown') return 'text-app-accent opacity-70'
  if (ext === 'json') return 'text-app-accent opacity-70'
  return 'text-zinc-400'
}

function flattenTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  const result: TreeNode[] = []
  function walk(list: TreeNode[]) {
    for (const n of list) {
      if (n.name.toLowerCase().includes(q)) {
        result.push(n)
      }
      walk(n.children)
    }
  }
  walk(nodes)
  return result
}

const FILE_ACTIONS = [
  { id: 'file', label: 'New File', icon: FilePlus, shortcut: '' },
  { id: 'folder', label: 'New Folder', icon: FolderPlus, shortcut: '' },
]

export default function ExplorerSidebar() {
  const { openFile, settings, updateSettings, addToast } = useAppStore()
  const { files, readFile, createFile, createFolder, rename, delete: deleteFile, openInExplorer } = useWorkspaceStore()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [createValue, setCreateValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const createRef = useRef<HTMLInputElement>(null)

  const tree = useMemo(() => buildTree(files), [files])
  const visible = useMemo(() => {
    if (!query) return tree
    const q = query.toLowerCase()
    function filterTree(nodes: TreeNode[]): TreeNode[] {
      return nodes.reduce<TreeNode[]>((acc, n) => {
        const match = n.name.toLowerCase().includes(q)
        const filteredChildren = filterTree(n.children)
        if (match || filteredChildren.length > 0) {
          acc.push({ ...n, children: filteredChildren })
        }
        return acc
      }, [])
    }
    return filterTree(tree)
  }, [tree, query])

  useEffect(() => { renameRef.current?.focus(); renameRef.current?.select() }, [renaming])
  useEffect(() => { createRef.current?.focus() }, [creating])

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const startRename = useCallback((node: TreeNode) => {
    setRenaming(node.path)
    setRenameValue(node.name)
    setCreating(null)
  }, [])

  const submitRename = useCallback(() => {
    if (renaming && renameValue.trim()) {
      rename(renaming, renameValue.trim())
    }
    setRenaming(null)
    setRenameValue('')
  }, [renaming, renameValue, rename])

  const startCreate = useCallback((type: 'file' | 'folder') => {
    setCreating(type)
    setCreateValue('')
    setRenaming(null)
  }, [])

  const submitCreate = useCallback(() => {
    if (creating && createValue.trim()) {
      const parentPath = '' // new items go at root for now; could improve with context
      const fullPath = createValue.trim()
      if (creating === 'file') createFile(fullPath)
      else createFolder(fullPath)
    }
    setCreating(null)
    setCreateValue('')
  }, [creating, createValue, createFile, createFolder])

  const handleFileClick = useCallback((node: TreeNode) => {
    if (node.isDirectory) {
      toggleExpand(node.path)
    } else {
      readFile(node.path)
    }
  }, [readFile, toggleExpand])

  function renderNode(node: TreeNode): React.ReactNode {
    const isExpanded = expanded.has(node.path)
    const isRenaming = renaming === node.path
    const Icon = getFileIcon(node.name, node.isDirectory)
    const iconColor = getFileColor(node.name, node.isDirectory)
    const DisplayIcon = node.isDirectory ? (isExpanded ? FolderOpen : Folder) : Icon

    return (
      <div key={node.path}>
        <div
          className={`group flex items-center gap-1 px-2 py-1 rounded-md text-left hover:bg-app-hover transition-colors cursor-pointer ${node.depth > 0 ? 'ml-3' : ''}`}
          style={{ paddingLeft: `${8 + node.depth * 16}px` }}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => {
            e.preventDefault()
            // could show context menu here
          }}
        >
          {node.isDirectory && (
            <span className="shrink-0">
              {isExpanded ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-500" />}
            </span>
          )}
          {!node.isDirectory && <span className="w-[10px] shrink-0" />}
          <DisplayIcon size={13} className={`shrink-0 ${iconColor}`} />
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(null) }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-app-surface border border-app-border rounded px-1 py-0.5 text-xs text-zinc-200 outline-none"
            />
          ) : (
            <span className="flex-1 min-w-0 text-xs text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">{node.name}</span>
          )}
          {!isRenaming && (
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
              {node.name !== 'main.lua' && (
                <button
                  onClick={(e) => { e.stopPropagation(); startRename(node) }}
                  className="btn-ghost-xs"
                  title="Rename"
                >
                  <Pencil size={10} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteFile(node.path) }}
                className="btn-ghost-xs text-app-accent opacity-60 hover:opacity-100"
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
              {!node.isDirectory && (
                <button
                  onClick={(e) => { e.stopPropagation(); openInExplorer(node.path) }}
                  className="btn-ghost-xs"
                  title="Open in Explorer"
                >
                  <ExternalLink size={10} />
                </button>
              )}
            </div>
          )}
        </div>
        {node.isDirectory && isExpanded && node.children.length > 0 && (
          <AnimatePresence>
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              {node.children.map(renderNode)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 220, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col bg-app-panel border-l border-app-border overflow-hidden shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-11 border-b border-app-border shrink-0">
        <span className="section-label">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => startCreate('file')} className="btn-ghost-sm" title="New File">
            <FilePlus size={11} />
          </button>
          <button onClick={() => startCreate('folder')} className="btn-ghost-sm" title="New Folder">
            <FolderPlus size={11} />
          </button>
          <button onClick={() => updateSettings({ explorerOpen: false })} className="btn-ghost-sm">
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Search + Create inline */}
      <div className="px-2.5 py-2.5 border-b border-app-border shrink-0 space-y-2">
        <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-md px-2.5 py-1.5 focus-within:border-[color-mix(in_srgb,var(--app-accent)_40%,transparent)] transition-colors">
          <Search size={11} className="text-zinc-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="bg-transparent text-xs text-zinc-300 placeholder:text-zinc-500 outline-none flex-1 min-w-0"
          />
          {query && (
            <button onClick={() => setQuery('')} className="btn-ghost-sm">
              <X size={10} />
            </button>
          )}
        </div>
        {creating && (
          <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-md px-2.5 py-1.5">
            {creating === 'file' ? <FilePlus size={10} className="text-zinc-500 shrink-0" /> : <FolderPlus size={10} className="text-zinc-500 shrink-0" />}
            <input
              ref={createRef}
              value={createValue}
              onChange={(e) => setCreateValue(e.target.value)}
              onBlur={submitCreate}
              onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(); if (e.key === 'Escape') setCreating(null) }}
              placeholder={creating === 'file' ? 'filename.lua' : 'folder-name'}
              className="bg-transparent text-xs text-zinc-300 placeholder:text-zinc-500 outline-none flex-1 min-w-0"
            />
          </div>
        )}
      </div>

      {/* Workspace label */}
      <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">
        <ChevronRight size={10} />
        Workspace
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 scroll-thin">
        {visible.length === 0 && (
          <p className="text-center text-xs text-zinc-500 py-4">
            {query ? 'No files found' : 'Empty workspace'}
          </p>
        )}
        {visible.map(renderNode)}
      </div>
    </motion.div>
  )
}
