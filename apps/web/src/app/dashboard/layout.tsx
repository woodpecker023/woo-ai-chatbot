'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Store, CreditCard, LogOut, Plus, Menu, X, Settings } from 'lucide-react'
import { useState } from 'react'
import { AuthProvider, useRequireAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useRequireAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Stores', href: '/dashboard', icon: Store },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600/75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold">WooAI</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold">WooAI</span>
            </Link>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6 text-gray-500" />
          </button>
          <div className="flex-1" />
          <Link
            href="/dashboard/stores/new"
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Store
          </Link>
        </div>
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  )
}
