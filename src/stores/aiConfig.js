import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AI_CONFIG, AI_PROVIDERS, ENVIRONMENT_SETUP } from '../config/aiConfig.js'

/**
 * AI Configuration Store
 * Manages AI provider settings, API keys, and configuration state
 */
export const useAiConfigStore = defineStore('aiConfig', () => {
  // State
  const provider = ref(AI_CONFIG.defaultProvider)
  const apiKeys = ref({
    openai: AI_CONFIG.providers.openai.apiKey,
    anthropic: AI_CONFIG.providers.anthropic.apiKey
  })
  const settings = ref({
    enabled: AI_CONFIG.enabled,
    maxTokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
    debug: AI_CONFIG.debug
  })
  const isInitialized = ref(false)
  const lastError = ref(null)

  // Computed
  const isEnabled = computed(() => settings.value.enabled)
  
  const currentProvider = computed(() => AI_PROVIDERS[provider.value])
  
  const isConfigured = computed(() => {
    if (!isEnabled.value) return false
    const currentApiKey = apiKeys.value[provider.value]
    return currentApiKey && 
           !currentApiKey.includes('your_') && 
           !currentApiKey.includes('_here') &&
           currentApiKey.length > 10
  })
  
  const configuredProviders = computed(() => {
    return Object.keys(AI_PROVIDERS).filter(name => {
      const key = apiKeys.value[name]
      return key && !key.includes('your_') && !key.includes('_here') && key.length > 10
    })
  })
  
  const validationStatus = computed(() => {
    if (!isEnabled.value) {
      return { valid: true, message: 'AI features are disabled', type: 'info' }
    }
    
    if (!isConfigured.value) {
      return { 
        valid: false, 
        message: `Missing API key for ${currentProvider.value?.name || provider.value}`, 
        type: 'warning' 
      }
    }
    
    return { valid: true, message: 'AI configuration is valid', type: 'success' }
  })

  // Actions
  const initialize = () => {
    try {
      // Load from environment
      provider.value = AI_CONFIG.defaultProvider
      settings.value = {
        enabled: AI_CONFIG.enabled,
        maxTokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        debug: AI_CONFIG.debug
      }
      apiKeys.value = {
        openai: AI_CONFIG.providers.openai.apiKey,
        anthropic: AI_CONFIG.providers.anthropic.apiKey
      }
      
      isInitialized.value = true
      lastError.value = null
      
      // ALWAYS log for debugging
      console.log('🤖 AI Config Store initialized:', {
        provider: provider.value,
        enabled: settings.value.enabled,
        configured: isConfigured.value,
        configuredProviders: configuredProviders.value,
        apiKeys: {
          openai: apiKeys.value.openai ? `${apiKeys.value.openai.substring(0, 10)}...` : 'NOT SET',
          anthropic: apiKeys.value.anthropic ? `${apiKeys.value.anthropic.substring(0, 10)}...` : 'NOT SET'
        }
      })
    } catch (error) {
      lastError.value = error.message
      console.error('🤖 Failed to initialize AI config store:', error)
    }
  }

  const setProvider = (newProvider) => {
    if (!AI_PROVIDERS[newProvider]) {
      throw new Error(`Unknown AI provider: ${newProvider}`)
    }
    provider.value = newProvider
    console.log(`🤖 AI provider changed to: ${newProvider}`)
  }

  const setApiKey = (providerName, key) => {
    if (!AI_PROVIDERS[providerName]) {
      throw new Error(`Unknown AI provider: ${providerName}`)
    }
    
    // Basic validation
    if (!key || key.includes('your_') || key.includes('_here')) {
      throw new Error('Invalid API key format')
    }
    
    apiKeys.value[providerName] = key
    console.log(`🤖 API key updated for ${providerName}`)
  }

  const updateSettings = (newSettings) => {
    settings.value = { ...settings.value, ...newSettings }
    console.log('🤖 AI settings updated:', newSettings)
  }

  const enableAI = () => {
    settings.value.enabled = true
    console.log('🤖 AI features enabled')
  }

  const disableAI = () => {
    settings.value.enabled = false
    console.log('🤖 AI features disabled')
  }

  const toggleAI = () => {
    settings.value.enabled ? disableAI() : enableAI()
  }

  const clearError = () => {
    lastError.value = null
  }

  const getProviderInfo = (providerName) => {
    return AI_PROVIDERS[providerName] || null
  }

  const getCurrentProviderInfo = () => {
    return getProviderInfo(provider.value)
  }

  const getEnvironmentSetup = () => {
    return ENVIRONMENT_SETUP
  }

  const exportConfig = () => {
    return {
      provider: provider.value,
      settings: settings.value,
      // Don't export API keys for security
      configuredProviders: configuredProviders.value,
      timestamp: new Date().toISOString()
    }
  }

  const resetToDefaults = () => {
    provider.value = 'openai'
    settings.value = {
      enabled: false,
      maxTokens: 2000,
      temperature: 0.7,
      debug: false
    }
    // Don't reset API keys for security
    console.log('🤖 AI configuration reset to defaults')
  }

  // Development helpers
  const getDebugInfo = () => {
    return {
      ...exportConfig(),
      validation: validationStatus.value,
      environment: {
        hasOpenAIKey: !!apiKeys.value.openai && !apiKeys.value.openai.includes('your_'),
        hasAnthropicKey: !!apiKeys.value.anthropic && !apiKeys.value.anthropic.includes('your_'),
        providers: Object.keys(AI_PROVIDERS)
      }
    }
  }

  // Auto-initialize
  initialize()

  return {
    // State
    provider,
    apiKeys,
    settings,
    isInitialized,
    lastError,

    // Computed
    isEnabled,
    currentProvider,
    isConfigured,
    configuredProviders,
    validationStatus,

    // Actions
    initialize,
    setProvider,
    setApiKey,
    updateSettings,
    enableAI,
    disableAI,
    toggleAI,
    clearError,
    getProviderInfo,
    getCurrentProviderInfo,
    getEnvironmentSetup,
    exportConfig,
    resetToDefaults,
    getDebugInfo
  }
})

