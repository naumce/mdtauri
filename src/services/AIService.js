/**
 * AI Service for MD Creator Tauri App
 * Ported from @renderer with security enhancements
 * Supports OpenAI and Anthropic providers
 */

import { AI_CONFIG } from '../config/aiConfig.js'

/**
 * Base AI Provider Interface
 */
export class AIProvider {
  constructor(name, config) {
    this.name = name
    this.config = config
    this.requestCount = 0
    this.lastRequestTime = 0
  }

  async generateContent(prompt, options = {}) {
    throw new Error('generateContent must be implemented by provider')
  }

  async generateMermaidDiagram(description) {
    throw new Error('generateMermaidDiagram must be implemented by provider')
  }

  async validateDiagram(content, diagramType) {
    throw new Error('validateDiagram must be implemented by provider')
  }

  isConfigured() {
    return !!(this.config.apiKey && 
              !this.config.apiKey.includes('your_') && 
              !this.config.apiKey.includes('_here'))
  }

  // Rate limiting
  async checkRateLimit() {
    const now = Date.now()
    const timeWindow = 60000 // 1 minute
    
    if (now - this.lastRequestTime < timeWindow && this.requestCount >= AI_CONFIG.rateLimit) {
      throw new Error(`Rate limit exceeded. Maximum ${AI_CONFIG.rateLimit} requests per minute.`)
    }
    
    if (now - this.lastRequestTime >= timeWindow) {
      this.requestCount = 0
    }
    
    this.requestCount++
    this.lastRequestTime = now
  }

  // Sanitize errors (remove API keys)
  sanitizeError(error) {
    let message = error.message || error.toString()
    
    // Remove potential API keys from error messages
    message = message.replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***')
    message = message.replace(/claude-[a-zA-Z0-9-]+/g, 'claude-***')
    
    return message
  }
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends AIProvider {
  constructor(config) {
    super('OpenAI', config)
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  }

  async generateContent(prompt, options = {}) {
    await this.checkRateLimit()

    const {
      temperature = AI_CONFIG.temperature,
      maxTokens = AI_CONFIG.maxTokens,
      model = this.config.defaultModel || 'gpt-4',
      systemPrompt = 'You are a professional technical writer helping create high-quality documentation.'
    } = options

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
      // Note: timeout is handled client-side with AbortController, not sent to OpenAI API
    }

    if (AI_CONFIG.debug) {
      console.log('🤖 OpenAI Request:', {
        model,
        temperature,
        maxTokens,
        promptLength: prompt.length
      })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout)

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.choices[0]?.message?.content || ''

      if (AI_CONFIG.debug) {
        console.log('🤖 OpenAI Response:', {
          tokensUsed: data.usage?.total_tokens || 0,
          resultLength: result.length
        })
      }

      return result

    } catch (error) {
      const sanitizedError = this.sanitizeError(error)
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      
      console.error('🤖 OpenAI Error:', sanitizedError)
      throw new Error(`OpenAI generation failed: ${sanitizedError}`)
    }
  }

  async generateMermaidDiagram(description) {
    const prompt = `Create a Mermaid diagram for: ${description}

Requirements:
- Return ONLY the Mermaid code, no explanations
- Use proper Mermaid syntax
- Choose the most appropriate diagram type (flowchart, sequence, class, etc.)
- Keep it clean and readable
- Use meaningful node IDs and labels

Examples of good Mermaid syntax:
- flowchart TD for top-down flowcharts
- sequenceDiagram for sequence diagrams
- classDiagram for class diagrams
- graph LR for left-right graphs

Generate the diagram:`

    try {
      const result = await this.generateContent(prompt, {
        systemPrompt: 'You are an expert at creating Mermaid diagrams. Generate only valid Mermaid syntax.',
        temperature: 0.3, // Lower temperature for more consistent syntax
        maxTokens: 1000
      })

      // Clean up the response
      let cleanCode = result.trim()
      
      // Remove markdown code blocks if present
      cleanCode = cleanCode.replace(/```mermaid\n?/g, '')
      cleanCode = cleanCode.replace(/```\n?/g, '')
      cleanCode = cleanCode.trim()

      if (AI_CONFIG.debug) {
        console.log('🤖 Generated Mermaid:', cleanCode)
      }

      return cleanCode

    } catch (error) {
      console.error('🤖 Mermaid generation failed:', error)
      throw error
    }
  }

  async validateDiagram(content, diagramType) {
    const prompt = `Validate this ${diagramType} diagram and suggest improvements:

\`\`\`
${content}
\`\`\`

Please analyze:
1. Syntax correctness
2. Best practices
3. Potential improvements
4. Common errors

Return a JSON response with:
{
  "isValid": boolean,
  "errors": ["error1", "error2"],
  "warnings": ["warning1", "warning2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "correctedCode": "fixed version if needed"
}`

    try {
      const result = await this.generateContent(prompt, {
        systemPrompt: 'You are a Mermaid diagram expert. Analyze diagrams and provide structured feedback in JSON format.',
        temperature: 0.2,
        maxTokens: 1500
      })

      // Try to parse JSON response
      try {
        return JSON.parse(result.trim())
      } catch (parseError) {
        // Fallback if AI doesn't return valid JSON
        return {
          isValid: false,
          errors: ['Failed to parse validation response'],
          warnings: [],
          suggestions: ['Please check diagram syntax manually'],
          correctedCode: null
        }
      }

    } catch (error) {
      console.error('🤖 Diagram validation failed:', error)
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        suggestions: ['Please check your API configuration'],
        correctedCode: null
      }
    }
  }
}

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider extends AIProvider {
  constructor(config) {
    super('Anthropic', config)
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com'
  }

  async generateContent(prompt, options = {}) {
    await this.checkRateLimit()

    const {
      temperature = AI_CONFIG.temperature,
      maxTokens = AI_CONFIG.maxTokens,
      model = this.config.defaultModel || 'claude-3-sonnet-20240229',
      systemPrompt = 'You are a professional technical writer helping create high-quality documentation.'
    } = options

    const requestBody = {
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    }

    if (AI_CONFIG.debug) {
      console.log('🤖 Anthropic Request:', {
        model,
        temperature,
        maxTokens,
        promptLength: prompt.length
      })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout)

      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.content[0]?.text || ''

      if (AI_CONFIG.debug) {
        console.log('🤖 Anthropic Response:', {
          tokensUsed: data.usage?.output_tokens || 0,
          resultLength: result.length
        })
      }

      return result

    } catch (error) {
      const sanitizedError = this.sanitizeError(error)
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      
      console.error('🤖 Anthropic Error:', sanitizedError)
      throw new Error(`Anthropic generation failed: ${sanitizedError}`)
    }
  }

  async generateMermaidDiagram(description) {
    // Use the same logic as OpenAI but with Anthropic
    const prompt = `Create a Mermaid diagram for: ${description}

Requirements:
- Return ONLY the Mermaid code, no explanations
- Use proper Mermaid syntax
- Choose the most appropriate diagram type
- Keep it clean and readable

Generate the diagram:`

    try {
      const result = await this.generateContent(prompt, {
        systemPrompt: 'You are an expert at creating Mermaid diagrams. Generate only valid Mermaid syntax.',
        temperature: 0.3,
        maxTokens: 1000
      })

      let cleanCode = result.trim()
      cleanCode = cleanCode.replace(/```mermaid\n?/g, '')
      cleanCode = cleanCode.replace(/```\n?/g, '')
      cleanCode = cleanCode.trim()

      return cleanCode

    } catch (error) {
      console.error('🤖 Anthropic Mermaid generation failed:', error)
      throw error
    }
  }

  async validateDiagram(content, diagramType) {
    // Similar to OpenAI implementation
    const prompt = `Validate this ${diagramType} diagram:

\`\`\`
${content}
\`\`\`

Return JSON with validation results including isValid, errors, warnings, suggestions, and correctedCode if needed.`

    try {
      const result = await this.generateContent(prompt, {
        systemPrompt: 'You are a Mermaid diagram expert. Return structured JSON validation feedback.',
        temperature: 0.2,
        maxTokens: 1500
      })

      try {
        return JSON.parse(result.trim())
      } catch (parseError) {
        return {
          isValid: false,
          errors: ['Failed to parse validation response'],
          warnings: [],
          suggestions: ['Please check diagram syntax manually'],
          correctedCode: null
        }
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        suggestions: ['Please check your API configuration'],
        correctedCode: null
      }
    }
  }
}

/**
 * Main AI Service Class
 */
export class AIService {
  constructor() {
    this.providers = {}
    this.currentProvider = null
    this.initialized = false
  }

  initialize() {
    if (this.initialized) return

    // Initialize providers based on configuration
    if (AI_CONFIG.providers.openai.apiKey) {
      this.providers.openai = new OpenAIProvider(AI_CONFIG.providers.openai)
    }

    if (AI_CONFIG.providers.anthropic.apiKey) {
      this.providers.anthropic = new AnthropicProvider(AI_CONFIG.providers.anthropic)
    }

    // Set current provider
    this.currentProvider = this.providers[AI_CONFIG.defaultProvider] || 
                           Object.values(this.providers)[0] || 
                           null

    this.initialized = true

    if (AI_CONFIG.debug) {
      console.log('🤖 AI Service initialized:', {
        providers: Object.keys(this.providers),
        currentProvider: this.currentProvider?.name || 'none',
        configured: this.isConfigured()
      })
    }
  }

  isConfigured() {
    return this.currentProvider && this.currentProvider.isConfigured()
  }

  getCurrentProvider() {
    return this.currentProvider?.name || 'none'
  }

  setProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`Provider '${providerName}' not available`)
    }

    this.currentProvider = this.providers[providerName]
    
    if (AI_CONFIG.debug) {
      console.log(`🤖 Switched to provider: ${providerName}`)
    }
  }

  // Delegate methods to current provider
  async generateContent(prompt, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured. Please add your API key.')
    }

    return await this.currentProvider.generateContent(prompt, options)
  }

  async generateMermaidDiagram(description) {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured. Please add your API key.')
    }

    return await this.currentProvider.generateMermaidDiagram(description)
  }

  async validateDiagram(content, diagramType) {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured. Please add your API key.')
    }

    return await this.currentProvider.validateDiagram(content, diagramType)
  }

  // Service status
  getStatus() {
    return {
      initialized: this.initialized,
      configured: this.isConfigured(),
      currentProvider: this.getCurrentProvider(),
      availableProviders: Object.keys(this.providers),
      aiEnabled: AI_CONFIG.enabled
    }
  }
}

// Create singleton instance
export const aiService = new AIService()

// Auto-initialize if AI is enabled
if (AI_CONFIG.enabled) {
  aiService.initialize()
}

