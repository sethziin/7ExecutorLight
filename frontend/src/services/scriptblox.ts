import type { ScriptBloxPreview, ScriptBloxDetails } from '../types'

const BASE = 'https://scriptblox.com/api'

interface ListParams {
  page?: number
  max?: number
  mode?: 'free' | 'paid'
  patched?: 0 | 1
  key?: 0 | 1
  universal?: 0 | 1
  verified?: 0 | 1
  sortBy?: string
  order?: 'asc' | 'desc'
  strict?: boolean
  owner?: string
  placeId?: number
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`ScriptBlox error: ${res.status}`)
  return res.json()
}

function buildParams(params?: ListParams): string {
  if (!params) return ''
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  }
  return qs.toString()
}

function toPreview(raw: Record<string, unknown>): ScriptBloxPreview {
  return {
    _id: String(raw._id ?? ''),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    verified: Boolean(raw.verified),
    key: Boolean(raw.key),
    views: Number(raw.views ?? 0),
    likeCount: raw.likeCount !== undefined ? Number(raw.likeCount) : undefined,
    scriptType: String(raw.scriptType ?? ''),
    isUniversal: Boolean(raw.isUniversal),
    isPatched: Boolean(raw.isPatched),
    image: String(raw.image ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    game: {
      _id: String((raw.game as Record<string, unknown>)?._id ?? ''),
      name: String((raw.game as Record<string, unknown>)?.name ?? ''),
      imageUrl: String((raw.game as Record<string, unknown>)?.imageUrl ?? ''),
    },
  }
}

export async function fetchScripts(params?: ListParams): Promise<ScriptBloxPreview[]> {
  const q = buildParams(params)
  const data = await request<{ result: { scripts: Record<string, unknown>[] } }>(
    `/script/fetch${q ? `?${q}` : ''}`
  )
  return (data.result?.scripts ?? []).map(toPreview)
}

export async function searchScripts(query: string, params?: ListParams): Promise<ScriptBloxPreview[]> {
  const qs = new URLSearchParams({ q: query })
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v))
    }
  }
  const data = await request<{ result: { scripts: Record<string, unknown>[] } }>(
    `/script/search?${qs.toString()}`
  )
  return (data.result?.scripts ?? []).map(toPreview)
}

export async function fetchTrendingScripts(params?: ListParams): Promise<ScriptBloxPreview[]> {
  const q = buildParams(params)
  const data = await request<{ result: { scripts: Record<string, unknown>[] } }>(
    `/script/trending${q ? `?${q}` : ''}`
  )
  return (data.result?.scripts ?? []).map(toPreview)
}

export async function fetchScriptDetails(slug: string): Promise<ScriptBloxDetails | null> {
  const data = await request<{ script: ScriptBloxDetails; message?: string }>(
    `/script/${slug}`
  )
  if (data.message || !data.script) return null
  return data.script
}
