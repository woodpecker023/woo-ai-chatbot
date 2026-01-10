'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Globe,
  Search,
  FileText,
  Check,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { api, ApiError, type GeneratedFAQ } from '@/lib/api'
import { cn } from '@/lib/utils'

type WizardStep = 'url' | 'scanning' | 'review' | 'complete'

interface EditingFaq {
  index: number
  question: string
  answer: string
}

export default function TrainingWizardPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params
  const router = useRouter()

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('url')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [language, setLanguage] = useState('English')
  const [maxFaqs, setMaxFaqs] = useState(10)

  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState('')
  const [scanError, setScanError] = useState('')

  // Results state
  const [websiteTitle, setWebsiteTitle] = useState('')
  const [pagesScanned, setPagesScanned] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [faqs, setFaqs] = useState<GeneratedFAQ[]>([])

  // FAQ editing state
  const [editingFaq, setEditingFaq] = useState<EditingFaq | null>(null)
  const [isAddingFaq, setIsAddingFaq] = useState(false)
  const [newFaqQuestion, setNewFaqQuestion] = useState('')
  const [newFaqAnswer, setNewFaqAnswer] = useState('')

  // Saving state
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const steps = [
    { id: 'url', label: 'Website URL', icon: Globe },
    { id: 'scanning', label: 'Scanning', icon: Search },
    { id: 'review', label: 'Review FAQs', icon: FileText },
    { id: 'complete', label: 'Complete', icon: Check },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  async function handleStartScan() {
    if (!websiteUrl.trim()) {
      setScanError('Please enter a website URL')
      return
    }

    setScanError('')
    setIsScanning(true)
    setCurrentStep('scanning')
    setScanProgress('Connecting to website...')

    try {
      setScanProgress('Scanning website pages...')

      const result = await api.autoGenerateFaqs(websiteUrl, 5, language, maxFaqs)

      if (!result.success) {
        throw new Error('Failed to scan website')
      }

      setWebsiteTitle(result.websiteTitle)
      setPagesScanned(result.pagesScanned)
      setTotalWords(result.totalWordCount)
      setFaqs(result.faqs)

      setScanProgress('Complete!')
      setTimeout(() => {
        setCurrentStep('review')
      }, 500)
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : 'Failed to scan website. Please check the URL and try again.')
      setCurrentStep('url')
    } finally {
      setIsScanning(false)
    }
  }

  function handleEditFaq(index: number) {
    setEditingFaq({
      index,
      question: faqs[index].question,
      answer: faqs[index].answer,
    })
  }

  function handleSaveEdit() {
    if (!editingFaq) return

    const updatedFaqs = [...faqs]
    updatedFaqs[editingFaq.index] = {
      ...updatedFaqs[editingFaq.index],
      question: editingFaq.question,
      answer: editingFaq.answer,
    }
    setFaqs(updatedFaqs)
    setEditingFaq(null)
  }

  function handleDeleteFaq(index: number) {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  function handleAddFaq() {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return

    setFaqs([...faqs, { question: newFaqQuestion, answer: newFaqAnswer }])
    setNewFaqQuestion('')
    setNewFaqAnswer('')
    setIsAddingFaq(false)
  }

  async function handleSaveFaqs() {
    if (faqs.length === 0) {
      setSaveError('Please add at least one FAQ')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      // Save each FAQ to the store
      for (const faq of faqs) {
        await api.createFaq(storeId, {
          question: faq.question,
          answer: faq.answer,
        })
      }

      setCurrentStep('complete')
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save FAQs')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/dashboard/stores/${storeId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to store
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary-600" />
          Train Your Chatbot
        </h1>
        <p className="text-gray-600 mt-1">
          Scan your website to automatically generate FAQs for your chatbot
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                index < currentStepIndex
                  ? "bg-primary-600 border-primary-600 text-white"
                  : index === currentStepIndex
                  ? "border-primary-600 text-primary-600"
                  : "border-gray-300 text-gray-400"
              )}>
                {index < currentStepIndex ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-16 sm:w-24 h-1 mx-2",
                  index < currentStepIndex ? "bg-primary-600" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step) => (
            <span key={step.id} className="text-xs text-gray-500 w-20 text-center">
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Step 1: URL Input */}
        {currentStep === 'url' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Enter Your Website URL</h2>
              <p className="text-sm text-gray-500 mt-1">
                We'll scan your website to learn about your business and generate relevant FAQs
              </p>
            </div>

            {scanError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">{scanError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Website URL</label>
              <div className="mt-2 flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="English">English</option>
                  <option value="Serbian">Serbian</option>
                  <option value="German">German</option>
                  <option value="French">French</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Dutch">Dutch</option>
                  <option value="Polish">Polish</option>
                  <option value="Russian">Russian</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max FAQs to Generate</label>
                <select
                  value={maxFaqs}
                  onChange={(e) => setMaxFaqs(parseInt(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value={5}>5 FAQs</option>
                  <option value={10}>10 FAQs</option>
                  <option value={15}>15 FAQs</option>
                  <option value={20}>20 FAQs</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h4 className="text-sm font-medium text-blue-800">What happens next?</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>1. We scan your website's main pages</li>
                <li>2. AI analyzes the content to understand your business</li>
                <li>3. FAQs are generated based on your products, policies, and services</li>
                <li>4. You can review, edit, and approve the FAQs before saving</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStartScan}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Start Scanning
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Scanning */}
        {currentStep === 'scanning' && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900 mt-4">Scanning Your Website</h2>
            <p className="text-gray-500 mt-2">{scanProgress}</p>
            <p className="text-sm text-gray-400 mt-4">
              This may take a minute or two depending on your website size
            </p>
          </div>
        )}

        {/* Step 3: Review FAQs */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Review Generated FAQs</h2>
              <p className="text-sm text-gray-500 mt-1">
                We found <strong>{pagesScanned}</strong> pages and <strong>{totalWords.toLocaleString()}</strong> words on <strong>{websiteTitle}</strong>
              </p>
            </div>

            {saveError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            )}

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-4">
                  {editingFaq?.index === index ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingFaq.question}
                        onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <textarea
                        value={editingFaq.answer}
                        onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingFaq(null)}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{faq.question}</h4>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEditFaq(index)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFaq(index)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{faq.answer}</p>
                    </>
                  )}
                </div>
              ))}

              {/* Add new FAQ */}
              {isAddingFaq ? (
                <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-4 space-y-3">
                  <input
                    type="text"
                    value={newFaqQuestion}
                    onChange={(e) => setNewFaqQuestion(e.target.value)}
                    placeholder="Question"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <textarea
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Answer"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsAddingFaq(false)
                        setNewFaqQuestion('')
                        setNewFaqAnswer('')
                      }}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFaq}
                      disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                      className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add FAQ
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingFaq(true)}
                  className="w-full rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-primary-500 hover:text-primary-600 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom FAQ
                </button>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentStep('url')}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleSaveFaqs}
                disabled={isSaving || faqs.length === 0}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save {faqs.length} FAQs
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Training Complete!</h2>
            <p className="text-gray-500 mt-2">
              {faqs.length} FAQs have been added to your chatbot's knowledge base
            </p>

            <div className="mt-8 space-y-3">
              <Link
                href={`/dashboard/stores/${storeId}/faqs`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <FileText className="h-4 w-4" />
                View Knowledge Base
              </Link>
              <div>
                <Link
                  href={`/dashboard/stores/${storeId}`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to Store Settings
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
