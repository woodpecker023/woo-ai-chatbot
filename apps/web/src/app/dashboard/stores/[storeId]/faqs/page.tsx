'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  MessageSquare,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  File,
} from 'lucide-react'
import { api, ApiError, type FAQ, type Document } from '@/lib/api'
import { cn } from '@/lib/utils'

type Tab = 'faqs' | 'documents'

export default function KnowledgeBasePage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
  const [activeTab, setActiveTab] = useState<Tab>('faqs')
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // FAQ Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')

  // New FAQ state
  const [isAdding, setIsAdding] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Document upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [storeId])

  async function loadData() {
    setIsLoading(true)
    try {
      const [faqsRes, docsRes] = await Promise.all([
        api.getFaqs(storeId),
        api.getDocuments(storeId),
      ])
      setFaqs(faqsRes.faqs)
      setDocuments(docsRes.documents)
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateFaq() {
    if (!newQuestion.trim() || !newAnswer.trim()) return

    setError('')
    setIsSaving(true)

    try {
      const response = await api.createFaq(storeId, {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      })
      setFaqs([response.faq, ...faqs])
      setNewQuestion('')
      setNewAnswer('')
      setIsAdding(false)
      setSuccess('FAQ added successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create FAQ')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateFaq(faqId: string) {
    if (!editQuestion.trim() || !editAnswer.trim()) return

    setError('')
    setIsSaving(true)

    try {
      const response = await api.updateFaq(storeId, faqId, {
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
      })
      setFaqs(faqs.map((f) => (f.id === faqId ? response.faq : f)))
      setEditingId(null)
      setSuccess('FAQ updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to update FAQ')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteFaq(faqId: string) {
    if (!confirm('Are you sure you want to delete this FAQ?')) return

    try {
      await api.deleteFaq(storeId, faqId)
      setFaqs(faqs.filter((f) => f.id !== faqId))
      setSuccess('FAQ deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to delete FAQ')
    }
  }

  function startEdit(faq: FAQ) {
    setEditingId(faq.id)
    setEditQuestion(faq.question)
    setEditAnswer(faq.answer)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditQuestion('')
    setEditAnswer('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setIsUploading(true)

    try {
      const response = await api.uploadDocument(storeId, file)
      setDocuments([response.document, ...documents])
      setSuccess('Document uploaded and processing started')
      setTimeout(() => setSuccess(''), 3000)

      // Poll for status updates
      pollDocumentStatus(response.document.id)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to upload document')
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function pollDocumentStatus(documentId: string) {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      attempts++
      if (attempts > maxAttempts) return

      try {
        const response = await api.getDocument(storeId, documentId)
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === documentId ? { ...d, ...response.document } : d
          )
        )

        if (response.document.status === 'processing') {
          setTimeout(poll, 2000)
        }
      } catch (err) {
        // Stop polling on error
      }
    }

    setTimeout(poll, 2000)
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return

    setDeletingDocId(documentId)
    try {
      await api.deleteDocument(storeId, documentId)
      setDocuments(documents.filter((d) => d.id !== documentId))
      setSuccess('Document deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to delete document')
    } finally {
      setDeletingDocId(null)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getStatusIcon(status: Document['status']) {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  function getFileIcon(fileType: string) {
    return <File className="h-5 w-5 text-gray-400" />
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
      <Link
        href={`/dashboard/stores/${storeId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to store settings
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="text-gray-600">
          Add FAQs and documents to help the AI answer customer questions
        </p>
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
          <button
            onClick={() => setActiveTab('faqs')}
            className={cn(
              'flex items-center gap-2 py-4 text-sm font-medium border-b-2 -mb-px',
              activeTab === 'faqs'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            FAQs ({faqs.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={cn(
              'flex items-center gap-2 py-4 text-sm font-medium border-b-2 -mb-px',
              activeTab === 'documents'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <FileText className="h-4 w-4" />
            Documents ({documents.length})
          </button>
        </nav>
      </div>

      {/* FAQs Tab */}
      {activeTab === 'faqs' && (
        <>
          <div className="flex justify-end mb-6">
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add FAQ
              </button>
            )}
          </div>

          {/* Add new FAQ form */}
          {isAdding && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">New FAQ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Question
                  </label>
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g., What is your return policy?"
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Answer
                  </label>
                  <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={4}
                    placeholder="Provide a detailed answer..."
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewQuestion('')
                      setNewAnswer('')
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFaq}
                    disabled={isSaving || !newQuestion.trim() || !newAnswer.trim()}
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save FAQ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAQ list */}
          {faqs.length === 0 && !isAdding ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No FAQs yet
              </h3>
              <p className="mt-2 text-gray-600">
                Add FAQs to help the AI chatbot answer common customer questions
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add your first FAQ
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  {editingId === faq.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Question
                        </label>
                        <input
                          type="text"
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Answer
                        </label>
                        <textarea
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          rows={4}
                          className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateFaq(faq.id)}
                          disabled={
                            isSaving ||
                            !editQuestion.trim() ||
                            !editAnswer.trim()
                          }
                          className="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900">
                          {faq.question}
                        </h3>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => startEdit(faq)}
                            className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFaq(faq.id)}
                            className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-600 whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <>
          {/* Upload area */}
          <div className="mb-6">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center',
                isUploading
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
                  <p className="mt-4 text-sm font-medium text-primary-600">
                    Uploading document...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="mt-4 text-sm font-medium text-gray-900">
                    Upload a document
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, Word (DOC, DOCX), or TXT files up to 10MB
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Select File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document list */}
          {documents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No documents yet
              </h3>
              <p className="mt-2 text-gray-600">
                Upload PDF, Word, or text documents to expand your knowledge base
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.fileType)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="uppercase">{doc.fileType}</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(doc.status)}
                        <span
                          className={cn(
                            'text-xs font-medium capitalize',
                            doc.status === 'completed' && 'text-green-600',
                            doc.status === 'processing' && 'text-yellow-600',
                            doc.status === 'failed' && 'text-red-600'
                          )}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingDocId === doc.id}
                        className="rounded p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingDocId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {doc.status === 'failed' && doc.errorMessage && (
                    <div className="mt-3 rounded-lg bg-red-50 p-3">
                      <p className="text-xs text-red-700">{doc.errorMessage}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info box */}
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-medium text-blue-800">
              How document processing works
            </h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>1. Upload your document (PDF, Word, or text file)</li>
              <li>2. We extract and split the content into chunks</li>
              <li>3. Each chunk is converted to embeddings for AI search</li>
              <li>4. The chatbot can now answer questions using your document</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
