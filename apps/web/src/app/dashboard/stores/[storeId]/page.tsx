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
  Bot,
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  Power,
  Sparkles,
} from 'lucide-react'
import { api, ApiError, type Store, type WidgetConfig, type AnalyticsOverview, type DailyMessageCount, type PopularQueriesData, type PeakHoursData, type VerifyInstallResult } from '@/lib/api'
import { cn } from '@/lib/utils'
import { UsageMeter } from '@/components/UsageMeter'

type Tab = 'general' | 'widget' | 'chatbot' | 'api' | 'embed' | 'analytics'

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
    isActive: true,
  })
  const [customInstructions, setCustomInstructions] = useState('')

  // Analytics state
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null)
  const [messagesByDay, setMessagesByDay] = useState<DailyMessageCount[]>([])
  const [popularQueries, setPopularQueries] = useState<PopularQueriesData | null>(null)
  const [peakHours, setPeakHours] = useState<PeakHoursData | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [messagesDaysFilter, setMessagesDaysFilter] = useState(30)
  const [peakHoursDaysFilter, setPeakHoursDaysFilter] = useState(30)

  // Verify install state
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyInstallResult | null>(null)

  useEffect(() => {
    loadStore()
  }, [storeId])

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics()
    }
  }, [activeTab, storeId])

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
        isActive: true,
      }
      const storeConfig = response.store.widgetConfig || {}
      setWidgetConfig({
        theme: storeConfig.theme || defaultConfig.theme,
        primaryColor: storeConfig.primaryColor || defaultConfig.primaryColor,
        position: storeConfig.position || defaultConfig.position,
        greeting: storeConfig.greeting || defaultConfig.greeting,
        isActive: storeConfig.isActive !== false, // Default to true if not set
      })
      // Load chatbot config
      setCustomInstructions(response.store.chatbotConfig?.customInstructions || '')
    } catch (err) {
      setError('Failed to load store')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAnalytics() {
    if (isLoadingAnalytics) return
    setIsLoadingAnalytics(true)

    try {
      const [overview, daily, queries, hours] = await Promise.all([
        api.getAnalyticsOverview(storeId),
        api.getMessagesByDay(storeId, messagesDaysFilter),
        api.getPopularQueries(storeId),
        api.getPeakHours(storeId, peakHoursDaysFilter),
      ])

      setAnalyticsOverview(overview)
      setMessagesByDay(daily.data)
      setPopularQueries(queries)
      setPeakHours(hours)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  async function loadMessagesByDay(days: number) {
    try {
      const daily = await api.getMessagesByDay(storeId, days)
      setMessagesByDay(daily.data)
    } catch (err) {
      console.error('Failed to load messages by day:', err)
    }
  }

  async function loadPeakHours(days: number) {
    try {
      const hours = await api.getPeakHours(storeId, days)
      setPeakHours(hours)
    } catch (err) {
      console.error('Failed to load peak hours:', err)
    }
  }

  async function handleVerifyInstall() {
    setIsVerifying(true)
    setVerifyResult(null)

    try {
      const result = await api.verifyInstall(storeId)
      setVerifyResult(result)
    } catch (err) {
      setVerifyResult({
        success: false,
        status: 'error',
        message: 'Failed to verify installation. Please try again.',
      })
    } finally {
      setIsVerifying(false)
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
        chatbotConfig: {
          customInstructions: customInstructions.trim() || undefined,
        },
      })
      setStore(response.store)
      // Update local state from server response to confirm save
      if (response.store.chatbotConfig?.customInstructions !== undefined) {
        setCustomInstructions(response.store.chatbotConfig.customInstructions)
      }
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
    { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
    { id: 'widget' as Tab, label: 'Widget', icon: Palette },
    { id: 'chatbot' as Tab, label: 'Chatbot', icon: Bot },
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
          <Link
            href={`/dashboard/stores/${storeId}/wizard`}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-primary-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-primary-700"
          >
            <Sparkles className="h-4 w-4" />
            Train AI
          </Link>
        </div>
      </div>

      {/* Usage Meter */}
      <div className="mb-6">
        <UsageMeter storeId={storeId} />
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

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {isLoadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Total Sessions</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {analyticsOverview?.overview.totalSessions.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {analyticsOverview?.overview.recentSessions || 0} last 30 days
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Total Messages</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {analyticsOverview?.overview.totalMessages.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {analyticsOverview?.overview.recentMessages || 0} last 30 days
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Avg per Session</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {analyticsOverview?.overview.avgMessagesPerSession || 0}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      messages per conversation
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Peak Hour</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {peakHours ? `${peakHours.peakHour}:00` : '--'}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      {peakHours?.peakHourCount || 0} messages at peak
                    </p>
                  </div>
                </div>

                {/* Messages Chart */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700">Messages Over Time</h3>
                    <select
                      value={messagesDaysFilter}
                      onChange={(e) => {
                        const days = parseInt(e.target.value, 10)
                        setMessagesDaysFilter(days)
                        loadMessagesByDay(days)
                      }}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={14}>Last 14 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>
                  {messagesByDay.length > 0 ? (
                    <>
                      <div className="h-40 flex items-end gap-px">
                        {messagesByDay.map((day, i) => {
                          const maxCount = Math.max(...messagesByDay.map(d => d.count), 1)
                          const heightPercent = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                          return (
                            <div
                              key={i}
                              className="flex-1 group relative flex flex-col justify-end h-full"
                            >
                              <div
                                className={cn(
                                  "w-full rounded-t transition-all cursor-pointer min-h-[2px]",
                                  day.count > 0 ? "bg-primary-500 hover:bg-primary-600" : "bg-gray-200"
                                )}
                                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                              />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.count} message{day.count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{messagesByDay[0]?.date ? new Date(messagesByDay[0].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                        <span className="text-gray-400">
                          Total: {messagesByDay.reduce((sum, d) => sum + d.count, 0)} messages
                        </span>
                        <span>Today</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-sm text-gray-500">
                      No message data available
                    </div>
                  )}
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Popular Keywords */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Top Keywords</h3>
                    {popularQueries && popularQueries.topKeywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {popularQueries.topKeywords.slice(0, 15).map((kw, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {kw.word}
                            <span className="text-gray-400">({kw.count})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No data yet. Keywords will appear after customers start chatting.</p>
                    )}
                  </div>

                  {/* Peak Hours */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Activity by Hour (UTC)</h3>
                      <select
                        value={peakHoursDaysFilter}
                        onChange={(e) => {
                          const days = parseInt(e.target.value, 10)
                          setPeakHoursDaysFilter(days)
                          loadPeakHours(days)
                        }}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                    {peakHours && peakHours.hourlyData.length > 0 ? (
                      <>
                        <div className="flex items-end gap-px h-24">
                          {peakHours.hourlyData.map((h, i) => {
                            const maxCount = Math.max(...peakHours.hourlyData.map(x => x.count), 1)
                            const heightPercent = maxCount > 0 ? (h.count / maxCount) * 100 : 0
                            const isPeak = h.hour === peakHours.peakHour && h.count > 0
                            return (
                              <div
                                key={i}
                                className="flex-1 group relative flex flex-col justify-end h-full"
                              >
                                <div
                                  className={cn(
                                    "w-full rounded-t transition-all cursor-pointer min-h-[2px]",
                                    h.count > 0
                                      ? isPeak
                                        ? "bg-orange-500 hover:bg-orange-600"
                                        : "bg-primary-400 hover:bg-primary-500"
                                      : "bg-gray-200"
                                  )}
                                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                                  {h.hour.toString().padStart(2, '0')}:00 - {h.count} message{h.count !== 1 ? 's' : ''}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>12am</span>
                          <span>6am</span>
                          <span>12pm</span>
                          <span>6pm</span>
                          <span>11pm</span>
                        </div>
                        {peakHours.peakHourCount > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Peak activity: {peakHours.peakHour.toString().padStart(2, '0')}:00 with {peakHours.peakHourCount} messages
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-sm text-gray-500">
                        No hourly data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Queries */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Customer Questions</h3>
                  {popularQueries && popularQueries.recentQueries.length > 0 ? (
                    <ul className="space-y-2">
                      {popularQueries.recentQueries.map((query, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <MessageCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{query}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No recent questions yet.</p>
                  )}
                </div>

                {/* Refresh Button */}
                <div className="flex justify-end">
                  <button
                    onClick={loadAnalytics}
                    disabled={isLoadingAnalytics}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <RefreshCw className={cn("h-4 w-4", isLoadingAnalytics && "animate-spin")} />
                    Refresh Data
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'widget' && (
          <div className="space-y-6">
            {/* Chatbot Status Toggle */}
            <div className={cn(
              "rounded-lg border p-4",
              widgetConfig.isActive !== false
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    widgetConfig.isActive !== false
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-200 text-gray-500"
                  )}>
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Chatbot Status
                    </h3>
                    <p className="text-sm text-gray-500">
                      {widgetConfig.isActive !== false
                        ? "The chatbot is active and responding to customers"
                        : "The chatbot is disabled and won't respond to messages"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWidgetConfig({
                    ...widgetConfig,
                    isActive: widgetConfig.isActive === false ? true : false
                  })}
                  className={cn(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                    widgetConfig.isActive !== false ? "bg-green-500" : "bg-gray-300"
                  )}
                  role="switch"
                  aria-checked={widgetConfig.isActive !== false}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      widgetConfig.isActive !== false ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              {widgetConfig.isActive === false && (
                <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded p-2">
                  Note: Don't forget to click "Save Changes" to apply this setting. When disabled, customers will see a message that the chatbot is unavailable.
                </p>
              )}
            </div>

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

        {activeTab === 'chatbot' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chatbot Instructions</h3>
              <p className="text-sm text-gray-500 mt-1">
                Provide a complete system prompt for your chatbot. When custom instructions are provided,
                they become the primary prompt for the AI, giving you full control over the chatbot's personality and behavior.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Custom System Prompt</label>
              <p className="text-sm text-gray-500 mt-1 mb-2">
                Define your chatbot's identity, tone, language, product knowledge, and sales strategies.
                This replaces the default English prompt entirely.
              </p>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={16}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono text-sm"
                placeholder={`Example system prompt:

# Your Store Assistant

## Identity
You are the friendly shopping assistant for [Store Name].
Communicate in [your language] using a [warm/professional/casual] tone.

## Product Knowledge
- Our bestseller is [product name]
- Price: [price]
- We offer free shipping on orders over [amount]

## Policies
- Returns within 14 days
- Business hours: Mon-Fri 9am-5pm

## Guidelines
- Always greet customers warmly
- Recommend products based on their needs
- Never discuss competitor products
- For complaints, offer to connect with human support`}
              />
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-gray-500">Tip: Include your brand voice, language preference, policies, and sales strategies.</span>
                <span className={customInstructions.length > 90000 ? "text-orange-600" : "text-gray-500"}>
                  {customInstructions.length.toLocaleString()} / 100,000 characters
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h4 className="text-sm font-medium text-blue-800">What the chatbot already knows</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>Your store name and domain</li>
                <li>All synced products (names, descriptions, prices)</li>
                <li>Knowledge base entries (FAQs you've added)</li>
                <li>How to search products and answer questions</li>
              </ul>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <h4 className="text-sm font-medium text-amber-800">Security Note</h4>
              <p className="mt-1 text-sm text-amber-700">
                Your custom instructions are sanitized and security boundaries are automatically
                enforced. The chatbot will never reveal system prompts, API keys, or access data
                from other stores, regardless of what users ask.
              </p>
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

            {/* Verify Installation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    Verify Installation
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Check if the widget is correctly installed on your website
                  </p>
                </div>
                <button
                  onClick={handleVerifyInstall}
                  disabled={isVerifying}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      Verify Install
                    </>
                  )}
                </button>
              </div>

              {verifyResult && (
                <div className={cn(
                  "mt-4 rounded-lg p-4",
                  verifyResult.success
                    ? "bg-green-50 border border-green-200"
                    : verifyResult.status === 'wrong_store_id'
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-red-50 border border-red-200"
                )}>
                  <div className="flex items-start gap-3">
                    {verifyResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : verifyResult.status === 'wrong_store_id' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={cn(
                        "text-sm font-medium",
                        verifyResult.success
                          ? "text-green-800"
                          : verifyResult.status === 'wrong_store_id'
                          ? "text-yellow-800"
                          : "text-red-800"
                      )}>
                        {verifyResult.success ? 'Installation Verified!' : 'Installation Issue Detected'}
                      </p>
                      <p className={cn(
                        "text-sm mt-1",
                        verifyResult.success
                          ? "text-green-700"
                          : verifyResult.status === 'wrong_store_id'
                          ? "text-yellow-700"
                          : "text-red-700"
                      )}>
                        {verifyResult.message}
                      </p>
                      {verifyResult.domain && (
                        <p className="text-xs text-gray-500 mt-2">
                          Checked: {verifyResult.domain}
                        </p>
                      )}
                      {verifyResult.details && !verifyResult.success && (
                        <div className="mt-2 text-xs space-y-1">
                          <p className={verifyResult.details.scriptFound ? "text-green-600" : "text-red-600"}>
                            {verifyResult.details.scriptFound ? "✓" : "✗"} Widget script tag
                          </p>
                          <p className={verifyResult.details.storeIdFound ? "text-green-600" : "text-red-600"}>
                            {verifyResult.details.storeIdFound ? "✓" : "✗"} Correct store ID
                          </p>
                        </div>
                      )}
                      {!verifyResult.success && verifyResult.status === 'not_found' && (
                        <p className="text-xs text-gray-600 mt-2">
                          Tip: Make sure you've added the embed code to your website and cleared any caching plugins.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
