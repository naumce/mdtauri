/**
 * AI Configuration for MD Creator
 * Secure environment-based configuration for AI providers
 */

// TEMPORARY: Hardcoded for testing - will fix env loading later
const AI_ENV = {
  // OpenAI Configuration - HARDCODED FOR TESTING
  OPENAI_API_KEY: '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',
  OPENAI_MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4',
  OPENAI_BASE_URL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',

  // Anthropic Configuration
  ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
  ANTHROPIC_BASE_URL: import.meta.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com',

  // General AI Settings - HARDCODED FOR TESTING
  AI_ENABLED: true,
  AI_DEFAULT_PROVIDER: 'openai',
  AI_MAX_TOKENS: parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 2000,
  AI_TEMPERATURE: parseFloat(import.meta.env.VITE_AI_TEMPERATURE) || 0.7,

  // Development & Debug
  AI_DEBUG: import.meta.env.VITE_AI_DEBUG === 'true',
  AI_RATE_LIMIT_PER_MINUTE: parseInt(import.meta.env.VITE_AI_RATE_LIMIT_PER_MINUTE) || 20,

  // Security Settings
  AI_TIMEOUT_MS: parseInt(import.meta.env.VITE_AI_TIMEOUT_MS) || 30000,
  AI_RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_AI_RETRY_ATTEMPTS) || 3
}

/**
 * AI Provider Configurations
 */
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    apiKey: AI_ENV.OPENAI_API_KEY,
    baseUrl: AI_ENV.OPENAI_BASE_URL,
    defaultModel: AI_ENV.OPENAI_MODEL,
    models: [
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable, best for complex tasks' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and cheaper GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
    ],
    pricing: {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    }
  },
  anthropic: {
    name: 'Anthropic',
    apiKey: AI_ENV.ANTHROPIC_API_KEY,
    baseUrl: AI_ENV.ANTHROPIC_BASE_URL,
    defaultModel: AI_ENV.ANTHROPIC_MODEL,
    models: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable Claude model' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and lightweight' }
    ],
    pricing: {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    }
  }
}

/**
 * AI Configuration Object
 */
export const AI_CONFIG = {
  // Global settings
  enabled: AI_ENV.AI_ENABLED,
  defaultProvider: AI_ENV.AI_DEFAULT_PROVIDER,
  debug: AI_ENV.AI_DEBUG,
  
  // Generation settings
  maxTokens: AI_ENV.AI_MAX_TOKENS,
  temperature: AI_ENV.AI_TEMPERATURE,
  
  // Security & Performance
  timeout: AI_ENV.AI_TIMEOUT_MS,
  retryAttempts: AI_ENV.AI_RETRY_ATTEMPTS,
  rateLimit: AI_ENV.AI_RATE_LIMIT_PER_MINUTE,
  
  // Provider configurations
  providers: AI_PROVIDERS,
  
  // Validation
  isValid() {
    if (!this.enabled) return { valid: true, reason: 'AI disabled' }
    
    const provider = this.providers[this.defaultProvider]
    if (!provider) {
      return { valid: false, reason: `Unknown provider: ${this.defaultProvider}` }
    }
    
    if (!provider.apiKey || provider.apiKey.includes('your_') || provider.apiKey.includes('_here')) {
      return { valid: false, reason: `Missing API key for ${provider.name}` }
    }
    
    return { valid: true, reason: 'Configuration valid' }
  },
  
  // Get current provider
  getCurrentProvider() {
    return this.providers[this.defaultProvider]
  },
  
  // Check if provider is configured
  isProviderConfigured(providerName) {
    const provider = this.providers[providerName]
    return provider && provider.apiKey && 
           !provider.apiKey.includes('your_') && 
           !provider.apiKey.includes('_here')
  },
  
  // Get configured providers
  getConfiguredProviders() {
    return Object.keys(this.providers).filter(name => this.isProviderConfigured(name))
  },
  
  // Security: Sanitize config for logging (no API keys)
  toSafeString() {
    return {
      enabled: this.enabled,
      defaultProvider: this.defaultProvider,
      configuredProviders: this.getConfiguredProviders(),
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      debug: this.debug
    }
  }
}

/**
 * Environment Setup Instructions
 */
export const ENVIRONMENT_SETUP = {
  instructions: `
To enable AI features, create a .env.local file in the root directory with:

# OpenAI (recommended)
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_AI_ENABLED=true
VITE_AI_DEFAULT_PROVIDER=openai

# Optional: Anthropic
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional: Custom settings
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.7
VITE_AI_DEBUG=false
`,
  
  files: [
    {
      name: '.env.local',
      content: `# AI Configuration - Add your API keys here
# This file is automatically ignored by git for security

VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_AI_ENABLED=true
VITE_AI_DEFAULT_PROVIDER=openai

# Optional settings
VITE_AI_MAX_TOKENS=2000
VITE_AI_TEMPERATURE=0.7
VITE_AI_DEBUG=false`
    },
    {
      name: '.env.example',
      content: `# AI Configuration Example
# Copy this file to .env.local and add your actual API keys

VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
VITE_AI_ENABLED=false
VITE_AI_DEFAULT_PROVIDER=openai`
    }
  ]
}

// Development helper - ALWAYS log for debugging
console.log('🤖 AI Configuration loaded:', AI_CONFIG.toSafeString())
console.log('🔍 FULL import.meta.env object:', import.meta.env)
console.log('🔍 Environment variables:', {
  VITE_AI_ENABLED: import.meta.env.VITE_AI_ENABLED,
  VITE_AI_DEFAULT_PROVIDER: import.meta.env.VITE_AI_DEFAULT_PROVIDER,
  VITE_OPENAI_API_KEY_SET: !!import.meta.env.VITE_OPENAI_API_KEY,
  VITE_OPENAI_API_KEY_LENGTH: import.meta.env.VITE_OPENAI_API_KEY?.length,
  VITE_OPENAI_API_KEY_PREVIEW: import.meta.env.VITE_OPENAI_API_KEY?.substring(0, 20) + '...'
})
console.log('🔍 All VITE_ variables:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))

const validation = AI_CONFIG.isValid()
if (validation.valid) {
  console.log('✅ AI Configuration is valid')
} else {
  console.warn('⚠️ AI Configuration issue:', validation.reason)
}

