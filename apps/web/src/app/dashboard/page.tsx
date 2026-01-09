'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store, Settings, ExternalLink, Plus, Loader2 } from 'lucide-react'
import { api, type Store as StoreType } from '@/lib/api'

export default function DashboardPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    try {
      const response = await api.getStores()
      setStores(response.stores)
    } catch (err) {
      setError('Failed to load stores')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Stores</h1>
        <p className="mt-1 text-gray-600">
          Manage your WooCommerce stores and their AI chatbots
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {stores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No stores yet</h3>
          <p className="mt-2 text-gray-600">
            Connect your first WooCommerce store to get started
          </p>
          <Link
            href="/dashboard/stores/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Store
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-500">{store.wooDomain}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href={`/dashboard/stores/${store.id}`}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <a
                  href={`https://${store.wooDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}

          {/* Add new store card */}
          <Link
            href="/dashboard/stores/new"
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-primary-400 hover:bg-primary-50/50 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">Add new store</p>
          </Link>
        </div>
      )}
    </div>
  )
}
