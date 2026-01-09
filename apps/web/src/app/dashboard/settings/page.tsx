'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Lock,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { api, ApiError, type UserProfile } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

type Tab = 'profile' | 'security' | 'danger'

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Profile form
  const [name, setName] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // Delete account
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const response = await api.getProfile()
      setProfile(response.user)
      setName(response.user.name)
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveProfile() {
    setError('')
    setSuccess('')
    setIsSavingProfile(true)

    try {
      const response = await api.updateProfile({ name })
      setProfile((prev) => prev ? { ...prev, name: response.user.name } : null)
      // Update localStorage user data
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        user.name = response.user.name
        localStorage.setItem('user', JSON.stringify(user))
      }
      setSuccess('Profile updated successfully')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to update profile')
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setIsSavingPassword(true)

    try {
      await api.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Password changed successfully')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to change password')
      }
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setError('')
    setIsDeleting(true)

    try {
      await api.deleteAccount()
      logout()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete account')
      }
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'security' as Tab, label: 'Security', icon: Lock },
    { id: 'danger' as Tab, label: 'Danger Zone', icon: AlertTriangle },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-gray-600">Manage your account preferences</p>
      </div>

      {(error || success) && (
        <div
          className={cn(
            'mb-6 rounded-lg p-4',
            error ? 'bg-red-50' : 'bg-green-50'
          )}
        >
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
              onClick={() => {
                setActiveTab(tab.id)
                setError('')
                setSuccess('')
              }}
              className={cn(
                'flex items-center gap-2 py-4 text-sm font-medium border-b-2 -mb-px',
                activeTab === tab.id
                  ? tab.id === 'danger'
                    ? 'border-red-600 text-red-600'
                    : 'border-primary-600 text-primary-600'
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
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Created
              </label>
              <p className="mt-2 text-sm text-gray-600">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </p>
            </div>

            {profile?.isGoogleUser && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  This account was created using Google Sign-In
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || name === profile?.name}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {profile?.isGoogleUser ? (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                <h4 className="text-sm font-medium text-yellow-800">
                  Google Account
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  Your account is linked to Google. Password management is handled
                  through your Google account.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Change Password
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Update your password to keep your account secure
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-2 relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-2 relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleChangePassword}
                    disabled={
                      isSavingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSavingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Change Password
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <h3 className="text-lg font-medium text-red-800">Delete Account</h3>
              <p className="mt-1 text-sm text-red-700">
                Once you delete your account, there is no going back. All your
                stores, products, FAQs, and data will be permanently deleted.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete My Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
