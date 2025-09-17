/**
 * useAI Composable - Reactive AI Functionality
 * Ported from @renderer with Vue 3 Composition API
 * Provides reactive AI state and methods for components
 */

import { ref, computed, reactive, watch } from 'vue'
import { aiService } from '../services/AIService.js'
import { useAiConfigStore } from '../stores/aiConfig.js'

/**
 * AI Generation State
 */
const createGenerationState = () => reactive({
  isGenerating: false,
  progress: 0,
  stage: '',
  error: null,
  lastResult: null,
  tokensUsed: 0,
  cost: 0
})

/**
 * Main useAI Composable
 */
export function useAI() {
  // Get AI config store
  const aiConfigStore = useAiConfigStore()
  
  // Generation states for different AI features
  const contentGeneration = createGenerationState()
  const mermaidGeneration = createGenerationState()
  const validation = createGenerationState()
  const mindmapGeneration = createGenerationState()

  // Global AI state
  const isAnyGenerating = computed(() => 
    contentGeneration.isGenerating || 
    mermaidGeneration.isGenerating || 
    validation.isGenerating || 
    mindmapGeneration.isGenerating
  )

  const totalTokensUsed = computed(() => 
    contentGeneration.tokensUsed + 
    mermaidGeneration.tokensUsed + 
    validation.tokensUsed + 
    mindmapGeneration.tokensUsed
  )

  const totalCost = computed(() => 
    contentGeneration.cost + 
    mermaidGeneration.cost + 
    validation.cost + 
    mindmapGeneration.cost
  )

  // Service status
  const serviceStatus = computed(() => aiService.getStatus())
  const isConfigured = computed(() => aiConfigStore.isConfigured)
  const currentProvider = computed(() => aiConfigStore.currentProvider?.name || 'none')

  /**
   * Generic generation wrapper with state management
   */
  const withGeneration = async (state, generationFn, options = {}) => {
    if (state.isGenerating) {
      throw new Error('Generation already in progress')
    }

    if (!isConfigured.value) {
      throw new Error('AI not configured. Please add your API key in settings.')
    }

    state.isGenerating = true
    state.progress = 0
    state.stage = options.initialStage || 'Initializing...'
    state.error = null
    state.lastResult = null

    try {
      // Update progress
      state.progress = 25
      state.stage = options.processingStage || 'Processing...'

      const result = await generationFn()

      state.progress = 75
      state.stage = 'Finalizing...'

      // Simulate final processing
      await new Promise(resolve => setTimeout(resolve, 200))

      state.progress = 100
      state.stage = 'Complete'
      state.lastResult = result
      state.error = null

      // Estimate tokens and cost (basic estimation)
      const estimatedTokens = Math.ceil((JSON.stringify(result).length) / 4)
      state.tokensUsed += estimatedTokens
      state.cost += estimatedTokens * 0.002 // Rough estimate

      return result

    } catch (error) {
      state.error = error.message || 'Unknown error occurred'
      state.stage = 'Error'
      state.progress = 0
      console.error('🤖 AI Generation Error:', error)
      throw error

    } finally {
      state.isGenerating = false
      
      // Auto-clear completed state after 3 seconds
      if (!state.error) {
        setTimeout(() => {
          state.progress = 0
          state.stage = ''
        }, 3000)
      }
    }
  }

  /**
   * Content Generation
   */
  const generateContent = async (prompt, options = {}) => {
    return await withGeneration(
      contentGeneration,
      () => aiService.generateContent(prompt, options),
      {
        initialStage: 'Analyzing content...',
        processingStage: 'Generating content...'
      }
    )
  }

  /**
   * Mermaid Diagram Generation
   */
  const generateMermaidDiagram = async (description, options = {}) => {
    return await withGeneration(
      mermaidGeneration,
      () => aiService.generateMermaidDiagram(description),
      {
        initialStage: 'Understanding requirements...',
        processingStage: 'Creating diagram...'
      }
    )
  }

  /**
   * Enhanced Mermaid Generation with Templates
   */
  const generateMermaidWithTemplate = async (description, template = 'auto') => {
    const templates = {
      flowchart: 'Create a flowchart diagram showing the process flow',
      sequence: 'Create a sequence diagram showing interactions over time',
      class: 'Create a class diagram showing relationships and structure',
      mindmap: 'Create a mindmap diagram showing hierarchical concepts',
      journey: 'Create a user journey diagram showing user experience',
      gitgraph: 'Create a git graph showing branch and merge flow',
      timeline: 'Create a timeline diagram showing events over time'
    }

    const templatePrompt = templates[template] || 'Create the most appropriate diagram type'
    const fullDescription = `${templatePrompt} for: ${description}`

    return await generateMermaidDiagram(fullDescription)
  }

  /**
   * Mermaid Validation and Auto-Fix
   */
  const validateAndFixMermaid = async (content, diagramType = 'mermaid') => {
    return await withGeneration(
      validation,
      () => aiService.validateDiagram(content, diagramType),
      {
        initialStage: 'Analyzing diagram syntax...',
        processingStage: 'Validating and fixing...'
      }
    )
  }

  /**
   * Intelligent Mermaid Auto-Fix
   */
  const autoFixMermaidDiagram = async (brokenContent) => {
    try {
      const validationResult = await validateAndFixMermaid(brokenContent)
      
      if (validationResult.isValid) {
        return {
          fixed: false,
          originalWasValid: true,
          content: brokenContent,
          message: 'Diagram is already valid!'
        }
      }

      if (validationResult.correctedCode) {
        return {
          fixed: true,
          originalWasValid: false,
          content: validationResult.correctedCode,
          errors: validationResult.errors,
          suggestions: validationResult.suggestions,
          message: 'Diagram fixed successfully!'
        }
      }

      // If no auto-fix available, provide manual suggestions
      return {
        fixed: false,
        originalWasValid: false,
        content: brokenContent,
        errors: validationResult.errors,
        suggestions: validationResult.suggestions,
        message: 'Could not auto-fix. Please check the suggestions.'
      }

    } catch (error) {
      throw new Error(`Auto-fix failed: ${error.message}`)
    }
  }

  /**
   * AI-Powered Mindmap Generation
   */
  const generateAIMindmap = async (description, options = {}) => {
    const {
      template = 'project',
      maxNodes = 15,
      includeDetails = true
    } = options

    const templates = {
      project: 'Create a project structure mindmap with phases, tasks, and deliverables',
      concept: 'Create a concept mindmap showing relationships and hierarchies',
      process: 'Create a process mindmap showing workflow and decision points',
      learning: 'Create a learning mindmap for educational content',
      business: 'Create a business strategy mindmap with goals and actions',
      technical: 'Create a technical architecture mindmap with components'
    }

    const templatePrompt = templates[template] || templates.project
    
    const prompt = `${templatePrompt} for: ${description}

Generate a mindmap structure with:
- Maximum ${maxNodes} nodes
- Clear hierarchical relationships
- ${includeDetails ? 'Detailed descriptions for each node' : 'Concise node labels'}

Return JSON format:
{
  "title": "Mindmap Title",
  "nodes": [
    {
      "id": "unique_id",
      "text": "Node Text",
      "level": 0,
      "parent": null,
      "description": "Optional description",
      "type": "concept|task|milestone|note"
    }
  ],
  "connections": [
    {
      "from": "parent_id",
      "to": "child_id",
      "type": "hierarchy|association|flow"
    }
  ]
}`

    return await withGeneration(
      mindmapGeneration,
      async () => {
        const result = await aiService.generateContent(prompt, {
          systemPrompt: 'You are an expert at creating structured mindmaps. Return only valid JSON.',
          temperature: 0.7,
          maxTokens: 2000
        })

        try {
          return JSON.parse(result.trim())
        } catch (parseError) {
          throw new Error('Failed to parse mindmap JSON. Please try again.')
        }
      },
      {
        initialStage: 'Analyzing concept...',
        processingStage: 'Building mindmap structure...'
      }
    )
  }

  /**
   * Table Generation
   */
  const generateTable = async (description, options = {}) => {
    const {
      columns = 3,
      rows = 5,
      format = 'markdown'
    } = options

    const prompt = `Create a ${format} table for: ${description}

Requirements:
- ${columns} columns
- ${rows} rows (including header)
- Relevant data and examples
- Professional formatting

Return only the table, no explanations.`

    return await withGeneration(
      contentGeneration,
      () => aiService.generateContent(prompt, {
        systemPrompt: 'You are an expert at creating well-structured tables with relevant data.',
        temperature: 0.5,
        maxTokens: 1000
      }),
      {
        initialStage: 'Planning table structure...',
        processingStage: 'Generating table data...'
      }
    )
  }

  /**
   * Document Structure Generation
   */
  const generateDocumentStructure = async (topic, options = {}) => {
    const {
      type = 'technical',
      sections = 8,
      includeSubsections = true
    } = options

    const prompt = `Create a document structure for: ${topic}

Document Type: ${type}
Sections: ${sections}
Include Subsections: ${includeSubsections}

Return markdown outline with:
- Clear hierarchy (# ## ###)
- Descriptive section titles
- Brief content descriptions
- Logical flow

Generate the structure:`

    return await withGeneration(
      contentGeneration,
      () => aiService.generateContent(prompt, {
        systemPrompt: 'You are a professional technical writer. Create clear, logical document structures.',
        temperature: 0.6,
        maxTokens: 1500
      }),
      {
        initialStage: 'Analyzing topic...',
        processingStage: 'Creating structure...'
      }
    )
  }

  /**
   * Clear all generation states
   */
  const clearAllStates = () => {
    [contentGeneration, mermaidGeneration, validation, mindmapGeneration].forEach(state => {
      state.isGenerating = false
      state.progress = 0
      state.stage = ''
      state.error = null
      state.lastResult = null
    })
  }

  /**
   * Clear errors
   */
  const clearErrors = () => {
    [contentGeneration, mermaidGeneration, validation, mindmapGeneration].forEach(state => {
      state.error = null
    })
  }

  /**
   * Get available diagram templates
   */
  const getAvailableTemplates = () => [
    { id: 'auto', name: 'Auto-detect', description: 'Automatically choose the best diagram type' },
    { id: 'flowchart', name: 'Flowchart', description: 'Process flows and decision trees' },
    { id: 'sequence', name: 'Sequence', description: 'Interactions over time' },
    { id: 'class', name: 'Class Diagram', description: 'Object relationships and structure' },
    { id: 'mindmap', name: 'Mindmap', description: 'Hierarchical concept maps' },
    { id: 'journey', name: 'User Journey', description: 'User experience flows' },
    { id: 'gitgraph', name: 'Git Graph', description: 'Branch and merge workflows' },
    { id: 'timeline', name: 'Timeline', description: 'Events over time' }
  ]

  /**
   * Get mindmap templates
   */
  const getMindmapTemplates = () => [
    { id: 'project', name: 'Project Structure', description: 'Project phases and deliverables' },
    { id: 'concept', name: 'Concept Map', description: 'Ideas and relationships' },
    { id: 'process', name: 'Process Flow', description: 'Workflow and decisions' },
    { id: 'learning', name: 'Learning Map', description: 'Educational content structure' },
    { id: 'business', name: 'Business Strategy', description: 'Goals and action plans' },
    { id: 'technical', name: 'Technical Architecture', description: 'System components' }
  ]

  // Initialize AI service when composable is used
  if (!aiService.initialized && aiConfigStore.isEnabled) {
    aiService.initialize()
  }

  // Watch for config changes and re-initialize
  watch(() => aiConfigStore.isEnabled, (enabled) => {
    if (enabled && !aiService.initialized) {
      aiService.initialize()
    }
  })

  return {
    // State
    contentGeneration,
    mermaidGeneration,
    validation,
    mindmapGeneration,

    // Computed
    isAnyGenerating,
    totalTokensUsed,
    totalCost,
    serviceStatus,
    isConfigured,
    currentProvider,

    // Methods - Content
    generateContent,
    generateTable,
    generateDocumentStructure,

    // Methods - Mermaid
    generateMermaidDiagram,
    generateMermaidWithTemplate,
    validateAndFixMermaid,
    autoFixMermaidDiagram,

    // Methods - Mindmap
    generateAIMindmap,

    // Methods - Utilities
    clearAllStates,
    clearErrors,
    getAvailableTemplates,
    getMindmapTemplates,

    // Config access
    aiConfigStore
  }
}

/**
 * Specific composables for focused use cases
 */

/**
 * useMermaidAI - Focused on Mermaid diagram functionality
 */
export function useMermaidAI() {
  const {
    mermaidGeneration,
    validation,
    generateMermaidDiagram,
    generateMermaidWithTemplate,
    validateAndFixMermaid,
    autoFixMermaidDiagram,
    getAvailableTemplates,
    isConfigured
  } = useAI()

  return {
    generation: mermaidGeneration,
    validation,
    generateDiagram: generateMermaidDiagram,
    generateWithTemplate: generateMermaidWithTemplate,
    validateAndFix: validateAndFixMermaid,
    autoFix: autoFixMermaidDiagram,
    getTemplates: getAvailableTemplates,
    isConfigured
  }
}

/**
 * useMindmapAI - Focused on AI mindmap generation
 */
export function useMindmapAI() {
  const {
    mindmapGeneration,
    generateAIMindmap,
    getMindmapTemplates,
    isConfigured
  } = useAI()

  return {
    generation: mindmapGeneration,
    generateMindmap: generateAIMindmap,
    getTemplates: getMindmapTemplates,
    isConfigured
  }
}

