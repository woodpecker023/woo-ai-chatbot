'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Check,
  ExternalLink,
  Loader2,
  Store,
} from 'lucide-react'
import { api, ApiError, type Store as StoreType } from '@/lib/api'

export default function BillingPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

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

  async function handleSubscribe(storeId: string) {
    setLoadingAction(storeId)
    try {
      const response = await api.createCheckoutSession(storeId)
      window.location.href = response.url
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create checkout session')
      }
      setLoadingAction(null)
    }
  }

  async function handleManageBilling(storeId: string) {
    setLoadingAction(`manage-${storeId}`)
    try {
      const response = await api.getCustomerPortalUrl(storeId)
      window.location.href = response.url
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to open billing portal')
      }
      setLoadingAction(null)
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-gray-600">
          Manage subscriptions for your stores
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Pro Plan</h2>
        <div className="mt-2 flex items-baseline">
          <span className="text-3xl font-bold text-gray-900">$49</span>
          <span className="ml-1 text-gray-600">/month per store</span>
        </div>
        <ul className="mt-4 space-y-2">
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-primary-600" />
            Unlimited chat messages
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-primary-600" />
            Full product catalog sync
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-primary-600" />
            Knowledge base (FAQ)
          </li>
          <li className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-primary-600" />
            Priority support
          </li>
        </ul>
      </div>

      {/* Store Subscriptions */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stores</h2>

      {stores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No stores yet</h3>
          <p className="mt-2 text-gray-600">
            Create a store to start managing subscriptions
          </p>
          <Link
            href="/dashboard/stores/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Add Store
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {stores.map((store) => (
            <StoreSubscriptionCard
              key={store.id}
              store={store}
              onSubscribe={() => handleSubscribe(store.id)}
              onManage={() => handleManageBilling(store.id)}
              isLoading={loadingAction === store.id || loadingAction === `manage-${store.id}`}
            />
          ))}
        </div>
      )}

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing FAQ</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">How does billing work?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Each store requires a separate subscription. You're billed monthly on the anniversary of your subscription start date.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">Can I cancel anytime?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">What happens if I don't pay?</h3>
            <p className="mt-1 text-sm text-gray-600">
              If payment fails, we'll retry a few times. If it continues to fail, your chatbot will be paused until payment is received.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StoreSubscriptionCard({
  store,
  onSubscribe,
  onManage,
  isLoading,
}: {
  store: StoreType
  onSubscribe: () => void
  onManage: () => void
  isLoading: boolean
}) {
  // TODO: Get actual subscription status from store data
  const hasSubscription = false // Placeholder - would come from store.subscription

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Store className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{store.name}</h3>
            <p className="text-sm text-gray-500">{store.wooDomain}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasSubscription ? (
            <>
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                Active
              </span>
              <button
                onClick={onManage}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage Billing
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Free Trial
              </span>
              <button
                onClick={onSubscribe}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Subscribe
              </button>
            </>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Messages this month</span>
          <span className="font-medium text-gray-900">0 / Unlimited</span>
        </div>
      </div>
    </div>
  )
}
