'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

export default function NewStorePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [wooDomain, setWooDomain] = useState('')
  const [wooConsumerKey, setWooConsumerKey] = useState('')
  const [wooConsumerSecret, setWooConsumerSecret] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await api.createStore({
        name,
        wooDomain: wooDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        wooConsumerKey: wooConsumerKey || undefined,
        wooConsumerSecret: wooConsumerSecret || undefined,
      })

      router.push(`/dashboard/stores/${response.store.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create store')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to stores
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Add a new store</h1>
        <p className="mt-2 text-gray-600">
          Connect your WooCommerce store to start using the AI chatbot
        </p>

        {/* Steps indicator */}
        <div className="mt-8 flex items-center gap-4">
          <StepIndicator step={1} currentStep={step} label="Store Info" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepIndicator step={2} currentStep={step} label="WooCommerce" />
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Store name
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  A friendly name to identify this store in your dashboard
                </p>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My WooCommerce Store"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                  Store domain
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  The URL of your WooCommerce store (without https://)
                </p>
                <input
                  id="domain"
                  type="text"
                  required
                  value={wooDomain}
                  onChange={(e) => setWooDomain(e.target.value)}
                  placeholder="mystore.com"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!name || !wooDomain}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-900">WooCommerce API Credentials</h3>
                <p className="mt-1 text-sm text-blue-700">
                  To sync products automatically, provide your WooCommerce REST API credentials.
                  You can find these in WooCommerce &rarr; Settings &rarr; Advanced &rarr; REST API.
                </p>
              </div>

              <div>
                <label htmlFor="consumerKey" className="block text-sm font-medium text-gray-700">
                  Consumer Key
                </label>
                <input
                  id="consumerKey"
                  type="text"
                  value={wooConsumerKey}
                  onChange={(e) => setWooConsumerKey(e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono text-sm"
                />
              </div>

              <div>
                <label htmlFor="consumerSecret" className="block text-sm font-medium text-gray-700">
                  Consumer Secret
                </label>
                <input
                  id="consumerSecret"
                  type="password"
                  value={wooConsumerSecret}
                  onChange={(e) => setWooConsumerSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono text-sm"
                />
              </div>

              <p className="text-xs text-gray-500">
                Credentials are optional. You can add them later or manually add products.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Store
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isActive = step === currentStep
  const isCompleted = step < currentStep

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isCompleted
            ? 'bg-primary-600 text-white'
            : isActive
            ? 'bg-primary-100 text-primary-700 border-2 border-primary-600'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : step}
      </div>
      <span className={`text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}
