import { create } from 'zustand'
import type { ExecutorStateType, ApiType } from '../types'
import { ipc } from '../ipc/manager'

interface RuntimeStore {
  state: ExecutorStateType
  robloxRunning: boolean
  robloxProcessId: number
  apiType: ApiType

  update: (state: ExecutorStateType, robloxRunning: boolean, robloxProcessId: number, apiType?: ApiType) => void
  attach: () => void
  execute: (script: string) => void
  killRoblox: () => void
  setAutoAttach: (enabled: boolean) => void
  switchApi: (api: ApiType) => void
  requestFullState: () => void
}

export const useRuntimeStore = create<RuntimeStore>()((set) => ({
  state: 'initializing',
  robloxRunning: false,
  robloxProcessId: 0,
  apiType: 'xeno',

  update: (state, robloxRunning, robloxProcessId, apiType = 'xeno') => {
    console.log('[Runtime] update:', { state, robloxRunning, robloxProcessId, apiType })
    set({ state, robloxRunning, robloxProcessId, apiType })
  },

  attach: () => {
    ipc.send('quorumAttach')
  },

  execute: (script) => {
    ipc.send('quorumExecute', { script })
  },

  killRoblox: () => {
    ipc.send('quorumKillRoblox')
  },

  setAutoAttach: (enabled) => {
    ipc.send('quorumSetAutoAttach', { value: enabled })
  },

  switchApi: (api: ApiType) => {
    ipc.send('switchApi', { api })
  },

  requestFullState: () => {
    ipc.send('pushFullState')
  },
}))
