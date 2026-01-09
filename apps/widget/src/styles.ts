export function getStyles(theme: 'light' | 'dark', position: 'left' | 'right'): string {
  const isLight = theme === 'light'
  const isRight = position === 'right'

  // Color palette
  const colors = {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryLight: '#e0f2fe',

    // Light theme
    light: {
      bg: '#ffffff',
      bgSecondary: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      userBubble: '#0ea5e9',
      userText: '#ffffff',
      assistantBubble: '#f1f5f9',
      assistantText: '#1e293b',
    },

    // Dark theme
    dark: {
      bg: '#1e293b',
      bgSecondary: '#0f172a',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      userBubble: '#0ea5e9',
      userText: '#ffffff',
      assistantBubble: '#334155',
      assistantText: '#f1f5f9',
    },
  }

  const c = isLight ? colors.light : colors.dark

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #wooai-widget-root {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Launcher Button */
    .wooai-launcher {
      position: fixed;
      bottom: 20px;
      ${isRight ? 'right: 20px;' : 'left: 20px;'}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${colors.primary};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 2147483647;
    }

    .wooai-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .wooai-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    /* Chat Window */
    .wooai-window {
      position: fixed;
      bottom: 90px;
      ${isRight ? 'right: 20px;' : 'left: 20px;'}
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 600px;
      max-height: calc(100vh - 120px);
      background: ${c.bg};
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483646;
      animation: wooai-slide-up 0.3s ease-out;
    }

    @keyframes wooai-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .wooai-header {
      padding: 16px 20px;
      background: ${colors.primary};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .wooai-header-title {
      font-weight: 600;
      font-size: 16px;
    }

    .wooai-header-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .wooai-header-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .wooai-header-close svg {
      width: 20px;
      height: 20px;
      stroke: white;
    }

    /* Messages Container */
    .wooai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: ${c.bgSecondary};
    }

    .wooai-messages::-webkit-scrollbar {
      width: 6px;
    }

    .wooai-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .wooai-messages::-webkit-scrollbar-thumb {
      background: ${c.border};
      border-radius: 3px;
    }

    /* Message Bubble */
    .wooai-message {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .wooai-message-user {
      align-self: flex-end;
      background: ${c.userBubble};
      color: ${c.userText};
      border-bottom-right-radius: 4px;
    }

    .wooai-message-assistant {
      align-self: flex-start;
      background: ${c.assistantBubble};
      color: ${c.assistantText};
      border-bottom-left-radius: 4px;
    }

    /* Typing Indicator */
    .wooai-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: ${c.assistantBubble};
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }

    .wooai-typing-dot {
      width: 8px;
      height: 8px;
      background: ${c.textSecondary};
      border-radius: 50%;
      animation: wooai-bounce 1.4s infinite ease-in-out;
    }

    .wooai-typing-dot:nth-child(1) { animation-delay: 0s; }
    .wooai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .wooai-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes wooai-bounce {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Product Card */
    .wooai-product {
      background: ${c.bg};
      border: 1px solid ${c.border};
      border-radius: 12px;
      padding: 12px;
      margin-top: 8px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .wooai-product-image {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      object-fit: cover;
      background: ${c.bgSecondary};
      flex-shrink: 0;
    }

    .wooai-product-info {
      flex: 1;
      min-width: 0;
    }

    .wooai-product-name {
      font-weight: 600;
      color: ${c.text};
      font-size: 14px;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wooai-product-price {
      color: ${colors.primary};
      font-weight: 600;
      font-size: 14px;
    }

    .wooai-product-link {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 12px;
      background: ${colors.primary};
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .wooai-product-link:hover {
      background: ${colors.primaryHover};
    }

    /* Input Area */
    .wooai-input-container {
      padding: 12px 16px;
      background: ${c.bg};
      border-top: 1px solid ${c.border};
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .wooai-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid ${c.border};
      border-radius: 20px;
      background: ${c.bgSecondary};
      color: ${c.text};
      font-size: 14px;
      font-family: inherit;
      resize: none;
      max-height: 120px;
      outline: none;
      transition: border-color 0.2s;
    }

    .wooai-input:focus {
      border-color: ${colors.primary};
    }

    .wooai-input::placeholder {
      color: ${c.textSecondary};
    }

    .wooai-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${colors.primary};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, opacity 0.2s;
      flex-shrink: 0;
    }

    .wooai-send:hover:not(:disabled) {
      background: ${colors.primaryHover};
    }

    .wooai-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .wooai-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    /* Greeting Message */
    .wooai-greeting {
      text-align: center;
      padding: 20px;
      color: ${c.textSecondary};
    }

    .wooai-greeting-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      background: ${colors.primaryLight};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wooai-greeting-icon svg {
      width: 24px;
      height: 24px;
      fill: ${colors.primary};
    }

    .wooai-greeting-text {
      font-size: 15px;
      color: ${c.text};
    }

    /* Powered By */
    .wooai-powered {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: ${c.textSecondary};
      background: ${c.bg};
    }

    .wooai-powered a {
      color: ${colors.primary};
      text-decoration: none;
    }

    .wooai-powered a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 440px) {
      .wooai-window {
        width: calc(100vw - 20px);
        ${isRight ? 'right: 10px;' : 'left: 10px;'}
        bottom: 80px;
        height: calc(100vh - 100px);
        border-radius: 12px;
      }

      .wooai-launcher {
        ${isRight ? 'right: 10px;' : 'left: 10px;'}
        bottom: 10px;
        width: 56px;
        height: 56px;
      }
    }
  `
}
