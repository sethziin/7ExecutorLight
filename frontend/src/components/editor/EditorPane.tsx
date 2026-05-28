import { useRef, useEffect, useCallback, memo } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { useAppStore } from '../../store/useAppStore'

function defineThemes(monaco: any) {
  monaco.editor.defineTheme('codeforge-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5a9e3a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'e0483a' },
      { token: 'string', foreground: 'c85a28' },
      { token: 'string.quoted', foreground: 'c85a28' },
      { token: 'number', foreground: 'c07030' },
      { token: 'identifier', foreground: '1c1a18' },
      { token: 'type', foreground: '2868e8' },
      { token: 'function', foreground: '2868e8' },
      { token: 'variable', foreground: '1c1a18' },
      { token: 'operator', foreground: 'e0483a' },
      { token: 'delimiter', foreground: 'b0aca6' },
      { token: 'tag', foreground: '2868e8' },
      { token: 'attribute.name', foreground: 'e0483a' },
      { token: 'attribute.value', foreground: 'c85a28' },
    ],
    colors: {
      'editor.background': '#f8f6f2',
      'editor.foreground': '#1c1a18',
      'editor.lineHighlightBackground': '#f0ece6',
      'editor.selectionBackground': '#e35a3020',
      'editor.inactiveSelectionBackground': '#e35a3010',
      'editorCursor.foreground': '#e0483a',
      'editorLineNumber.foreground': '#c8c4be',
      'editorLineNumber.activeForeground': '#e35a3080',
      'editorIndentGuide.background': '#e4e0da',
      'editorIndentGuide.activeBackground': '#e35a3020',
      'editorWhitespace.foreground': '#d8d4ce',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#c8c4be80',
      'scrollbarSlider.hoverBackground': '#b0aca680',
      'scrollbarSlider.activeBackground': '#e35a4030',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#d6d2ca',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#d6d2ca',
      'editorSuggestWidget.selectedBackground': '#e35a3012',
      'list.hoverBackground': '#e35a3008',
      'list.activeSelectionBackground': '#e35a3015',
      'input.background': '#faf8f5',
      'input.border': '#d6d2ca',
      'focusBorder': '#e35a3050',
    },
  })

  monaco.editor.defineTheme('codeforge-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f43f5e' },
      { token: 'string', foreground: 'a3e635' },
      { token: 'number', foreground: 'fb923c' },
      { token: 'type', foreground: '818cf8' },
      { token: 'function', foreground: '38bdf8' },
      { token: 'variable', foreground: 'e2e2f0' },
      { token: 'operator', foreground: 'f43f5e' },
    ],
    colors: {
      'editor.background': '#0e0e12',
      'editor.foreground': '#e2e2f0',
      'editor.lineHighlightBackground': '#14141c',
      'editor.selectionBackground': '#f43f5e28',
      'editorCursor.foreground': '#f43f5e',
      'editorLineNumber.foreground': '#3a3a52',
      'editorLineNumber.activeForeground': '#f43f5e80',
      'editorIndentGuide.background': '#1e1e28',
      'editorIndentGuide.activeBackground': '#f43f5e30',
      'scrollbarSlider.background': '#2a2a3880',
      'scrollbarSlider.hoverBackground': '#3a3a5080',
      'scrollbarSlider.activeBackground': '#f43f5e40',
      'editorWidget.background': '#111118',
      'editorWidget.border': '#1e1e2a',
      'editorSuggestWidget.background': '#111118',
      'editorSuggestWidget.border': '#1e1e2a',
      'editorSuggestWidget.selectedBackground': '#f43f5e18',
      'list.hoverBackground': '#f43f5e10',
      'list.activeSelectionBackground': '#f43f5e20',
      'input.background': '#0b0b0e',
      'input.border': '#1e1e2a',
      'focusBorder': '#f43f5e60',
    },
  })

  monaco.editor.defineTheme('codeforge-darker', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '3a3a5a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f43f5e' },
      { token: 'string', foreground: '9ad83e' },
      { token: 'number', foreground: 'fba03e' },
      { token: 'type', foreground: '7a84f0' },
      { token: 'function', foreground: '2aacf0' },
      { token: 'variable', foreground: 'd0d0e0' },
      { token: 'operator', foreground: 'f43f5e' },
    ],
    colors: {
      'editor.background': '#09090c',
      'editor.foreground': '#d0d0e0',
      'editor.lineHighlightBackground': '#0f0f16',
      'editor.selectionBackground': '#f43f5e28',
      'editorCursor.foreground': '#f43f5e',
      'editorLineNumber.foreground': '#2a2a42',
      'editorLineNumber.activeForeground': '#f43f5e80',
      'editorIndentGuide.background': '#14141e',
      'editorIndentGuide.activeBackground': '#f43f5e30',
      'scrollbarSlider.background': '#2a2a3880',
      'scrollbarSlider.hoverBackground': '#3a3a5080',
      'scrollbarSlider.activeBackground': '#f43f5e40',
      'editorWidget.background': '#0a0a0f',
      'editorWidget.border': '#14141e',
      'editorSuggestWidget.background': '#0a0a0f',
      'editorSuggestWidget.border': '#14141e',
      'editorSuggestWidget.selectedBackground': '#f43f5e18',
      'list.hoverBackground': '#f43f5e10',
      'list.activeSelectionBackground': '#f43f5e20',
      'input.background': '#050508',
      'input.border': '#14141e',
      'focusBorder': '#f43f5e60',
    },
  })

  monaco.editor.defineTheme('codeforge-pink', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'b880a3', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c73a5e' },
      { token: 'string', foreground: '8a7a50' },
      { token: 'number', foreground: 'c07060' },
      { token: 'type', foreground: '8a5a78' },
      { token: 'function', foreground: 'b84a6a' },
      { token: 'variable', foreground: '2d1b24' },
      { token: 'operator', foreground: 'c73a5e' },
    ],
    colors: {
      'editor.background': '#fdf0f4',
      'editor.foreground': '#2d1b24',
      'editor.lineHighlightBackground': '#f5e0e8',
      'editor.selectionBackground': '#e8436e20',
      'editorCursor.foreground': '#c73a5e',
      'editorLineNumber.foreground': '#d4a8c0',
      'editorLineNumber.activeForeground': '#c73a5e80',
      'editorIndentGuide.background': '#f5d6e0',
      'editorIndentGuide.activeBackground': '#e8436e30',
      'scrollbarSlider.background': '#d4a8c080',
      'scrollbarSlider.hoverBackground': '#b880a080',
      'scrollbarSlider.activeBackground': '#e8436e40',
      'editorWidget.background': '#fff5f8',
      'editorWidget.border': '#f5d6e0',
      'editorSuggestWidget.background': '#fff5f8',
      'editorSuggestWidget.border': '#f5d6e0',
      'editorSuggestWidget.selectedBackground': '#e8436e12',
      'list.hoverBackground': '#e8436e08',
      'list.activeSelectionBackground': '#e8436e15',
      'input.background': '#fdf0f4',
      'input.border': '#f5d6e0',
      'focusBorder': '#e8436e50',
    },
  })
}

const THEME_MAP: Record<string, string> = {
  light: 'codeforge-light',
  dark: 'codeforge-dark',
  darker: 'codeforge-darker',
  pink: 'codeforge-pink',
}

const EditorPane = memo(function EditorPane() {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const updateTabContent = useAppStore((s) => s.updateTabContent)
  const settings = useAppStore((s) => s.settings)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const scaledFontSize = Math.round(settings.fontSize * settings.uiScale)
  const currentTheme = THEME_MAP[settings.theme] || 'codeforge-light'

  const handleChange = useCallback(
    (val: string | undefined) => {
      if (val !== undefined && activeTabId) updateTabContent(activeTabId, val)
    },
    [activeTabId, updateTabContent]
  )

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize: scaledFontSize })
    }
  }, [scaledFontSize])

  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.updateOptions({
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      minimap: { enabled: settings.minimap },
      wordWrap: settings.wordWrap ? 'on' : 'off',
    })
  }, [settings.lineNumbers, settings.minimap, settings.wordWrap])

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(currentTheme)
    }
  }, [currentTheme])

  const handleBeforeMount = useCallback((monaco: any) => {
    defineThemes(monaco)
  }, [])

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    editor.updateOptions({
      fontSize: scaledFontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontLigatures: true,
      lineNumbers: settings.lineNumbers ? 'on' : 'off',
      minimap: { enabled: settings.minimap },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'line',
      padding: { top: 0 },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      wordWrap: settings.wordWrap ? 'on' : 'off',
      automaticLayout: true,
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
        useShadows: false,
      },
    })
  }, [scaledFontSize, settings.lineNumbers, settings.minimap, settings.wordWrap])

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg">
        <div className="text-center space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">No file open</div>
          <p className="text-sm text-zinc-600">Open a file or create a new tab</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Editor
        theme={currentTheme}
        language={activeTab.language}
        value={activeTab.content}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          fontSize: scaledFontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers ? 'on' : 'off',
          wordWrap: settings.wordWrap ? 'on' : 'off',
          automaticLayout: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 4 },
          scrollBeyondLastLine: false,
        }}
        loading={<div className="w-full h-full bg-app-bg" />}
      />
    </div>
  )
})

export default EditorPane
