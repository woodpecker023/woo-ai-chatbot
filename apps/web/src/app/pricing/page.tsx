import Link from 'next/link'
import { MessageSquare, Check, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing - WooAI',
  description: 'Simple, transparent pricing for WooAI. One plan with everything you need to add AI-powered support to your WooCommerce store.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold">WooAI</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Log in</Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              One plan with everything you need. No hidden fees.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <h2 className="text-xl font-bold text-gray-900">Free Trial</h2>
              <p className="mt-2 text-gray-600">Try WooAI risk-free</p>
              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="ml-2 text-gray-600">/14 days</span>
              </div>
              <ul className="mt-8 space-y-4">
                <PricingFeature>100 chat messages</PricingFeature>
                <PricingFeature>1 store</PricingFeature>
                <PricingFeature>Product sync</PricingFeature>
                <PricingFeature>Basic widget customization</PricingFeature>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg border border-primary-600 py-3 text-center font-medium text-primary-600 hover:bg-primary-50 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="rounded-2xl border-2 border-primary-600 bg-white p-8 shadow-lg relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary-600 px-4 py-1 text-sm font-medium text-white">
                  Most Popular
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Pro Plan</h2>
              <p className="mt-2 text-gray-600">Everything for growing stores</p>
              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">$49</span>
                <span className="ml-2 text-gray-600">/month per store</span>
              </div>
              <ul className="mt-8 space-y-4">
                <PricingFeature included>Unlimited chat messages</PricingFeature>
                <PricingFeature included>Unlimited stores</PricingFeature>
                <PricingFeature included>Full product catalog sync</PricingFeature>
                <PricingFeature included>Knowledge base (FAQ)</PricingFeature>
                <PricingFeature included>Full widget customization</PricingFeature>
                <PricingFeature included>Streaming AI responses</PricingFeature>
                <PricingFeature included>Order status lookup</PricingFeature>
                <PricingFeature included>Human handoff tickets</PricingFeature>
                <PricingFeature included>Priority support</PricingFeature>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg bg-primary-600 py-3 text-center font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Pricing FAQ</h2>
            <div className="mt-8 space-y-6">
              <FAQItem
                question="What counts as a chat message?"
                answer="Each message sent by a customer counts as one message. AI responses don't count toward your limit."
              />
              <FAQItem
                question="Can I cancel anytime?"
                answer="Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
              />
              <FAQItem
                question="Do you offer discounts for annual billing?"
                answer="Not yet, but we're working on adding annual billing with a discount soon."
              />
              <FAQItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards via Stripe. We don't store your card details."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function PricingFeature({ children, included = true }: { children: React.ReactNode; included?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <Check className={`h-5 w-5 flex-shrink-0 ${included ? 'text-primary-600' : 'text-gray-400'}`} />
      <span className={included ? 'text-gray-700' : 'text-gray-500'}>{children}</span>
    </li>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg bg-white p-6 border border-gray-200">
      <h3 className="font-semibold text-gray-900">{question}</h3>
      <p className="mt-2 text-gray-600">{answer}</p>
    </div>
  )
}
