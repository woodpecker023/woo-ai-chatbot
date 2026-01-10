'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, Loader2 } from 'lucide-react'
import { api, type StoreUsage, type UsageStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

interface UsageMeterProps {
  storeId: string
  compact?: boolean
}

const statusConfig: Record<UsageStatus, { color: string; bgColor: string; label: string }> = {
  ok: { color: 'bg-green-500', bgColor: 'bg-green-100', label: 'Normal' },
  warning: { color: 'bg-yellow-500', bgColor: 'bg-yellow-100', label: 'Approaching limit' },
  critical: { color: 'bg-orange-500', bgColor: 'bg-orange-100', label: 'Almost at limit' },
  exceeded: { color: 'bg-red-500', bgColor: 'bg-red-100', label: 'Limit exceeded' },
}

export function UsageMeter({ storeId, compact = false }: UsageMeterProps) {
  const [usage, setUsage] = useState<StoreUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsage()
  }, [storeId])

  async function loadUsage() {
    try {
      const data = await api.getUsage(storeId)
      setUsage(data)
    } catch (err) {
      setError('Failed to load usage')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn(
        'bg-white rounded-lg border border-gray-200 p-4',
        compact ? 'p-3' : 'p-6'
      )}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || !usage) {
    return (
      <div className={cn(
        'bg-white rounded-lg border border-gray-200',
        compact ? 'p-3' : 'p-6'
      )}>
        <p className="text-sm text-gray-500">{error || 'Unable to load usage'}</p>
      </div>
    )
  }

  const config = statusConfig[usage.status]
  const isUnlimited = usage.plan.limit === -1
  const percentCapped = Math.min(usage.percentUsed, 100)
  const resetsAt = new Date(usage.resetsAt)
  const resetFormatted = resetsAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Messages</span>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            config.bgColor,
            usage.status === 'ok' ? 'text-green-700' :
            usage.status === 'warning' ? 'text-yellow-700' :
            usage.status === 'critical' ? 'text-orange-700' : 'text-red-700'
          )}>
            {usage.plan.displayName}
          </span>
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {usage.messageCount.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">
            / {isUnlimited ? 'Unlimited' : usage.plan.limit.toLocaleString()}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn('h-2 rounded-full transition-all', config.color)}
              style={{ width: `${percentCapped}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Monthly Usage</h3>
          <p className="text-sm text-gray-500">Current billing period</p>
        </div>
        <span className={cn(
          'text-sm font-medium px-3 py-1 rounded-full',
          config.bgColor,
          usage.status === 'ok' ? 'text-green-700' :
          usage.status === 'warning' ? 'text-yellow-700' :
          usage.status === 'critical' ? 'text-orange-700' : 'text-red-700'
        )}>
          {usage.plan.displayName}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {usage.messageCount.toLocaleString()}
            </span>
            <span className="text-gray-500">
              / {isUnlimited ? 'Unlimited' : usage.plan.limit.toLocaleString()} messages
            </span>
          </div>
          {!isUnlimited && (
            <span className={cn(
              'text-sm font-medium',
              usage.status === 'ok' ? 'text-gray-600' :
              usage.status === 'warning' ? 'text-yellow-600' :
              usage.status === 'critical' ? 'text-orange-600' : 'text-red-600'
            )}>
              {usage.percentUsed.toFixed(1)}% used
            </span>
          )}
        </div>

        {!isUnlimited && (
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn('h-3 rounded-full transition-all', config.color)}
              style={{ width: `${percentCapped}%` }}
            />
          </div>
        )}
      </div>

      {/* Alert for warning/critical/exceeded states */}
      {usage.status !== 'ok' && (
        <div className={cn(
          'flex items-start gap-3 p-3 rounded-lg mb-4',
          usage.status === 'warning' ? 'bg-yellow-50' :
          usage.status === 'critical' ? 'bg-orange-50' : 'bg-red-50'
        )}>
          <AlertTriangle className={cn(
            'h-5 w-5 flex-shrink-0 mt-0.5',
            usage.status === 'warning' ? 'text-yellow-600' :
            usage.status === 'critical' ? 'text-orange-600' : 'text-red-600'
          )} />
          <div>
            <p className={cn(
              'text-sm font-medium',
              usage.status === 'warning' ? 'text-yellow-800' :
              usage.status === 'critical' ? 'text-orange-800' : 'text-red-800'
            )}>
              {usage.status === 'warning' && "You're approaching your monthly limit"}
              {usage.status === 'critical' && "You're almost at your monthly limit"}
              {usage.status === 'exceeded' && "Your chatbot is paused - monthly limit exceeded"}
            </p>
            <p className={cn(
              'text-sm mt-1',
              usage.status === 'warning' ? 'text-yellow-700' :
              usage.status === 'critical' ? 'text-orange-700' : 'text-red-700'
            )}>
              {usage.status === 'exceeded'
                ? 'Upgrade your plan to resume chat functionality.'
                : 'Consider upgrading to avoid interruption.'}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4" />
          <span>Resets {resetFormatted}</span>
        </div>
        <Link
          href="/dashboard/billing"
          className={cn(
            'text-sm font-medium px-4 py-2 rounded-lg transition-colors',
            usage.status === 'exceeded'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          )}
        >
          {usage.status === 'exceeded' ? 'Upgrade Now' : 'Upgrade Plan'}
        </Link>
      </div>
    </div>
  )
}
