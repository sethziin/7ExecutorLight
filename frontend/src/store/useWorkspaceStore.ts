import { create } from 'zustand'
import { ipc } from '../ipc/manager'
import type { WorkspaceFile } from '../types'

interface WorkspaceStore {
  files: WorkspaceFile[]
  root: string
  loaded: boolean
  init: () => void
  setFiles: (root: string, files: WorkspaceFile[]) => void
  readFile: (path: string, requestId?: string) => void
  saveFile: (path: string, content: string) => void
  createFile: (path: string) => void
  createFolder: (path: string) => void
  rename: (oldPath: string, newName: string) => void
  delete: (path: string) => void
  openInExplorer: (path: string) => void
}

export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  files: [],
  root: '',
  loaded: false,

  init: () => {
    ipc.send('fsInit')
  },

  setFiles: (root, files) => set({ root, files, loaded: true }),

  readFile: (path, requestId) => {
    ipc.send('fsRead', { path, requestId: requestId ?? 'default' })
  },

  saveFile: (path, content) => {
    ipc.send('fsSave', { path, content })
  },

  createFile: (path) => {
    ipc.send('fsCreateFile', { path })
  },

  createFolder: (path) => {
    ipc.send('fsCreateFolder', { path })
  },

  rename: (oldPath, newName) => {
    ipc.send('fsRename', { oldPath, newName })
  },

  delete: (path) => {
    ipc.send('fsDelete', { path })
  },

  openInExplorer: (path) => {
    ipc.send('fsOpenInExplorer', { path })
  },
}))
