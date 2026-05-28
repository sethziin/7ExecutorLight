type IpcHandler = (data: Record<string, unknown>) => void

class IpcManager {
  private handlers = new Set<IpcHandler>()
  private registered = false

  register(): void {
    if (this.registered) return
    this.registered = true
    const webview = (window.chrome?.webview as any)
    if (!webview) {
      console.warn('[IPC] WebView2 not available')
      return
    }
    webview.addEventListener('message', (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
      console.log('[IPC] recv:', data.type, data)
      for (const handler of this.handlers) {
        try { handler(data) } catch { /* handler error */ }
      }
    })
    console.log('[IPC] listener registered')
  }

  send(type: string, payload?: Record<string, unknown>): void {
    console.log('[IPC] send:', type, payload)
    try {
      const msg = payload ? { type, ...payload } : { type }
      ;(window.chrome?.webview as any)?.postMessage(msg)
    } catch { /* silent */ }
  }

  subscribe(handler: IpcHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
}

export const ipc = new IpcManager()
