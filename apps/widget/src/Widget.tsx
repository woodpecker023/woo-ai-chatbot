import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatIcon, CloseIcon, SendIcon, BotIcon } from './icons'

interface WidgetConfig {
  storeId: string
  theme: 'light' | 'dark'
  position: 'left' | 'right'
  greeting: string
  apiUrl: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  products?: Product[]
}

interface Product {
  id: string
  name: string
  price: string
  image?: string
  url?: string
}

interface WidgetProps {
  config: WidgetConfig
}

// Session management
function getSessionId(storeId: string): string {
  const key = `wooai_session_${storeId}`
  let sessionId = localStorage.getItem(key)

  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    localStorage.setItem(key, sessionId)
  }

  return sessionId
}

export function Widget({ config }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => getSessionId(config.storeId))

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const content = input.trim()
    if (!content || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create placeholder for assistant message
    const assistantMessageId = `msg_${Date.now() + 1}`
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    }])

    try {
      const response = await fetch(`${config.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: config.storeId,
          sessionId,
          message: content,
        }),
      })

      if (!response.ok) {
        // Handle limit exceeded (429)
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.error === 'limit_exceeded') {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: "I'm sorry, this chat service is temporarily unavailable. The store has reached its monthly message limit. Please try again later or contact the store directly for assistance."
                    }
                  : msg
              )
            )
            setIsLoading(false)
            return
          }
        }
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let products: Product[] = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)

              if (data === '[DONE]') {
                continue
              }

              try {
                const parsed = JSON.parse(data)

                if (parsed.type === 'content') {
                  accumulatedContent += parsed.content
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  )
                } else if (parsed.type === 'products') {
                  products = parsed.products
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, products }
                        : msg
                    )
                  )
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[WooAI] Error sending message:', error)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, config.apiUrl, config.storeId, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <>
      {/* Launcher Button */}
      <button
        className="wooai-launcher"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="wooai-window">
          {/* Header */}
          <div className="wooai-header">
            <span className="wooai-header-title">Chat with us</span>
            <button
              className="wooai-header-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div className="wooai-messages">
            {messages.length === 0 ? (
              <div className="wooai-greeting">
                <div className="wooai-greeting-icon">
                  <BotIcon />
                </div>
                <p className="wooai-greeting-text">{config.greeting}</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id}>
                  <div
                    className={`wooai-message wooai-message-${message.role}`}
                  >
                    {message.content || (message.role === 'assistant' && isLoading && (
                      <TypingIndicator />
                    ))}
                  </div>
                  {message.products && message.products.length > 0 && (
                    <div>
                      {message.products.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="wooai-typing">
                <div className="wooai-typing-dot" />
                <div className="wooai-typing-dot" />
                <div className="wooai-typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="wooai-input-container">
            <textarea
              ref={inputRef}
              className="wooai-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className="wooai-send"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>

          {/* Powered By */}
          <div className="wooai-powered">
            Powered by <a href="https://wooai.app" target="_blank" rel="noopener noreferrer">WooAI</a>
          </div>
        </div>
      )}
    </>
  )
}

function TypingIndicator() {
  return (
    <div className="wooai-typing">
      <div className="wooai-typing-dot" />
      <div className="wooai-typing-dot" />
      <div className="wooai-typing-dot" />
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="wooai-product">
      {product.image && (
        <img
          src={product.image}
          alt={product.name}
          className="wooai-product-image"
        />
      )}
      <div className="wooai-product-info">
        <div className="wooai-product-name">{product.name}</div>
        <div className="wooai-product-price">{product.price}</div>
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wooai-product-link"
          >
            View Product
          </a>
        )}
      </div>
    </div>
  )
}
