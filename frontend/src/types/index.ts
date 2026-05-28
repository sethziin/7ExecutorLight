export type PageId = 'home' | 'editor' | 'scripthub' | 'settings'

export type ExecutorStateType = 'initializing' | 'ready' | 'waiting-for-roblox' | 'attaching' | 'attached' | 'failed' | 'roblox-closed' | 'error'

export type ApiType = 'xeno' | 'velocity'

export interface StateUpdateMessage {
  type: 'stateUpdate'
  state: ExecutorStateType
  robloxRunning: boolean
  robloxProcessId: number
  errorMessage: string
  apiType?: ApiType
}

export type IpcMessage = StateUpdateMessage | {
  type: 'log'
  message: string
  level: string
} | {
  type: 'openFileResult'
  name: string
  content: string
  language: string
}

export interface Tab {
  id: string
  name: string
  path?: string
  content: string
  saved: boolean
  language: string
}

export interface WorkspaceFile {
  name: string
  path: string
  isDirectory: boolean
  children?: WorkspaceFile[]
}

export interface ConsoleLine {
  id: string
  text: string
  type: 'info' | 'error' | 'success' | 'warn' | 'system'
  timestamp: string
}

export type UiScale = 0.92 | 1 | 1.08 | 1.16

export interface RecentFile {
  name: string
  openedAt: number
}

export interface AppSettings {
  fontSize: number
  minimap: boolean
  explorerOpen: boolean
  consoleOpen: boolean
  theme: 'dark' | 'darker' | 'light' | 'pink'
  topMost: boolean
  autoAttach: boolean
  wordWrap: boolean
  lineNumbers: boolean
  uiScale: UiScale
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface ScriptBloxGame {
  _id: string
  name: string
  imageUrl?: string
}

export interface ScriptBloxPreview {
  _id: string
  title: string
  slug: string
  verified: boolean
  key: boolean
  views: number
  likeCount?: number
  scriptType: string
  isUniversal: boolean
  isPatched: boolean
  image: string
  createdAt: string
  game: ScriptBloxGame
}

export interface ScriptBloxOwner {
  _id: string
  username: string
  verified: boolean
  profilePicture?: string
  status?: string
}

export interface ScriptBloxDetails {
  _id: string
  title: string
  features?: string
  tags?: string[]
  script: string
  image: string
  slug: string
  verified: boolean
  key: boolean
  keyLink?: string
  views: number
  likeCount?: number
  dislikeCount?: number
  liked?: boolean
  disliked?: boolean
  isFav?: boolean
  scriptType: string
  isUniversal: boolean
  isPatched: boolean
  visibility?: string
  createdAt: string
  game: ScriptBloxGame & { gameId?: number }
  owner: ScriptBloxOwner
}
