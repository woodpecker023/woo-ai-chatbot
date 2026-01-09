import Link from 'next/link'
import { MessageSquare, Zap, ShoppingCart, Settings, ArrowRight, Check } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold">WooAI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</Link>
            </div>
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

      {/* Hero Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              AI-Powered Support for Your{' '}
              <span className="gradient-text">WooCommerce Store</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Add an intelligent chatbot that answers customer questions, recommends products,
              and provides 24/7 support. No coding required.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-primary-600 px-6 py-3 text-lg font-medium text-white hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="#demo"
                className="rounded-lg border border-gray-300 px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                See Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need for automated support
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features that work out of the box
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<ShoppingCart className="h-6 w-6" />}
              title="Product Search"
              description="AI searches your product catalog to recommend items based on customer needs"
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="FAQ Answers"
              description="Automatically answers common questions using your knowledge base"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Instant Responses"
              description="Streaming responses provide instant, real-time answers to customers"
            />
            <FeatureCard
              icon={<Settings className="h-6 w-6" />}
              title="Easy Setup"
              description="Connect your store and customize the widget in minutes"
            />
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Works with WooCommerce
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Syncs your products automatically via the WooCommerce REST API
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-purple-100 p-3">
                  <svg className="h-8 w-8 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">WooCommerce</h3>
                  <p className="text-sm text-gray-600">Automatic product sync</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              One plan with everything you need
            </p>
          </div>
          <div className="mt-12 flex justify-center">
            <div className="rounded-2xl border-2 border-primary-600 bg-white p-8 shadow-lg max-w-md w-full">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">Pro Plan</h3>
                <div className="mt-4 flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-900">$49</span>
                  <span className="ml-1 text-gray-600">/month</span>
                </div>
                <p className="mt-2 text-gray-600">per store</p>
              </div>
              <ul className="mt-8 space-y-4">
                <PricingFeature>Unlimited chat messages</PricingFeature>
                <PricingFeature>Product catalog sync</PricingFeature>
                <PricingFeature>Knowledge base (FAQ)</PricingFeature>
                <PricingFeature>Customizable widget</PricingFeature>
                <PricingFeature>Streaming AI responses</PricingFeature>
                <PricingFeature>Priority support</PricingFeature>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-lg bg-primary-600 py-3 text-center font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Start 14-day free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-12 space-y-8">
            <FAQItem
              question="How does the AI chatbot work?"
              answer="The chatbot uses GPT-4 to understand customer questions and searches your product catalog and FAQ knowledge base to provide accurate answers. It streams responses in real-time for instant customer engagement."
            />
            <FAQItem
              question="How do I install the widget?"
              answer="Simply copy the embed code from your dashboard and paste it into your WordPress site. The widget loads asynchronously and won't slow down your store."
            />
            <FAQItem
              question="Can I customize the appearance?"
              answer="Yes! You can customize the widget's theme (light/dark), primary color, position (left/right), and greeting message from your dashboard."
            />
            <FAQItem
              question="What happens when the AI can't answer?"
              answer="The chatbot can create a support ticket for human follow-up when it cannot confidently answer a question. This ensures no customer query goes unanswered."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to automate your customer support?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Start your free trial today. No credit card required.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-lg font-medium text-primary-600 hover:bg-gray-100 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary-600" />
              <span className="font-bold">WooAI</span>
            </div>
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} WooAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="rounded-lg bg-primary-100 p-3 w-fit text-primary-600">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  )
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
      <span className="text-gray-700">{children}</span>
    </li>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-gray-200 pb-8">
      <h3 className="font-semibold text-gray-900">{question}</h3>
      <p className="mt-2 text-gray-600">{answer}</p>
    </div>
  )
}
