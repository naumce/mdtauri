import { ref, computed, readonly } from 'vue'
import { MindmapGenerator } from '../services/MindmapGenerator.js'

/**
 * useMindmap - Vue composable for mindmap functionality
 * Provides mindmap generation, state management, and export capabilities
 */
export function useMindmap() {
  // State
  const mindmapData = ref(null)
  const isGenerating = ref(false)
  const error = ref(null)
  const selectedText = ref('')
  const generator = new MindmapGenerator()

  // Computed properties
  const hasMindmap = computed(() => !!mindmapData.value && mindmapData.value.nodes.length > 0)
  const nodeCount = computed(() => mindmapData.value?.nodes.length || 0)
  const hasSelection = computed(() => selectedText.value.trim().length > 0)

  /**
   * Generate mindmap from document headings
   */
  const generateFromHeadings = async (content) => {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      error.value = 'No content to generate mindmap from'
      return null
    }

    console.log('🧠 useMindmap: Generating from headings')
    isGenerating.value = true
    error.value = null

    try {
      const result = generator.generateFromHeadings(content)
      mindmapData.value = result
      
      console.log('🧠 useMindmap: Generated successfully', { nodeCount: result.nodes.length })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed'
      error.value = errorMessage
      console.error('🧠 useMindmap: Generation failed:', errorMessage)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Generate mindmap from selected text
   */
  const generateFromSelection = async (text) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      error.value = 'No text selected'
      return null
    }

    console.log('🧠 useMindmap: Generating from selection')
    isGenerating.value = true
    error.value = null

    try {
      const result = generator.generateFromSelection(text)
      mindmapData.value = result
      
      console.log('🧠 useMindmap: Selection mindmap generated', { nodeCount: result.nodes.length })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed'
      error.value = errorMessage
      console.error('🧠 useMindmap: Selection generation failed:', errorMessage)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Set selected text for mindmap generation
   */
  const setSelectedText = (text) => {
    selectedText.value = text || ''
  }

  /**
   * Clear mindmap data
   */
  const clearMindmap = () => {
    mindmapData.value = null
    error.value = null
  }

  /**
   * Export mindmap as Mermaid flowchart
   */
  const exportAsFlowchart = () => {
    if (!hasMindmap.value) {
      throw new Error('No mindmap to export')
    }
    return generator.toMermaidFlowchart(mindmapData.value)
  }

  /**
   * Export mindmap as Mermaid mindmap
   */
  const exportAsMindmap = () => {
    if (!hasMindmap.value) {
      throw new Error('No mindmap to export')
    }
    return generator.toMermaidMindmap(mindmapData.value)
  }

  /**
   * Export mindmap as JSON
   */
  const exportAsJson = () => {
    if (!hasMindmap.value) {
      throw new Error('No mindmap to export')
    }
    return generator.exportAsJson(mindmapData.value)
  }

  /**
   * Download mindmap in specified format
   */
  const downloadMindmap = (format) => {
    if (!mindmapData.value) {
      console.error('No mindmap data to download')
      return
    }

    try {
      let content, filename, mimeType
      
      switch (format) {
        case 'json':
          content = JSON.stringify(mindmapData.value, null, 2)
          filename = 'mindmap.json'
          mimeType = 'application/json'
          break
          
        case 'flowchart':
        case 'mindmap':
        case 'graph':
        case 'sequence':
        case 'class':
          content = generator.exportMindmap(mindmapData.value, format)
          filename = `mindmap.${format}.md`
          mimeType = 'text/markdown'
          break
          
        case 'markdown':
          content = generator.toMarkdown(mindmapData.value)
          filename = 'mindmap.md'
          mimeType = 'text/markdown'
          break
          
        default:
          console.error('Unsupported export format:', format)
          return
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log(`✅ Mindmap exported as ${format}`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  /**
   * Get available export formats
   */
  const getExportFormats = () => {
    return generator.getExportFormats()
  }

  /**
   * Insert mindmap into document in specified format
   */
  const insertIntoDocument = (format = 'flowchart') => {
    if (!mindmapData.value) {
      console.error('No mindmap data to insert')
      return ''
    }

    try {
      let mermaidCode
      
      switch (format) {
        case 'flowchart':
        case 'mindmap':
        case 'graph':
        case 'sequence':
        case 'class':
          mermaidCode = generator.exportMindmap(mindmapData.value, format)
          break
          
        default:
          mermaidCode = generator.exportMindmap(mindmapData.value, 'flowchart')
      }

      // Wrap in Mermaid code block
      return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``
    } catch (error) {
      console.error('Insert failed:', error)
      return ''
    }
  }

  return {
    // State
    mindmapData,
    isGenerating,
    error,
    selectedText,
    hasMindmap,
    nodeCount,
    hasSelection,
    
    // Methods
    generateFromHeadings,
    generateFromSelection,
    setSelectedText,
    clearMindmap,
    downloadMindmap,
    insertIntoDocument,
    getExportFormats
  }
}
