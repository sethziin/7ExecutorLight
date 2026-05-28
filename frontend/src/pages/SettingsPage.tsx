import { useState, useRef, useEffect } from 'react'
import {
  Monitor, Code2, Zap, Palette, Layout, Keyboard, Minus, Plus, Check, ChevronRight, ChevronDown,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useRuntimeStore } from '../store/useRuntimeStore'
import type { ApiType } from '../types'

const sections = [
  { id: 'general',    label: 'General',    icon: Monitor },
  { id: 'editor',     label: 'Editor',     icon: Code2 },
  { id: 'executor',   label: 'Executor',   icon: Zap },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'interface',  label: 'Interface',  icon: Layout },
  { id: 'shortcuts',  label: 'Shortcuts',  icon: Keyboard },
] as const

type SectionId = (typeof sections)[number]['id']

const API_OPTIONS: { value: ApiType; label: string; color: string }[] = [
  { value: 'xeno', label: 'Xeno', color: '#a78bfa' },
  { value: 'velocity', label: 'Velocity', color: '#22d3ee' },
]

function ApiSelector() {
  const currentApi = useRuntimeStore((s) => s.apiType)
  const switchApi = useRuntimeStore((s) => s.switchApi)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = API_OPTIONS.find((o) => o.value === currentApi)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-app-border bg-app-surface text-zinc-300 hover:text-zinc-200 transition-all min-w-[110px]"
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: current.color }} />
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown size={11} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-app-card border border-app-border rounded-md shadow-lg z-50 overflow-hidden">
          {API_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { switchApi(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                currentApi === opt.value
                  ? 'text-app-accent bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-app-hover'
              }`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
              <span className="flex-1 text-left">{opt.label}</span>
              {currentApi === opt.value && <Check size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-[18px] rounded-full border flex items-center shrink-0 transition-colors ${
        checked ? 'bg-rose-500 border-transparent' : 'bg-[#1e1e28] border-app-border'
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full bg-white absolute transition-all ${
          checked ? 'left-[18px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

function SectionGroup({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 px-1 mb-3">
        <Icon size={14} className="text-app-accent opacity-70" />
        <span className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">{title}</span>
      </div>
      <div className="bg-app-panel border border-app-border rounded-lg divide-y divide-app-border">
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 min-h-[48px]">
      <div className="min-w-0 pr-4">
        <div className="text-sm text-zinc-300 font-medium">{label}</div>
        {desc && <div className="text-xs text-zinc-600 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore()
  const [activeSection, setActiveSection] = useState<SectionId>('general')

  const THEMES = [
    { id: 'dark', label: 'Dark', color: '#111115' },
    { id: 'darker', label: 'Darker', color: '#0a0a0d' },
    { id: 'light', label: 'Light', color: '#ffffff' },
    { id: 'pink', label: 'Pink', color: '#fff5f8' },
  ]

  return (
    <div className="h-full flex overflow-hidden bg-app-bg">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-app-border flex flex-col">
        <div className="h-12 flex items-center px-5 border-b border-app-border shrink-0">
          <span className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">Settings</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {sections.map((s) => {
            const active = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                  active
                    ? 'bg-app-hover text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-400 hover:bg-[color-mix(in_srgb,var(--app-hover)_50%,transparent)]'
                }`}
              >
                <s.icon size={14} className={active ? 'text-rose-400' : ''} />
                <span className="flex-1 text-left">{s.label}</span>
                {active && <ChevronRight size={12} className="text-zinc-600" />}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeSection === 'general' && (
            <SectionGroup icon={Monitor} title="General">
              <Row label="Top Most" desc="Keep the window above all others">
                <Toggle checked={settings.topMost} onChange={(v) => updateSettings({ topMost: v })} />
              </Row>
            </SectionGroup>
          )}

          {activeSection === 'editor' && (
            <SectionGroup icon={Code2} title="Editor">
              <Row label="Font Size" desc="Monaco editor font size (px)">
                <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                className="w-8 h-8 rounded-md bg-app-surface border border-app-border flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-app-hover transition-all"
              >
                <Minus size={13} />
              </button>
              <span className="w-8 text-center font-mono font-semibold text-zinc-200 text-sm">
                {settings.fontSize}
              </span>
              <button
                onClick={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
                className="w-8 h-8 rounded-md bg-app-surface border border-app-border flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-app-hover transition-all"
              >
                <Plus size={13} />
              </button>
                </div>
              </Row>
              <Row label="Minimap" desc="Show code overview on the right">
                <Toggle checked={settings.minimap} onChange={(v) => updateSettings({ minimap: v })} />
              </Row>
              <Row label="Word Wrap" desc="Wrap long lines to fit the editor width">
                <Toggle checked={settings.wordWrap} onChange={(v) => updateSettings({ wordWrap: v })} />
              </Row>
              <Row label="Line Numbers" desc="Show line numbers in the gutter">
                <Toggle checked={settings.lineNumbers} onChange={(v) => updateSettings({ lineNumbers: v })} />
              </Row>
            </SectionGroup>
          )}

          {activeSection === 'executor' && (
            <SectionGroup icon={Zap} title="Executor">
              <Row label="API" desc="Execution backend">
                <ApiSelector />
              </Row>
              <Row label="Auto Attach" desc="Automatically attach to Roblox when detected">
                <Toggle checked={settings.autoAttach} onChange={(v) => updateSettings({ autoAttach: v })} />
              </Row>
            </SectionGroup>
          )}

          {activeSection === 'appearance' && (
            <SectionGroup icon={Palette} title="Appearance">
              <Row label="Color Theme" desc="Editor color scheme">
                <div className="flex items-center gap-1.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => updateSettings({ theme: t.id as 'dark' | 'darker' | 'light' | 'pink' })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                        settings.theme === t.id
                          ? 'border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] text-app-accent'
                          : 'border-app-border bg-app-surface text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full border border-app-border" style={{ background: t.color }} />
                      {t.label}
                      {settings.theme === t.id && <Check size={11} />}
                    </button>
                  ))}
                </div>
              </Row>
            </SectionGroup>
          )}

          {activeSection === 'interface' && (
            <>
              <SectionGroup icon={Layout} title="Panels">
                <Row label="Explorer Panel" desc="Show file explorer in the editor">
                  <Toggle checked={settings.explorerOpen} onChange={(v) => updateSettings({ explorerOpen: v })} />
                </Row>
                <Row label="Console Panel" desc="Show output console at the bottom">
                  <Toggle checked={settings.consoleOpen} onChange={(v) => updateSettings({ consoleOpen: v })} />
                </Row>
              </SectionGroup>
              <SectionGroup icon={Layout} title="Scale">
                <Row label="UI Scale" desc="Adjust the overall interface size">
                  <div className="flex items-center gap-1.5">
                    {[
                      { value: 0.92, label: 'Compact' },
                      { value: 1, label: 'Default' },
                      { value: 1.08, label: 'Comfortable' },
                      { value: 1.16, label: 'Large' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSettings({ uiScale: opt.value as 0.92 | 1 | 1.08 | 1.16 })}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          settings.uiScale === opt.value
                            ? 'border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] text-app-accent'
                            : 'border-app-border bg-app-surface text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {opt.label}
                        {settings.uiScale === opt.value && (
                          <Check size={10} className="ml-1 inline" />
                        )}
                      </button>
                    ))}
                  </div>
                </Row>
              </SectionGroup>
            </>
          )}

          {activeSection === 'shortcuts' && (
            <SectionGroup icon={Keyboard} title="Keyboard Shortcuts">
              <div className="px-5 py-3 space-y-2.5">
                {[
                  ['Ctrl+K', 'Command palette'],
                  ['Ctrl+S', 'Save current file'],
                  ['Ctrl+T', 'New tab'],
                  ['Ctrl+W', 'Close tab'],
                  ['Ctrl+`', 'Toggle console'],
                ].map(([key, desc]) => (
                  <div key={key as string} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{desc as string}</span>
                    <kbd className="text-xs font-mono px-2 py-1 rounded bg-app-surface border border-app-border text-zinc-400 leading-none">
                      {key as string}
                    </kbd>
                  </div>
                ))}
              </div>
            </SectionGroup>
          )}
        </div>
      </div>
    </div>
  )
}
