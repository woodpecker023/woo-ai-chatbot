const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers: HeadersInit = {
    ...options.headers,
  }

  // Only set Content-Type for requests with a body
  if (options.body) {
    ;(headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(error.error || 'Request failed', response.status, error.details)
  }

  return response.json()
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name: string }) =>
    request<{ user: { id: string; email: string; name: string }; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: { id: string; email: string; name: string }; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  googleAuth: (credential: string) =>
    request<{ user: { id: string; email: string; name: string }; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  getProfile: () =>
    request<{ user: UserProfile }>('/auth/me'),

  updateProfile: (data: { name: string }) =>
    request<{ user: { id: string; email: string; name: string } }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAccount: () =>
    request<{ success: boolean }>('/auth/account', {
      method: 'DELETE',
    }),

  // Stores
  getStores: () =>
    request<{ stores: Store[] }>('/stores'),

  createStore: (data: CreateStoreData) =>
    request<{ store: Store }>('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStore: (storeId: string) =>
    request<{ store: Store }>(`/stores/${storeId}`),

  updateStore: (storeId: string, data: Partial<UpdateStoreData>) =>
    request<{ store: Store }>(`/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteStore: (storeId: string) =>
    request<{ success: boolean }>(`/stores/${storeId}`, {
      method: 'DELETE',
    }),

  rotateApiKey: (storeId: string) =>
    request<{ apiKey: string }>(`/stores/${storeId}/rotate-key`, {
      method: 'POST',
    }),

  syncProducts: (storeId: string) =>
    request<{ synced: number }>(`/stores/${storeId}/sync-products`, {
      method: 'POST',
    }),

  // Products
  getProducts: (storeId: string, params?: { page?: number; limit?: number; search?: string }) =>
    request<{ products: Product[]; pagination: Pagination }>(
      `/stores/${storeId}/products?${new URLSearchParams({
        ...(params?.page && { page: params.page.toString() }),
        ...(params?.limit && { limit: params.limit.toString() }),
        ...(params?.search && { search: params.search }),
      }).toString()}`
    ),

  getProduct: (storeId: string, productId: string) =>
    request<{ product: Product }>(`/stores/${storeId}/products/${productId}`),

  deleteProduct: (storeId: string, productId: string) =>
    request<{ success: boolean }>(`/stores/${storeId}/products/${productId}`, {
      method: 'DELETE',
    }),

  // FAQs
  getFaqs: (storeId: string) =>
    request<{ faqs: FAQ[] }>(`/stores/${storeId}/faqs`),

  createFaq: (storeId: string, data: { question: string; answer: string }) =>
    request<{ faq: FAQ }>(`/stores/${storeId}/faqs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFaq: (storeId: string, faqId: string, data: { question: string; answer: string }) =>
    request<{ faq: FAQ }>(`/stores/${storeId}/faqs/${faqId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteFaq: (storeId: string, faqId: string) =>
    request<{ success: boolean }>(`/stores/${storeId}/faqs/${faqId}`, {
      method: 'DELETE',
    }),

  // Documents
  getDocuments: (storeId: string) =>
    request<{ documents: Document[] }>(`/stores/${storeId}/documents`),

  uploadDocument: async (storeId: string, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/stores/${storeId}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new ApiError(error.error || 'Upload failed', response.status, error.details)
    }

    return response.json() as Promise<{ document: Document; message: string }>
  },

  getDocument: (storeId: string, documentId: string) =>
    request<{ document: Document & { chunkCount: number } }>(`/stores/${storeId}/documents/${documentId}`),

  deleteDocument: (storeId: string, documentId: string) =>
    request<{ success: boolean }>(`/stores/${storeId}/documents/${documentId}`, {
      method: 'DELETE',
    }),

  // Usage
  getUsage: (storeId: string) =>
    request<StoreUsage>(`/stores/${storeId}/usage`),

  getUsageHistory: (storeId: string) =>
    request<{ history: UsageHistory[] }>(`/stores/${storeId}/usage/history`),

  // Billing
  createCheckoutSession: (storeId: string) =>
    request<{ url: string }>(`/stores/${storeId}/checkout`, {
      method: 'POST',
    }),

  getCustomerPortalUrl: (storeId: string) =>
    request<{ url: string }>(`/stores/${storeId}/billing-portal`, {
      method: 'POST',
    }),

  // Analytics
  getAnalyticsOverview: (storeId: string) =>
    request<AnalyticsOverview>(`/stores/${storeId}/analytics`),

  getMessagesByDay: (storeId: string, days: number = 30) =>
    request<{ data: DailyMessageCount[]; days: number }>(`/stores/${storeId}/analytics/messages-by-day?days=${days}`),

  getPopularQueries: (storeId: string) =>
    request<PopularQueriesData>(`/stores/${storeId}/analytics/popular-queries`),

  getPeakHours: (storeId: string, days: number = 30) =>
    request<PeakHoursData>(`/stores/${storeId}/analytics/peak-hours?days=${days}`),

  // Installation Verification
  verifyInstall: (storeId: string) =>
    request<VerifyInstallResult>(`/stores/${storeId}/verify-install`, {
      method: 'POST',
    }),

  // Wizard - Training
  crawlUrl: (url: string) =>
    request<CrawlResult>('/wizard/crawl-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  crawlWebsite: (url: string, maxPages: number = 5) =>
    request<CrawlWebsiteResult>('/wizard/crawl-website', {
      method: 'POST',
      body: JSON.stringify({ url, maxPages }),
    }),

  generateFaqs: (content: string, websiteTitle: string, language: string = 'English', maxFaqs: number = 10) =>
    request<GenerateFaqsResult>('/wizard/generate-faqs', {
      method: 'POST',
      body: JSON.stringify({ content, websiteTitle, language, maxFaqs }),
    }),

  autoGenerateFaqs: (url: string, maxPages: number = 5, language: string = 'English', maxFaqs: number = 10) =>
    request<AutoGenerateFaqsResult>('/wizard/auto-generate-faqs', {
      method: 'POST',
      body: JSON.stringify({ url, maxPages, language, maxFaqs }),
    }),
}

// Types
export interface Store {
  id: string
  name: string
  wooDomain: string
  apiKey: string
  widgetConfig: WidgetConfig
  chatbotConfig?: ChatbotConfig
  botPersona?: BotPersona
  createdAt: string
  updatedAt: string
}

export interface WidgetConfig {
  theme: 'light' | 'dark'
  primaryColor: string
  position: 'left' | 'right'
  greeting: string
  isActive?: boolean
}

export interface ChatbotConfig {
  customInstructions?: string
}

export interface BotPersona {
  name?: string
  role?: string
  avatarUrl?: string
  language?: string
  description?: string
}

export interface CreateStoreData {
  name: string
  wooDomain: string
  wooConsumerKey?: string
  wooConsumerSecret?: string
}

export interface UpdateStoreData {
  name: string
  wooDomain: string
  wooConsumerKey?: string
  wooConsumerSecret?: string
  widgetConfig: WidgetConfig
  chatbotConfig?: ChatbotConfig
  botPersona?: BotPersona
}

export interface FAQ {
  id: string
  question: string
  answer: string
  createdAt: string
}

export interface UsageMetrics {
  messageCount: number
  month: string
}

export type UsageStatus = 'ok' | 'warning' | 'critical' | 'exceeded'

export interface StoreUsage {
  storeId: string
  plan: {
    id: string | null
    name: string
    displayName: string
    limit: number
  }
  currentMonth: string
  messageCount: number
  remaining: number
  percentUsed: number
  resetsAt: string
  status: UsageStatus
}

export interface UsageHistory {
  month: string
  count: number
}

export interface UserProfile {
  id: string
  email: string
  name: string
  createdAt: string
  isGoogleUser: boolean
}

export interface Product {
  id: string
  wooProductId: string
  name: string
  description: string | null
  price: string | null
  currency: string | null
  url: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Document {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  status: 'processing' | 'completed' | 'failed'
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

// Analytics Types
export interface AnalyticsOverview {
  overview: {
    totalSessions: number
    totalMessages: number
    recentSessions: number
    recentMessages: number
    avgMessagesPerSession: number
  }
}

export interface DailyMessageCount {
  date: string
  count: number
}

export interface PopularQueriesData {
  topKeywords: { word: string; count: number }[]
  recentQueries: string[]
  totalQueries: number
}

export interface PeakHoursData {
  hourlyData: { hour: number; count: number }[]
  peakHour: number
  peakHourCount: number
  days: number
}

export type VerifyInstallStatus = 'installed' | 'not_found' | 'wrong_store_id' | 'unreachable' | 'timeout' | 'error' | 'no_domain'

export interface VerifyInstallResult {
  success: boolean
  status: VerifyInstallStatus
  message: string
  domain?: string
  details?: {
    scriptFound: boolean
    storeIdFound: boolean
  }
}

// Wizard Types
export interface CrawlResult {
  success: boolean
  url: string
  title?: string
  description?: string
  content?: string
  wordCount?: number
  error?: string
}

export interface CrawlWebsiteResult {
  success: boolean
  pages: CrawlResult[]
  totalWordCount: number
  error?: string
}

export interface GeneratedFAQ {
  question: string
  answer: string
  category?: string
}

export interface GenerateFaqsResult {
  success: boolean
  faqs: GeneratedFAQ[]
  count: number
}

export interface AutoGenerateFaqsResult {
  success: boolean
  websiteTitle: string
  pagesScanned: number
  totalWordCount: number
  faqs: GeneratedFAQ[]
  faqCount: number
}
