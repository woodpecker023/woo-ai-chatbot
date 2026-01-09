'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Settings,
  Palette,
  Key,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Code,
  MessageSquare,
  Package,
} from 'lucide-react'
import { api, ApiError, type Store, type WidgetConfig } from '@/lib/api'
import { cn } from '@/lib/utils'

type Tab = 'general' | 'widget' | 'api' | 'embed'

export default function StoreSettingsPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
  const router = useRouter()
  const [store, setStore] = useState<Store | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [copied, setCopied] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [wooDomain, setWooDomain] = useState('')
  const [wooConsumerKey, setWooConsumerKey] = useState('')
  const [wooConsumerSecret, setWooConsumerSecret] = useState('')
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    theme: 'light',
    primaryColor: '#0ea5e9',
    position: 'right',
    greeting: 'Hi! How can I help you today?',
  })

  useEffect(() => {
    loadStore()
  }, [storeId])

  async function loadStore() {
    try {
      const response = await api.getStore(storeId)
      setStore(response.store)
      setName(response.store.name)
      setWooDomain(response.store.wooDomain)
      // Merge with defaults to handle empty/partial widgetConfig
      const defaultConfig: WidgetConfig = {
        theme: 'light',
        primaryColor: '#0ea5e9',
        position: 'right',
        greeting: 'Hi! How can I help you today?',
      }
      const storeConfig = response.store.widgetConfig || {}
      setWidgetConfig({
        theme: storeConfig.theme || defaultConfig.theme,
        primaryColor: storeConfig.primaryColor || defaultConfig.primaryColor,
        position: storeConfig.position || defaultConfig.position,
        greeting: storeConfig.greeting || defaultConfig.greeting,
      })
    } catch (err) {
      setError('Failed to load store')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      const response = await api.updateStore(storeId, {
        name,
        wooDomain,
        wooConsumerKey: wooConsumerKey || undefined,
        wooConsumerSecret: wooConsumerSecret || undefined,
        widgetConfig,
      })
      setStore(response.store)
      setSuccess('Settings saved successfully')
      setWooConsumerKey('')
      setWooConsumerSecret('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to save settings')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSyncProducts() {
    setError('')
    setSuccess('')
    setIsSyncing(true)

    try {
      const response = await api.syncProducts(storeId)
      setSuccess(`Synced ${response.synced} products successfully`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to sync products')
      }
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleRotateKey() {
    if (!confirm('Are you sure you want to rotate your API key? Your current embed code will stop working.')) {
      return
    }

    setError('')
    setIsRotating(true)

    try {
      const response = await api.rotateApiKey(storeId)
      setStore((prev) => prev ? { ...prev, apiKey: response.apiKey } : null)
      setSuccess('API key rotated successfully')
    } catch (err) {
      setError('Failed to rotate API key')
    } finally {
      setIsRotating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      await api.deleteStore(storeId)
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to delete store')
      setIsDeleting(false)
    }
  }

  function copyEmbedCode() {
    const embedCode = getEmbedCode()
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getWidgetBaseUrl() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.wooai.app'
    return apiUrl.replace(/\/$/, '')
  }

  function getEmbedCode() {
    const baseUrl = getWidgetBaseUrl()
    return `<script
  src="${baseUrl}/widget.js"
  data-store-id="${storeId}"
  data-theme="${widgetConfig.theme}"
  data-position="${widgetConfig.position}"
  data-greeting="${widgetConfig.greeting}"
></script>`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Store not found</p>
        <Link href="/dashboard" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'general' as Tab, label: 'General', icon: Settings },
    { id: 'widget' as Tab, label: 'Widget', icon: Palette },
    { id: 'api' as Tab, label: 'API Key', icon: Key },
    { id: 'embed' as Tab, label: 'Embed', icon: Code },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to stores
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          <p className="text-gray-600">{store.wooDomain}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/stores/${storeId}/products`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Package className="h-4 w-4" />
            Products
          </Link>
          <Link
            href={`/dashboard/stores/${storeId}/faqs`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4" />
            Knowledge Base
          </Link>
        </div>
      </div>

      {(error || success) && (
        <div className={cn(
          'mb-6 rounded-lg p-4',
          error ? 'bg-red-50' : 'bg-green-50'
        )}>
          <p className={cn('text-sm', error ? 'text-red-700' : 'text-green-700')}>
            {error || success}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 text-sm font-medium border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Store domain</label>
              <input
                type="text"
                value={wooDomain}
                onChange={(e) => setWooDomain(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900">WooCommerce API Credentials</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update your WooCommerce REST API credentials for product sync
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Consumer Key</label>
                  <input
                    type="text"
                    value={wooConsumerKey}
                    onChange={(e) => setWooConsumerKey(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Consumer Secret</label>
                  <input
                    type="password"
                    value={wooConsumerSecret}
                    onChange={(e) => setWooConsumerSecret(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSyncProducts}
                disabled={isSyncing}
                className="mt-4 flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing...' : 'Sync Products Now'}
              </button>
            </div>

            <div className="flex justify-between pt-6 border-t border-gray-200">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Store'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'widget' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Theme</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="theme"
                    checked={widgetConfig.theme === 'light'}
                    onChange={() => setWidgetConfig({ ...widgetConfig, theme: 'light' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Light</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="theme"
                    checked={widgetConfig.theme === 'dark'}
                    onChange={() => setWidgetConfig({ ...widgetConfig, theme: 'dark' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Dark</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Primary Color</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, primaryColor: e.target.value })}
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Position</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="position"
                    checked={widgetConfig.position === 'right'}
                    onChange={() => setWidgetConfig({ ...widgetConfig, position: 'right' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Right</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="position"
                    checked={widgetConfig.position === 'left'}
                    onChange={() => setWidgetConfig({ ...widgetConfig, position: 'left' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Left</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Greeting Message</label>
              <input
                type="text"
                value={widgetConfig.greeting}
                onChange={(e) => setWidgetConfig({ ...widgetConfig, greeting: e.target.value })}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <p className="text-sm text-gray-500 mt-1">
                This key is used to authenticate widget requests
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-mono text-sm break-all">
                  {store.apiKey}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(store.apiKey)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="rounded-lg border border-gray-300 p-3 hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 p-4">
              <h4 className="text-sm font-medium text-yellow-800">Security Warning</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Rotating your API key will invalidate your current embed code. Make sure to update your website after rotating.
              </p>
            </div>

            <button
              onClick={handleRotateKey}
              disabled={isRotating}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isRotating && 'animate-spin')} />
              {isRotating ? 'Rotating...' : 'Rotate API Key'}
            </button>
          </div>
        )}

        {activeTab === 'embed' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Embed Code</label>
              <p className="text-sm text-gray-500 mt-1">
                Copy this code and paste it just before the closing &lt;/body&gt; tag on your website
              </p>
              <div className="mt-4 relative">
                <pre className="rounded-lg bg-gray-900 p-4 text-sm text-gray-100 overflow-x-auto">
                  <code>{getEmbedCode()}</code>
                </pre>
                <button
                  onClick={copyEmbedCode}
                  className="absolute top-2 right-2 flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-white hover:bg-gray-600"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Implementation Guide */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Implementation Guide</h3>

              {/* Step 1: WooCommerce API Setup */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">1</span>
                  Set Up WooCommerce API Credentials
                </h4>
                <div className="mt-3 ml-8 space-y-2 text-sm text-gray-600">
                  <p>To sync your products with the chatbot, you need to create WooCommerce REST API keys:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Log in to your WordPress admin dashboard</li>
                    <li>Go to <strong>WooCommerce &rarr; Settings &rarr; Advanced &rarr; REST API</strong></li>
                    <li>Click <strong>Add key</strong></li>
                    <li>Enter a description (e.g., "AI Chatbot")</li>
                    <li>Set Permissions to <strong>Read</strong></li>
                    <li>Click <strong>Generate API key</strong></li>
                    <li>Copy the <strong>Consumer Key</strong> and <strong>Consumer Secret</strong></li>
                    <li>Go to the <strong>General</strong> tab in this dashboard and paste the credentials</li>
                  </ol>
                </div>
              </div>

              {/* Step 2: Sync Products */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">2</span>
                  Sync Your Products
                </h4>
                <div className="mt-3 ml-8 space-y-2 text-sm text-gray-600">
                  <p>After adding your WooCommerce credentials:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Go to the <strong>General</strong> tab</li>
                    <li>Click <strong>Sync Products Now</strong></li>
                    <li>Wait for the sync to complete</li>
                    <li>Re-sync whenever you add or update products</li>
                  </ol>
                  <p className="text-gray-500 mt-2">The chatbot will use your product information to answer customer questions about availability, pricing, and features.</p>
                </div>
              </div>

              {/* Step 3: Add FAQs */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">3</span>
                  Add Your Knowledge Base (FAQs)
                </h4>
                <div className="mt-3 ml-8 space-y-2 text-sm text-gray-600">
                  <p>Help the chatbot answer common questions:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Click <strong>Knowledge Base</strong> at the top of this page</li>
                    <li>Add frequently asked questions and answers</li>
                    <li>Include shipping policies, return policies, business hours, etc.</li>
                  </ol>
                  <p className="text-gray-500 mt-2">The more information you provide, the better the chatbot can assist your customers.</p>
                </div>
              </div>

              {/* Step 4: Install Widget */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">4</span>
                  Install the Widget on Your Website
                </h4>
                <div className="mt-3 ml-8 space-y-4 text-sm text-gray-600">
                  <p>Choose one of these methods to add the widget to your WordPress/WooCommerce site:</p>

                  {/* Method A */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h5 className="font-medium text-gray-800 mb-2">Method A: Using a Plugin (Recommended)</h5>
                    <ol className="list-decimal ml-4 space-y-1 text-gray-600">
                      <li>Install and activate the <strong>Insert Headers and Footers</strong> plugin (by WPCode)</li>
                      <li>Go to <strong>Code Snippets &rarr; Header & Footer</strong></li>
                      <li>Paste the embed code in the <strong>Footer</strong> section</li>
                      <li>Click <strong>Save Changes</strong></li>
                    </ol>
                  </div>

                  {/* Method B */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h5 className="font-medium text-gray-800 mb-2">Method B: Theme Editor</h5>
                    <ol className="list-decimal ml-4 space-y-1 text-gray-600">
                      <li>Go to <strong>Appearance &rarr; Theme File Editor</strong></li>
                      <li>Select your active theme</li>
                      <li>Open <strong>footer.php</strong></li>
                      <li>Paste the embed code just before <code className="bg-gray-200 px-1 rounded">&lt;/body&gt;</code></li>
                      <li>Click <strong>Update File</strong></li>
                    </ol>
                    <p className="text-yellow-700 text-xs mt-2">Note: Theme updates may overwrite your changes. Consider using a child theme.</p>
                  </div>

                  {/* Method C */}
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h5 className="font-medium text-gray-800 mb-2">Method C: Child Theme (Advanced)</h5>
                    <ol className="list-decimal ml-4 space-y-1 text-gray-600">
                      <li>Create a child theme if you don't have one</li>
                      <li>Add this to your child theme's <strong>functions.php</strong>:</li>
                    </ol>
                    <pre className="bg-gray-800 text-gray-100 p-3 rounded mt-2 text-xs overflow-x-auto">
{`add_action('wp_footer', function() {
  echo '<script src="${getWidgetBaseUrl()}/widget.js"
    data-store-id="${storeId}"
    data-theme="${widgetConfig.theme}"
    data-position="${widgetConfig.position}"
    data-greeting="${widgetConfig.greeting}"></script>';
});`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 5: Customize */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">5</span>
                  Customize Your Widget
                </h4>
                <div className="mt-3 ml-8 space-y-2 text-sm text-gray-600">
                  <p>Personalize the chatbot appearance:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Go to the <strong>Widget</strong> tab</li>
                    <li>Choose light or dark theme</li>
                    <li>Pick a primary color that matches your brand</li>
                    <li>Set the position (left or right corner)</li>
                    <li>Customize the greeting message</li>
                    <li>Click <strong>Save Changes</strong></li>
                  </ol>
                  <p className="text-gray-500 mt-2">After saving, refresh your website to see the updated widget.</p>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                <h4 className="text-sm font-medium text-yellow-800">Troubleshooting</h4>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  <li><strong>Widget not appearing?</strong> Clear your browser cache and WordPress cache plugins.</li>
                  <li><strong>Product sync failed?</strong> Verify your WooCommerce API credentials have Read permissions.</li>
                  <li><strong>HTTPS errors?</strong> Make sure your WordPress site uses HTTPS.</li>
                  <li><strong>Need help?</strong> Contact support with your store ID: <code className="bg-yellow-100 px-1 rounded text-xs">{storeId}</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
