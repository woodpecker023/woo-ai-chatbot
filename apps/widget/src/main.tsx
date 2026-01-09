import React from 'react'
import ReactDOM from 'react-dom/client'
import { Widget } from './Widget'
import { getStyles } from './styles'

// Widget configuration from script tag data attributes
interface WidgetConfig {
  storeId: string
  theme: 'light' | 'dark'
  position: 'left' | 'right'
  greeting: string
  apiUrl: string
}

function getConfig(): WidgetConfig | null {
  // Find our script tag
  const scripts = document.querySelectorAll('script[data-store-id]')
  const script = scripts[scripts.length - 1] as HTMLScriptElement | undefined

  if (!script) {
    console.error('[WooAI] Widget script not found or missing data-store-id')
    return null
  }

  const storeId = script.dataset.storeId
  if (!storeId) {
    console.error('[WooAI] Missing required data-store-id attribute')
    return null
  }

  // Get API URL from script src or use default
  const scriptSrc = script.src || ''
  const apiUrl = script.dataset.apiUrl || scriptSrc.replace('/widget.js', '') || 'https://api.wooai.app'

  return {
    storeId,
    theme: (script.dataset.theme as 'light' | 'dark') || 'light',
    position: (script.dataset.position as 'left' | 'right') || 'right',
    greeting: script.dataset.greeting || 'Hi! How can I help you today?',
    apiUrl,
  }
}

function mountWidget() {
  const config = getConfig()
  if (!config) return

  // Create container element
  const container = document.createElement('div')
  container.id = 'wooai-widget-container'
  document.body.appendChild(container)

  // Create Shadow DOM
  const shadow = container.attachShadow({ mode: 'open' })

  // Create style element with our CSS
  const styleEl = document.createElement('style')
  styleEl.textContent = getStyles(config.theme, config.position)
  shadow.appendChild(styleEl)

  // Create mount point for React
  const mountPoint = document.createElement('div')
  mountPoint.id = 'wooai-widget-root'
  shadow.appendChild(mountPoint)

  // Mount React app
  const root = ReactDOM.createRoot(mountPoint)
  root.render(
    <React.StrictMode>
      <Widget config={config} />
    </React.StrictMode>
  )
}

// Mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountWidget)
} else {
  mountWidget()
}
