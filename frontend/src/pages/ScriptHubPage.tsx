import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Star, Download, Cloud, TrendingUp, Flame, X, RefreshCw, Loader2, Eye, Check, ImageOff,
  User, Tag, FileCode2, Code2, ExternalLink, ShieldCheck, AlertTriangle, ChevronLeft, Calendar,
  ThumbsUp, ThumbsDown, BookMarked,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { fetchTrendingScripts, searchScripts, fetchScriptDetails } from '../services/scriptblox'
import type { ScriptBloxPreview, ScriptBloxDetails } from '../types'

function SkeletonCard() {
  return (
    <div className="bg-app-card border border-app-border rounded-lg overflow-hidden animate-pulse">
      <div className="h-24 bg-app-border" />
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-24 rounded bg-app-border" />
          <div className="h-2.5 w-10 rounded-full bg-app-border" />
        </div>
        <div className="h-2.5 w-3/4 rounded bg-app-border" />
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-14 rounded bg-app-border" />
          <div className="h-6 w-14 rounded-lg bg-app-border" />
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="h-44 bg-app-border shrink-0" />
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        <div className="h-5 w-3/4 rounded bg-app-border" />
        <div className="h-3.5 w-1/2 rounded bg-app-border" />
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-14 rounded-full bg-app-border" />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded bg-app-border" />
          <div className="h-2.5 w-5/6 rounded bg-app-border" />
        </div>
      </div>
    </div>
  )
}

function getThumbnail(script: ScriptBloxPreview): string {
  return script.image || script.game?.imageUrl || ''
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'm'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return n.toLocaleString()
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function ScriptHubPage() {
  const { openFile, addToast } = useAppStore()
  const [query, setQuery] = useState('')
  const [scripts, setScripts] = useState<ScriptBloxPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set())

  const [detailSlug, setDetailSlug] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<ScriptBloxDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadTrending()
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setError(null)
      loadTrending()
      return
    }
    const timer = setTimeout(() => doSearch(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  async function loadTrending() {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    setScripts([])
    try {
      const result = await fetchTrendingScripts({ max: 20 })
      if (mountedRef.current) setScripts(result)
    } catch {
      if (mountedRef.current) setError('Failed to load trending scripts')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function doSearch(q: string) {
    if (!mountedRef.current) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    setScripts([])
    try {
      const result = await searchScripts(q, { max: 20, sortBy: 'views', order: 'desc' })
      if (mountedRef.current && !ctrl.signal.aborted) setScripts(result)
    } catch {
      if (mountedRef.current && !ctrl.signal.aborted) setError('Search failed')
    } finally {
      if (mountedRef.current && !ctrl.signal.aborted) setLoading(false)
    }
  }

  const openDetail = useCallback(async (slug: string) => {
    setDetailSlug(slug)
    setDetailData(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const data = await fetchScriptDetails(slug)
      if (data) {
        setDetailData(data)
      } else {
        setDetailError('Script not found')
      }
    } catch {
      setDetailError('Failed to load script details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setDetailSlug(null)
    setDetailData(null)
    setDetailError(null)
  }, [])

  const install = useCallback(async (script: ScriptBloxPreview, e: React.MouseEvent) => {
    e.stopPropagation()
    if (installing || installed.has(script._id)) return
    setInstalling(script._id)
    try {
      const details = await fetchScriptDetails(script.slug)
      if (!details || !details.script) {
        addToast('Could not load script content', 'error')
        return
      }
      const fileName = script.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.lua'
      openFile(fileName, details.script)
      setInstalled((prev) => new Set([...prev, script._id]))
      addToast(`Opened "${script.title}"`, 'success')
    } catch {
      addToast('Failed to fetch script content', 'error')
    } finally {
      setInstalling(null)
    }
  }, [installing, installed, openFile, addToast])

  const installFromDetail = useCallback(async () => {
    if (!detailData || installing) return
    setInstalling(detailData._id)
    try {
      const fileName = detailData.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.lua'
      openFile(fileName, detailData.script)
      setInstalled((prev) => new Set([...prev, detailData._id]))
      addToast(`Opened "${detailData.title}"`, 'success')
      closeDetail()
    } catch {
      addToast('Failed to open script', 'error')
    } finally {
      setInstalling(null)
    }
  }, [detailData, installing, openFile, addToast, closeDetail])

  const clearSearch = useCallback(() => {
    setQuery('')
    setError(null)
    setImgErrors(new Set())
    loadTrending()
  }, [])

  const markImgError = useCallback((id: string) => {
    setImgErrors((prev) => new Set([...prev, id]))
  }, [])

  return (
    <div className="h-full flex overflow-hidden bg-app-bg relative">
      {/* Script list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-11 flex items-center gap-3 px-4 border-b border-app-border shrink-0 bg-app-surface">
          <div className="flex-1 flex items-center gap-2 bg-app-card border border-app-border rounded-md px-2.5 py-1.5 focus-within:border-[color-mix(in_srgb,var(--app-accent)_40%,transparent)] transition-colors max-w-md">
            <Search size={12} className="text-zinc-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scripts..."
              className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none"
            />
            {query && (
              <button onClick={clearSearch} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X size={11} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-app-card border border-app-border rounded-md p-0.5">
            {([['trending', 'Trending', Flame], ['search', 'Top', TrendingUp]] as const).map(([id, label, Icon]) => {
              const active = !query && id === 'trending' || query && id === 'search'
              return (
                <span
                  key={id}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium leading-none ${
                    active
                      ? 'bg-app-hover text-zinc-200'
                      : 'text-zinc-600'
                  }`}
                >
                  <Icon size={10} />
                  {label}
                </span>
              )
            })}
          </div>

          <a
            href="https://scriptblox.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-500 hover:text-zinc-500 transition-colors shrink-0"
          >
            Powered by ScriptBlox
          </a>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <Cloud size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm text-zinc-500 mb-3">{error}</p>
              <button
                onClick={() => query.trim() ? doSearch(query) : loadTrending()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-app-card border border-app-border text-xs text-zinc-400 hover:text-zinc-200 hover:border-app-hover transition-all"
              >
                <RefreshCw size={11} />
                Retry
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}

          {/* Script grid */}
          {!loading && !error && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] text-zinc-600 font-medium">
                  {query ? `${scripts.length} result${scripts.length !== 1 ? 's' : ''}` : (scripts.length > 0 ? 'Trending' : '')}
                </span>
              </div>
              {scripts.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {scripts.map((script) => {
                    const isInstalling = installing === script._id
                    const isInstalled = installed.has(script._id)
                    const thumb = getThumbnail(script)
                    const imgFailed = imgErrors.has(script._id)

                    return (
                      <div
                        key={script._id}
                        onClick={() => openDetail(script.slug)}
                        className="group bg-app-card border border-app-border rounded-lg hover:border-app-hover transition-all flex flex-col cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-24 bg-app-surface overflow-hidden rounded-t-lg">
                          {thumb && !imgFailed ? (
                            <img
                              src={thumb}
                              alt={script.title}
                              loading="lazy"
                              onError={() => markImgError(script._id)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-app-surface to-app-border">
                              <ImageOff size={18} className="text-zinc-500" />
                            </div>
                          )}
                          {script.isUniversal && (
                            <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-[1px] rounded-full bg-black/70 text-zinc-300 border border-white/10 leading-tight">
                              Universal
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <h3 className="text-xs font-semibold text-zinc-200 truncate flex-1 leading-tight">
                              {script.title}
                            </h3>
                            {script.verified && (
                              <span className="shrink-0 flex items-center gap-0.5 text-[9px] px-1.5 py-[1px] rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 leading-tight">
                                <Check size={7} />
                                Verified
                              </span>
                            )}
                          </div>
                          {script.game?.name && (
                            <p className="text-[11px] text-zinc-600 truncate leading-tight">{script.game.name}</p>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-0.5">
                            <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                              <span className="flex items-center gap-1">
                                <Eye size={9} />
                                {formatNumber(script.views)}
                              </span>
                              {script.likeCount !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Star size={9} className="text-app-accent opacity-70" />
                                  {formatNumber(script.likeCount)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => install(script, e)}
                              disabled={isInstalling || isInstalled}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                isInstalled
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-app-accent hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {isInstalling ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : isInstalled ? (
                                <><TrendingUp size={10} /> Opened</>
                              ) : (
                                <><Download size={10} /> Open</>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-zinc-500">
                  <Cloud size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No scripts found</p>
                  <p className="text-xs mt-1 text-zinc-600">
                    {query ? 'Try a different search term' : 'No trending scripts available right now'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel - overlay (does not push content) */}
      <AnimatePresence>
        {detailSlug && (
          <motion.div
            key={detailSlug}
            initial={{ x: 480, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 480, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
            className="absolute top-11 right-0 bottom-0 z-10 w-[480px] border-l border-app-border bg-app-card overflow-hidden flex flex-col shadow-2xl"
          >
              {/* Header */}
              <div className="h-11 flex items-center gap-2 px-3 border-b border-app-border shrink-0">
                <button
                  onClick={closeDetail}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-app-hover transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-zinc-500">Details</span>
              </div>

              {detailLoading ? (
                <DetailSkeleton />
              ) : detailError ? (
                <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
                  <AlertTriangle size={24} className="text-zinc-500 mb-3" />
                  <p className="text-sm text-zinc-500 mb-3">{detailError}</p>
                  <button
                    onClick={() => detailSlug && openDetail(detailSlug)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-app-hover border border-app-border text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    <RefreshCw size={11} />
                    Retry
                  </button>
                </div>
              ) : detailData ? (
                <>
                  {/* Hero image */}
                  <div className="relative h-44 shrink-0 bg-app-surface overflow-hidden">
                    {(detailData.image || detailData.game?.imageUrl) ? (
                      <img
                        src={detailData.image || detailData.game?.imageUrl}
                        alt={detailData.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-app-surface to-app-border">
                        <Cloud size={28} className="text-zinc-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-app-card via-[color-mix(in_srgb,var(--app-card)_40%,transparent)] to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h2 className="text-base font-bold text-zinc-100 drop-shadow-lg">{detailData.title}</h2>
                      {detailData.game?.name && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 drop-shadow">{detailData.game.name}</p>
                      )}
                    </div>
                    <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1 justify-end">
                      {detailData.verified && (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20 leading-tight">
                          <ShieldCheck size={8} />
                          Verified
                        </span>
                      )}
                      {detailData.isUniversal && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-app-hover text-zinc-300 border border-white/10 leading-tight">
                          Universal
                        </span>
                      )}
                      {detailData.isPatched && (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 leading-tight">
                          <AlertTriangle size={8} />
                          Patched
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Eye size={10} />
                        {formatNumber(detailData.views)} views
                      </span>
                      {detailData.likeCount !== undefined && (
                        <span className="flex items-center gap-1.5">
                          <ThumbsUp size={10} className="text-app-accent opacity-70" />
                          {formatNumber(detailData.likeCount)}
                        </span>
                      )}
                      {detailData.dislikeCount !== undefined && (
                        <span className="flex items-center gap-1.5">
                          <ThumbsDown size={10} className="text-zinc-600" />
                          {formatNumber(detailData.dislikeCount)}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar size={10} />
                        {formatDate(detailData.createdAt)}
                      </span>
                    </div>

                    {/* Owner */}
                    {detailData.owner && (
                      <div className="flex items-center gap-2.5 p-2.5 bg-app-bg border border-app-border rounded-lg">
                        {detailData.owner.profilePicture ? (
                          <img
                            src={detailData.owner.profilePicture}
                            alt={detailData.owner.username}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-app-border flex items-center justify-center">
                            <User size={10} className="text-zinc-600" />
                          </div>
                        )}
                        <span className="text-xs text-zinc-400">{detailData.owner.username}</span>
                        {detailData.owner.verified && (
                          <Check size={8} className="text-sky-400" />
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {detailData.tags && detailData.tags.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <Tag size={9} />
                          Tags
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {detailData.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-app-hover text-zinc-400 border border-app-border leading-tight"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features */}
                    {detailData.features && (
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <Code2 size={9} />
                          Features
                        </span>
                        <div className="bg-app-bg border border-app-border rounded-lg p-2.5">
                          <p className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed">
                            {detailData.features}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Script type */}
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1 block">Type</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-app-hover text-zinc-400 border border-app-border capitalize">
                        {detailData.scriptType}
                      </span>
                    </div>

                    {/* Key link */}
                    {detailData.keyLink && (
                      <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <p className="text-[11px] text-app-accent opacity-80 flex items-start gap-1.5">
                          <BookMarked size={11} className="shrink-0 mt-0.5" />
                          This script requires a key.{' '}
                          <a
                            href={detailData.keyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-amber-300 transition-colors inline-flex items-center gap-0.5"
                          >
                            Get it here
                            <ExternalLink size={8} />
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="shrink-0 border-t border-app-border p-3 flex items-center gap-2">
                    <button
                      onClick={installFromDetail}
                      disabled={installing === detailData._id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-app-accent hover:opacity-90 text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {installing === detailData._id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileCode2 size={12} />
                      )}
                      Open in Editor
                    </button>
                    {detailData.script && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(detailData.script)
                          addToast('Script copied to clipboard', 'success')
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-app-hover border border-app-border text-zinc-400 hover:text-zinc-200 text-xs transition-all"
                        title="Copy script content"
                      >
                        <Code2 size={12} />
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
