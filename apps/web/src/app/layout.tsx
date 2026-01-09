import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WooAI - AI-Powered Chatbot for WooCommerce',
  description: 'Add an intelligent AI chatbot to your WooCommerce store. Answer customer questions, recommend products, and provide 24/7 support automatically.',
  openGraph: {
    title: 'WooAI - AI-Powered Chatbot for WooCommerce',
    description: 'Add an intelligent AI chatbot to your WooCommerce store. Answer customer questions, recommend products, and provide 24/7 support automatically.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
