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
    request<{ usage: UsageMetrics }>(`/stores/${storeId}/usage`),

  // Billing
  createCheckoutSession: (storeId: string) =>
    request<{ url: string }>(`/stores/${storeId}/checkout`, {
      method: 'POST',
    }),

  getCustomerPortalUrl: (storeId: string) =>
    request<{ url: string }>(`/stores/${storeId}/billing-portal`, {
      method: 'POST',
    }),
}

// Types
export interface Store {
  id: string
  name: string
  wooDomain: string
  apiKey: string
  widgetConfig: WidgetConfig
  createdAt: string
  updatedAt: string
}

export interface WidgetConfig {
  theme: 'light' | 'dark'
  primaryColor: string
  position: 'left' | 'right'
  greeting: string
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
