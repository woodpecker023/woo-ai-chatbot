'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  Search,
  Package,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { api, ApiError, type Product, type Pagination } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function ProductsPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadProducts = useCallback(async (page: number, search?: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await api.getProducts(storeId, {
        page,
        limit: 20,
        search: search || undefined,
      })
      setProducts(response.products)
      setPagination(response.pagination)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load products')
      }
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    loadProducts(1)
  }, [loadProducts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadProducts(1, searchQuery)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadProducts(page, searchQuery)
  }

  const handleSync = async () => {
    setError('')
    setSuccess('')
    setIsSyncing(true)

    try {
      const response = await api.syncProducts(storeId)
      setSuccess(`Successfully synced ${response.synced} products`)
      loadProducts(1, searchQuery)
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

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    setDeletingId(productId)
    setError('')

    try {
      await api.deleteProduct(storeId, productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      if (pagination) {
        setPagination({ ...pagination, total: pagination.total - 1 })
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete product')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href={`/dashboard/stores/${storeId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to store settings
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">
            {pagination?.total || 0} products synced from WooCommerce
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </button>
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

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery ? 'No products found' : 'No products synced yet'}
          </h3>
          <p className="mt-2 text-gray-600">
            {searchQuery
              ? 'Try a different search term'
              : 'Click "Sync Products" to import products from your WooCommerce store'}
          </p>
        </div>
      ) : (
        <>
          {/* Products Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={() => handleDelete(product.id)}
                isDeleting={deletingId === product.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCard({
  product,
  onDelete,
  isDeleting,
}: {
  product: Product
  onDelete: () => void
  isDeleting: boolean
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 relative">
        {product.imageUrl && !imageError ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2" title={product.name}>
          {product.name}
        </h3>
        {product.price && (
          <p className="mt-1 text-lg font-semibold text-primary-600">
            {product.currency === 'USD' ? '$' : product.currency}
            {product.price}
          </p>
        )}
        {product.description && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
            {product.description.replace(/<[^>]*>/g, '')}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </a>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Delete
          </button>
        </div>

        {/* WooCommerce ID */}
        <p className="mt-3 text-xs text-gray-400">
          WooCommerce ID: {product.wooProductId}
        </p>
      </div>
    </div>
  )
}
