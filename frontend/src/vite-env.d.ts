/// <reference types="vite/client" />

interface WebView2Webview {
  postMessage(message: unknown): void
}

interface WebView2 {
  webview: WebView2Webview
}

interface Window {
  chrome?: {
    webview?: WebView2Webview
  }
}
