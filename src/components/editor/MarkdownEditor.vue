<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDocumentsStore } from '../../stores/documents.js'
import { useMermaidAI } from '../../composables/useAI.js'
import MermaidAIModal from '../AIGeneration/MermaidAIModal.vue'
import MarkdownIt from 'markdown-it'
import mermaid from 'mermaid'

// Initialize Mermaid with proper configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  logLevel: 'error',
  suppressErrors: true, // Suppress parsing errors
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  sequence: {
    useMaxWidth: true,
    showSequenceNumbers: false,
    actorMargin: 150,
    mirrorActors: false,
    wrap: true,
    diagramMarginX: 70,
    diagramMarginY: 30,
    height: 40,
    boxMargin: 10,
    boxTextMargin: 5
  }
})

const props = defineProps({
  document: {
    type: Object,
    required: true
  }
})

const documentsStore = useDocumentsStore()

// AI Composable for Mermaid functionality
const mermaidAI = useMermaidAI()

// Initialize markdown parser with proper mermaid handling (following original renderer pattern)
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // CRITICAL: Use breaks: true like the original renderer
  highlight: function (str, lang) {
    // Don't highlight mermaid - we'll handle it separately
    if (lang === 'mermaid') {
      return str
    }
    
    // For other languages, return as-is (no syntax highlighting for now)
    return str
  }
})

// CRITICAL: Don't override the fence renderer - let MarkdownIt handle it naturally
// This is the key difference from your current implementation

// Re-introduce pre-processing for unfenced mermaid diagrams
const preprocessMermaidContent = (content) => {
  if (!content) return ''
  const trimmedContent = content.trim()

  // Check if it looks like a mermaid diagram but isn't fenced
  const mermaidKeywords = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitgraph', 'C4Context', 'mindmap']
  const startsWithMermaidKeyword = mermaidKeywords.some(keyword => trimmedContent.startsWith(keyword))
  const isFenced = trimmedContent.startsWith('```mermaid')

  if (startsWithMermaidKeyword && !isFenced) {
    return '```mermaid\n' + trimmedContent + '\n```'
  }
  return content
}

// CRITICAL: Remove debug parsing - let MarkdownIt work naturally
// The original renderer doesn't override the parse method



// Local state
const isPreviewMode = ref(false)
const showToolbar = ref(true)
const showTableEditor = ref(false)
const tableRows = ref(3)
const tableCols = ref(3)

// AI Mermaid state
const showMermaidAI = ref(false)
const mermaidContextMenu = ref({ visible: false, x: 0, y: 0, diagramCode: '', diagramIndex: -1 })
const enhanceMode = ref(false)
const currentDiagramCode = ref('')

// Mermaid error state
const mermaidErrors = ref(new Map()) // Track errors by diagram index
const showFixModal = ref(false)
const currentErrorData = ref({ code: '', error: '', element: null, index: -1 })

// View modes: 'edit', 'preview', 'split'
const viewMode = ref('edit')
const splitDividerPosition = ref(50) // percentage
const isDraggingDivider = ref(false)

// Refs
const editorTextarea = ref(null)
const splitContainer = ref(null)

// Computed
const document = computed(() => props.document)

const htmlContent = computed(() => {
  if (!document.value?.content) return ''
  
  // Apply pre-processing to automatically wrap unfenced mermaid diagrams
  const processedContent = preprocessMermaidContent(document.value.content)
  return md.render(processedContent)
})

// Function to render mermaid diagrams (following original renderer pattern)
const renderMermaidDiagrams = () => {
  nextTick(() => {
    // CRITICAL: Use the same selector as the original renderer
    const mermaidElements = window.document.querySelectorAll('.language-mermaid')
    
    if (mermaidElements.length === 0) {
      console.log('📊 No mermaid diagrams found')
      return
    }
    
    console.log('📊 Processing', mermaidElements.length, 'mermaid diagrams')
    // Process each mermaid diagram
    mermaidElements.forEach(async (element, index) => {
      await processSingleDiagram(element, index)
    })
  })
}

// Process a single mermaid diagram element (following original renderer pattern)
const processSingleDiagram = async (element, index) => {
  try {
    const code = element.textContent || ''
    console.log('📊 Processing diagram', index, 'with code length:', code.length)
    
    // Skip if already processed (has SVG content)
    if (element.querySelector('svg')) {
      console.log('📊 Diagram', index, 'already processed, skipping')
      return
    }
    
    // CRITICAL: Validate DOM element is still valid and attached
    if (!element.parentNode || !window.document.contains(element)) {
      console.error('📊 ❌ Element no longer in DOM, skipping render')
      return
    }
    
    // Create a unique ID for this diagram
    const id = `diagram-${Date.now()}-${index}`
    
    // CRITICAL: Use the same mermaid.render approach as the original renderer
    const { svg } = await mermaid.render(id, code)
    
    // CRITICAL: Double-check element is still valid before updating
    if (element && element.parentNode && window.document.contains(element)) {
      element.innerHTML = svg
      
      // Add context menu functionality to the diagram
      addDiagramContextMenu(element, code, index)
      
      console.log('📊 ✅ Diagram', index, 'processed successfully')
    } else {
      console.warn('📊 ⚠️ Element became invalid during render')
    }
    
  } catch (error) {
    console.error('📊 ❌ Error processing mermaid diagram:', error)
    
    // Get code safely (might not be defined if error occurred early)
    const safeCode = element.textContent || ''
    
    // Store error information for potential AI fixing
    console.log('🚨 Storing error data for diagram', index, {
      codeLength: safeCode.length,
      codePreview: safeCode.substring(0, 50) + '...',
      errorMessage: error.message
    })
    
    mermaidErrors.value.set(index, {
      code: safeCode,
      error: error.message,
      element: element
    })
    
    element.innerHTML = `<div class="mermaid-error">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <span class="error-title">Mermaid Syntax Error</span>
      </div>
      <p class="error-message">${error.message}</p>
      <div class="error-actions">
        <button class="fix-ai-btn" onclick="window.fixMermaidWithAI(${index})" ${!mermaidAI.isConfigured ? 'disabled title="AI not configured"' : ''}>
          🤖 Fix with AI
        </button>
        <details class="error-details">
          <summary>Show raw code</summary>
          <pre class="error-code">${code}</pre>
        </details>
      </div>
    </div>`
  }
}

const hasUnsavedChanges = computed(() => 
  document.value?.isDirty || false
)

const wordCount = computed(() => {
  if (!document.value?.content) return 0
  return document.value.content.trim().split(/\s+/).filter(word => word.length > 0).length
})

const lineCount = computed(() => {
  if (!document.value?.content) return 0
  return document.value.content.split('\n').length
})

const characterCount = computed(() => {
  return document.value?.content?.length || 0
})

// Methods
const updateContent = (newContent) => {
  if (document.value) {
    documentsStore.updateDocument(document.value.id, { content: newContent })
  }
}

const handleKeydown = (event) => {
  // Keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault()
        insertMarkdown('bold')
        break
      case 'i':
        event.preventDefault()
        insertMarkdown('italic')
        break
      case 'k':
        event.preventDefault()
        insertMarkdown('link')
        break
      case 's':
        event.preventDefault()
        saveDocument()
        break
    }
  }
  
  // View mode shortcuts (Ctrl+Shift+1/2/3)
  if (event.ctrlKey && event.shiftKey) {
    switch (event.key) {
      case '1':
        event.preventDefault()
        setViewMode('edit')
        break
      case '2':
        event.preventDefault()
        setViewMode('split')
        break
      case '3':
        event.preventDefault()
        setViewMode('preview')
        break
    }
  }
  
  // Tab key handling
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = event.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    if (event.shiftKey) {
      // Shift+Tab: Remove indentation
      const beforeCursor = textarea.value.substring(0, start)
      const afterCursor = textarea.value.substring(end)
      
      // Find the line start
      const lineStart = beforeCursor.lastIndexOf('\n') + 1
      const lineContent = textarea.value.substring(lineStart, start)
      
      if (lineContent.startsWith('  ')) {
        const newContent = textarea.value.substring(0, lineStart) + 
                          lineContent.substring(2) + 
                          textarea.value.substring(start)
        updateContent(newContent)
        nextTick(() => {
          textarea.setSelectionRange(start - 2, end - 2)
        })
      }
    } else {
      // Tab: Add indentation
      const newContent = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end)
      updateContent(newContent)
      nextTick(() => {
        textarea.setSelectionRange(start + 2, end + 2)
      })
    }
  }
}

const insertMarkdown = (syntax) => {
  if (!editorTextarea.value) return
  
  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = textarea.value.substring(start, end)
  
  let replacement = ''
  switch (syntax) {
    case 'bold':
      replacement = `**${selectedText || 'bold text'}**`
      break
    case 'italic':
      replacement = `*${selectedText || 'italic text'}*`
      break
    case 'code':
      replacement = `\`${selectedText || 'code'}\``
      break
    case 'link':
      replacement = `[${selectedText || 'link text'}](url)`
      break
    case 'image':
      replacement = `![${selectedText || 'alt text'}](image-url)`
      break
    case 'heading1':
      replacement = `# ${selectedText || 'Heading 1'}`
      break
    case 'heading2':
      replacement = `## ${selectedText || 'Heading 2'}`
      break
    case 'heading3':
      replacement = `### ${selectedText || 'Heading 3'}`
      break
    case 'list':
      replacement = `- ${selectedText || 'list item'}`
      break
    case 'numbered-list':
      replacement = `1. ${selectedText || 'list item'}`
      break
    case 'quote':
      replacement = `> ${selectedText || 'quote'}`
      break
    case 'code-block':
      replacement = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``
      break
    case 'horizontal-rule':
      replacement = `\n---\n`
      break
    case 'strikethrough':
      replacement = `~~${selectedText || 'strikethrough text'}~~`
      break
  }
  
  const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)
  updateContent(newContent)
  
  // Set cursor position
  nextTick(() => {
    textarea.focus()
    const newCursorPos = start + replacement.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

const insertTable = () => {
  if (!editorTextarea.value) return
  
  const textarea = editorTextarea.value
  const start = textarea.selectionStart
  
  // Generate table markdown
  let tableMarkdown = '\n'
  
  // Header row
  for (let i = 0; i < tableCols.value; i++) {
    tableMarkdown += `| Header ${i + 1} `
  }
  tableMarkdown += '|\n'
  
  // Separator row
  for (let i = 0; i < tableCols.value; i++) {
    tableMarkdown += '| --- '
  }
  tableMarkdown += '|\n'
  
  // Data rows
  for (let row = 0; row < tableRows.value; row++) {
    for (let col = 0; col < tableCols.value; col++) {
      tableMarkdown += `| Cell ${row + 1}-${col + 1} `
    }
    tableMarkdown += '|\n'
  }
  
  tableMarkdown += '\n'
  
  const newContent = textarea.value.substring(0, start) + tableMarkdown + textarea.value.substring(start)
  updateContent(newContent)
  
  // Close table editor
  showTableEditor.value = false
  
  // Set cursor position
  nextTick(() => {
    textarea.focus()
    const newCursorPos = start + tableMarkdown.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

const saveDocument = () => {
  if (document.value) {
    documentsStore.saveDocument(document.value.id)
  }
}

const toggleTableEditor = () => {
  showTableEditor.value = !showTableEditor.value
}

const setViewMode = (mode) => {
  viewMode.value = mode
  // Update the old preview mode for backward compatibility
  isPreviewMode.value = mode === 'preview'
  
  // Trigger mermaid rendering when switching to preview or split mode
  if (mode === 'preview' || mode === 'split') {
    setTimeout(() => {
      renderMermaidDiagrams()
    }, 200)
  }
}

const startDragDivider = (event) => {
  isDraggingDivider.value = true
  window.document.addEventListener('mousemove', handleDragDivider)
  window.document.addEventListener('mouseup', stopDragDivider)
  event.preventDefault()
}

const handleDragDivider = (event) => {
  if (!isDraggingDivider.value || !splitContainer.value) return
  
  const containerRect = splitContainer.value.getBoundingClientRect()
  const newPosition = ((event.clientX - containerRect.left) / containerRect.width) * 100
  
  // Limit the divider position between 20% and 80%
  splitDividerPosition.value = Math.max(20, Math.min(80, newPosition))
}

const stopDragDivider = () => {
  isDraggingDivider.value = false
  window.document.removeEventListener('mousemove', handleDragDivider)
  window.document.removeEventListener('mouseup', stopDragDivider)
}

// AI Mermaid Functions - Enhanced to ACTUALLY detect errors
const detectMermaidErrors = async () => {
  const content = document.value?.content || ''
  
  // Find all mermaid code blocks
  const mermaidBlocks = []
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g
  let match
  
  while ((match = mermaidRegex.exec(content)) !== null) {
    mermaidBlocks.push({
      fullMatch: match[0],
      code: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length
    })
  }
  
  if (mermaidBlocks.length === 0) {
    alert('No Mermaid diagrams found in the document.')
    return null
  }
  
  console.log('🔍 Found', mermaidBlocks.length, 'mermaid blocks, checking for errors...')
  
  // Test each block for actual syntax errors
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const block = mermaidBlocks[i]
    try {
      const testId = `error-detection-${Date.now()}-${i}`
      console.log('🧪 Testing block', i, 'for errors...')
      await mermaid.render(testId, block.code)
      console.log('✅ Block', i, 'is valid')
    } catch (error) {
      console.log('❌ Found error in block', i, ':', error.message)
      // Return the first block with errors
      return {
        ...block,
        error: error.message,
        blockIndex: i
      }
    }
  }
  
  console.log('✅ All mermaid blocks are valid - no errors detected')
  return null // No errors found
}

const autoFixMermaidDiagram = async () => {
  if (!mermaidAI.isConfigured) {
    alert('AI is not configured. Please set up your API key in settings.')
    return
  }

  console.log('🔧 Starting auto-fix process...')
  
  // Use our enhanced error detection (now async)
  const mermaidBlock = await detectMermaidErrors()
  
  if (!mermaidBlock) {
    alert('✅ No Mermaid diagram errors detected! All diagrams are valid.')
    return
  }
  
  console.log('🚨 Found error in mermaid block:', mermaidBlock.error)
  
  try {
    // Use our enhanced fix prompt instead of the old autoFix method
    const fixPrompt = `🚨 AUTO-FIX MERMAID SYNTAX ERROR 🚨

BROKEN MERMAID CODE:
${mermaidBlock.code}

ERROR: ${mermaidBlock.error}

Fix this syntax error and return ONLY the corrected Mermaid code (no explanations, no markdown formatting).

CORRECTED CODE:`

    console.log('🤖 Calling AI with enhanced prompt...')
    const fixedCode = await mermaidAI.generateContent(fixPrompt)
    
    if (!fixedCode || fixedCode.trim().length === 0) {
      throw new Error('AI returned empty response')
    }
    
    // Clean the response
    let cleanedCode = fixedCode.trim()
    if (cleanedCode.startsWith('```mermaid')) {
      cleanedCode = cleanedCode.replace(/^```mermaid\n/, '').replace(/\n```$/, '')
    }
    if (cleanedCode.startsWith('```')) {
      cleanedCode = cleanedCode.replace(/^```\n/, '').replace(/\n```$/, '')
    }
    
    // Test the fix
    try {
      const testId = `autofix-test-${Date.now()}`
      await mermaid.render(testId, cleanedCode)
      
      // Apply the fix to the editor
      const newContent = document.value.content.substring(0, mermaidBlock.start) +
                        '```mermaid\n' + cleanedCode + '\n```' +
                        document.value.content.substring(mermaidBlock.end)
      
      updateContent(newContent)
      
      // Force re-render
      setTimeout(() => renderMermaidDiagrams(), 300)
      
      alert(`✅ Mermaid diagram auto-fixed successfully!\n\nOriginal error: ${mermaidBlock.error}\n\nThe diagram should now render properly.`)
      
    } catch (testError) {
      throw new Error(`Fixed code still has errors: ${testError.message}`)
    }
    
  } catch (error) {
    console.error('🤖 AI auto-fix failed:', error)
    alert(`❌ Auto-fix failed: ${error.message}\n\nPlease try the manual "🤖 Fix with AI" button on the error display.`)
  }
}

const generateMermaidDiagram = async () => {
  if (!mermaidAI.isConfigured) {
    alert('AI is not configured. Please set up your API key in settings.')
    return
  }

  // Reset enhancement mode for new diagrams
  enhanceMode.value = false
  currentDiagramCode.value = ''

  // Show the new sophisticated modal
  showMermaidAI.value = true
}

// Add context menu functionality to rendered mermaid diagrams
const addDiagramContextMenu = (element, code, index) => {
  // Add right-click event listener
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    
    // Show context menu
    mermaidContextMenu.value = {
      visible: true,
      x: e.pageX,
      y: e.pageY,
      diagramCode: code,
      diagramIndex: index
    }
    
    console.log('🎯 Mermaid context menu triggered for diagram', index)
  })
  
  // Add visual indicator that diagram is interactive
  element.style.cursor = 'context-menu'
  element.title = 'Right-click to enhance with AI'
}

// Handle enhancing existing diagram
const enhanceDiagram = () => {
  console.log('🚀 Enhancing diagram:', mermaidContextMenu.value.diagramIndex)
  
  // Set enhancement mode
  enhanceMode.value = true
  currentDiagramCode.value = mermaidContextMenu.value.diagramCode
  
  // Hide context menu
  mermaidContextMenu.value.visible = false
  
  // Show AI modal in enhancement mode
  showMermaidAI.value = true
}

// Hide context menu when clicking elsewhere
const hideContextMenu = () => {
  mermaidContextMenu.value.visible = false
}

// Fix mermaid diagram with AI
const fixMermaidWithAI = async (diagramIndex) => {
  console.log('🔧 Fixing mermaid diagram', diagramIndex, 'with AI')
  
  // Check if AI is configured
  if (!mermaidAI.isConfigured) {
    alert('❌ AI is not configured. Please set up your API key in settings.')
    return
  }
  
  const errorData = mermaidErrors.value.get(diagramIndex)
  if (!errorData) {
    console.warn('⚠️ No error data found for diagram', diagramIndex)
    return
  }
  
  console.log('🔍 Retrieved error data for fixing:', {
    diagramIndex,
    codeLength: errorData.code.length,
    codePreview: errorData.code.substring(0, 100) + '...',
    errorMessage: errorData.error,
    fullCode: errorData.code
  })
  
  try {
    // Show loading state on the error element
    const errorElement = errorData.element
    const fixBtn = errorElement.querySelector('.fix-ai-btn')
    if (fixBtn) {
      fixBtn.textContent = '🔧 Fixing...'
      fixBtn.disabled = true
    }
    
    // Use AI to fix the syntax error
    const fixPrompt = `🚨 CRITICAL MERMAID SYNTAX ERROR - MUST FIX IMMEDIATELY 🚨

This Mermaid diagram is BROKEN and WILL NOT RENDER. The parser is throwing errors.

❌ BROKEN CODE (GUARANTEED TO FAIL):
\`\`\`
${errorData.code}
\`\`\`

🚨 PARSER ERROR MESSAGE:
${errorData.error}

🔍 SPECIFIC ERROR ANALYSIS:
${errorData.error.includes('Expecting') ? '- This is a PARSER EXPECTATION ERROR' : ''}
${errorData.error.includes('LINK') ? '- Parser detected unexpected LINK characters (too many dashes)' : ''}
${errorData.error.includes('SEMI') ? '- Missing semicolon or line break' : ''}
${errorData.error.includes('TD---') ? '- FOUND THE ISSUE: "TD---" should be "TD" (remove extra dashes)' : ''}

🔍 COMMON ISSUES TO CHECK:
- Extra dashes in diagram declaration (flowchart TD--- should be flowchart TD) 
- Missing or malformed arrows (should be --> not ---)
- Invalid node names or characters
- Broken connection syntax
- Missing spaces after keywords

🔧 YOUR TASK:
1. ANALYZE the broken code line by line
2. IDENTIFY the specific syntax errors
3. FIX each error while preserving the diagram logic
4. RETURN clean, working Mermaid code

⚠️ CRITICAL REQUIREMENTS:
- The code I'm giving you is DEFINITELY broken (it failed to parse)
- Do NOT return the same code
- Do NOT say it's "already valid" - it's NOT
- FIX the actual syntax errors
- Return ONLY the corrected code (no explanations)

FIXED CODE:`

    console.log('🤖 Sending fix request to AI...', { promptLength: fixPrompt.length })
    const fixedCode = await mermaidAI.generateContent(fixPrompt)
    
    console.log('🤖 AI Response received:', {
      hasResponse: !!fixedCode,
      responseLength: fixedCode?.length,
      responsePreview: fixedCode?.substring(0, 100) + '...'
    })
    
    if (!fixedCode || fixedCode.trim().length === 0) {
      throw new Error('AI returned empty or invalid response')
    }
    
    // Clean the AI response (remove any markdown formatting that might have snuck in)
    let cleanedCode = fixedCode.trim()
    if (cleanedCode.startsWith('```mermaid')) {
      cleanedCode = cleanedCode.replace(/^```mermaid\n/, '').replace(/\n```$/, '')
    }
    if (cleanedCode.startsWith('```')) {
      cleanedCode = cleanedCode.replace(/^```\n/, '').replace(/\n```$/, '')
    }
    
    console.log('🧹 Cleaned AI response:', {
      originalLength: fixedCode.length,
      cleanedLength: cleanedCode.length,
      cleanedPreview: cleanedCode.substring(0, 100) + '...'
    })
    
    // Test the fixed code by trying to render it
    try {
      const testId = `test-${Date.now()}`
      console.log('🧪 Testing fixed code with mermaid.render...')
      await mermaid.render(testId, cleanedCode)
      console.log('✅ Fixed code renders successfully!')
      
      // If rendering succeeds, replace the broken code in the editor
      replaceBrokenMermaidInEditor(errorData.code, cleanedCode)
      
      console.log('✅ Mermaid diagram fixed successfully!')
      
      // Force re-render of mermaid diagrams after fix
      nextTick(() => {
        console.log('🔄 Re-rendering diagrams after AI fix (immediate)...')
        renderMermaidDiagrams()
      })
      
      // Also add a delayed re-render to ensure it works
      setTimeout(() => {
        console.log('🔄 Re-rendering diagrams after AI fix (delayed)...')
        renderMermaidDiagrams()
      }, 500)
      
      // Update button to show success
      const errorElement = errorData.element
      const fixBtn = errorElement.querySelector('.fix-ai-btn')
      if (fixBtn) {
        fixBtn.textContent = '✅ Fixed!'
        fixBtn.style.background = '#28a745'
        fixBtn.disabled = true
        
        // Remove the error element after a delay
        setTimeout(() => {
          if (errorElement && errorElement.parentNode) {
            errorElement.style.opacity = '0.5'
            errorElement.style.transform = 'scale(0.95)'
          }
        }, 1000)
      }
      
      // Clear the error
      mermaidErrors.value.delete(diagramIndex)
      
    } catch (testError) {
      console.error('❌ Fixed code still has errors:', testError)
      console.error('❌ AI provided this code:', cleanedCode)
      
      // Try one more time with a more aggressive prompt
      const retryPrompt = `The previous fix attempt FAILED. Here's what the AI suggested that STILL DOESN'T WORK:

FAILED AI ATTEMPT:
${cleanedCode}

NEW ERROR: ${testError.message}

ORIGINAL BROKEN CODE:
${errorData.code}

ORIGINAL ERROR: ${errorData.error}

This is CRITICAL: The diagram MUST render. Please provide a completely different approach to fix this Mermaid syntax. Focus on:
1. Basic valid Mermaid flowchart syntax
2. Proper node declarations
3. Valid connection arrows
4. No special characters that break parsing

Return ONLY working Mermaid code:`

      console.log('🔄 Attempting retry with more aggressive prompt...')
      const retryCode = await mermaidAI.generateContent(retryPrompt)
      
      if (retryCode) {
        let cleanedRetryCode = retryCode.trim()
        if (cleanedRetryCode.startsWith('```mermaid')) {
          cleanedRetryCode = cleanedRetryCode.replace(/^```mermaid\n/, '').replace(/\n```$/, '')
        }
        if (cleanedRetryCode.startsWith('```')) {
          cleanedRetryCode = cleanedRetryCode.replace(/^```\n/, '').replace(/\n```$/, '')
        }
        
        try {
          const retryTestId = `retry-test-${Date.now()}`
          await mermaid.render(retryTestId, cleanedRetryCode)
          
          // Success on retry!
          replaceBrokenMermaidInEditor(errorData.code, cleanedRetryCode)
          console.log('✅ Retry successful!')
          
          nextTick(() => renderMermaidDiagrams())
          setTimeout(() => renderMermaidDiagrams(), 500)
          
          // Update button
          const fixBtn = errorElement.querySelector('.fix-ai-btn')
          if (fixBtn) {
            fixBtn.textContent = '✅ Fixed (retry)!'
            fixBtn.style.background = '#28a745'
            fixBtn.disabled = true
          }
          
          mermaidErrors.value.delete(diagramIndex)
          return
          
        } catch (retryError) {
          throw new Error(`Both fix attempts failed. Original: ${testError.message}, Retry: ${retryError.message}`)
        }
      }
      
      throw new Error(`Fixed code still invalid: ${testError.message}`)
    }
    
  } catch (error) {
    console.error('❌ AI fix failed:', error)
    
    // Restore button state
    const errorElement = errorData.element
    const fixBtn = errorElement.querySelector('.fix-ai-btn')
    if (fixBtn) {
      fixBtn.textContent = '🤖 Fix with AI'
      fixBtn.disabled = false
    }
    
    // Show error message
    alert(`❌ AI fix failed: ${error.message}`)
  }
}

// Replace broken mermaid code in the editor
const replaceBrokenMermaidInEditor = (brokenCode, fixedCode) => {
  if (!editorTextarea.value) {
    console.warn('⚠️ No editor textarea available')
    return
  }
  
  const textarea = editorTextarea.value
  const currentContent = textarea.value
  
  console.log('🔍 Replacing broken code:', {
    brokenCodeLength: brokenCode.length,
    fixedCodeLength: fixedCode.length,
    brokenCodePreview: brokenCode.substring(0, 100) + '...',
    fixedCodePreview: fixedCode.substring(0, 100) + '...'
  })
  
  // Try multiple replacement strategies
  let newContent = currentContent
  let replaced = false
  
  // Strategy 1: Exact mermaid block match
  const brokenBlock = `\`\`\`mermaid\n${brokenCode}\n\`\`\``
  const fixedBlock = `\`\`\`mermaid\n${fixedCode}\n\`\`\``
  
  if (currentContent.includes(brokenBlock)) {
    newContent = currentContent.replace(brokenBlock, fixedBlock)
    replaced = true
    console.log('✅ Strategy 1: Exact block replacement successful')
  } else {
    // Strategy 2: Just replace the code part (in case spacing is different)
    if (currentContent.includes(brokenCode)) {
      newContent = currentContent.replace(brokenCode, fixedCode)
      replaced = true
      console.log('✅ Strategy 2: Code-only replacement successful')
    } else {
      console.warn('⚠️ Could not find broken code in editor content')
      console.log('Current content preview:', currentContent.substring(0, 200) + '...')
    }
  }
  
  if (replaced && newContent !== currentContent) {
    updateContent(newContent)
    console.log('✅ Broken diagram replaced in editor successfully!')
  } else {
    console.warn('⚠️ No replacement made or content unchanged')
  }
}

// Make fix function available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.fixMermaidWithAI = fixMermaidWithAI
}

const handleMermaidInsert = async (generatedCode) => {
  console.log('📝 Handling Mermaid insert:', { 
    hasCode: !!generatedCode,
    codeLength: generatedCode?.length,
    hasTextarea: !!editorTextarea.value,
    enhanceMode: enhanceMode.value,
    codePreview: generatedCode?.substring(0, 100) + '...'
  })
  
  if (!editorTextarea.value || !generatedCode) {
    console.warn('⚠️ Cannot insert: missing textarea or generated code')
    return
  }

  // VALIDATE: Test the generated code before inserting
  try {
    const testId = `pre-insert-test-${Date.now()}`
    console.log('🧪 Pre-validating generated code before insertion...')
    await mermaid.render(testId, generatedCode)
    console.log('✅ Generated code is valid, proceeding with insertion')
  } catch (validationError) {
    console.error('❌ Generated code failed validation:', validationError.message)
    alert(`❌ Generated diagram has syntax errors and cannot be inserted.\n\nError: ${validationError.message}\n\nPlease try generating again.`)
    return
  }

  const textarea = editorTextarea.value
  
  // CRITICAL: Clean the generated code first (same logic for both modes)
  let cleanGeneratedCode = generatedCode.trim()
  
  // Remove any existing mermaid wrapper if AI included it
  if (cleanGeneratedCode.startsWith('```mermaid')) {
    cleanGeneratedCode = cleanGeneratedCode.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '').trim()
  }
  if (cleanGeneratedCode.startsWith('```')) {
    cleanGeneratedCode = cleanGeneratedCode.replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
  }
  
  console.log('🧹 Pre-cleaned generated code for insertion:', {
    mode: enhanceMode.value ? 'ENHANCE' : 'NEW',
    originalLength: generatedCode.length,
    cleanedLength: cleanGeneratedCode.length
  })

  if (enhanceMode.value && currentDiagramCode.value) {
    // ENHANCEMENT MODE: Replace existing diagram
    console.log('🔄 Replacing existing diagram...')
    
    const currentContent = textarea.value
    const oldMermaidBlock = `\`\`\`mermaid\n${currentDiagramCode.value}\n\`\`\``
    const newMermaidBlock = `\`\`\`mermaid\n${cleanGeneratedCode}\n\`\`\``
    
    // Find and replace the existing diagram
    const newContent = currentContent.replace(oldMermaidBlock, newMermaidBlock)
    
    if (newContent !== currentContent) {
      updateContent(newContent)
      console.log('✅ Mermaid diagram enhanced successfully!')
    } else {
      console.warn('⚠️ Could not find original diagram to replace')
      // Fallback to inserting at cursor
      insertAtCursor(textarea, cleanGeneratedCode)
    }
  } else {
    // NEW DIAGRAM MODE: Insert at cursor position
    insertAtCursor(textarea, cleanGeneratedCode)
  }
  
  // Reset enhancement mode
  enhanceMode.value = false
  currentDiagramCode.value = ''
}

// Helper function to insert diagram at cursor position (expects already cleaned code)
const insertAtCursor = (textarea, cleanCode) => {
  const start = textarea.selectionStart
  
  console.log('📝 Inserting at cursor:', {
    codeLength: cleanCode.length,
    codePreview: cleanCode.substring(0, 100) + '...',
    cursorPosition: start
  })
  
  const mermaidBlock = `\n\`\`\`mermaid\n${cleanCode}\n\`\`\`\n`
  
  const newContent = textarea.value.substring(0, start) + mermaidBlock + textarea.value.substring(start)
  updateContent(newContent)
  
  console.log('✅ Mermaid diagram inserted at cursor successfully!')
  
  // Set cursor after the inserted block
  nextTick(() => {
    textarea.focus()
    const newCursorPos = start + mermaidBlock.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

const closeMermaidAI = () => {
  console.log('🚪 Closing Mermaid AI modal')
  showMermaidAI.value = false
}

// Auto-save on content change
watch(() => document.value?.content, () => {
  // Auto-save is handled by the store
}, { deep: true })

// Watch for content changes to render mermaid diagrams
watch(htmlContent, () => {
  if (viewMode.value === 'preview' || viewMode.value === 'split') {
    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
      renderMermaidDiagrams()
    }, 100)
  }
})

onMounted(() => {
  // Start auto-save
  documentsStore.startAutoSave()
  
  // Ensure fix function is available globally
  if (typeof window !== 'undefined') {
    window.fixMermaidWithAI = fixMermaidWithAI
  }
})
</script>

<template>
  <div class="markdown-editor-container" @click="hideContextMenu">
    <!-- Toolbar -->
    <div v-if="showToolbar" class="editor-toolbar">
      <div class="toolbar-group">
        <!-- Text Formatting -->
        <button class="toolbar-btn" title="Bold (Ctrl+B)" @click="insertMarkdown('bold')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          </svg>
        </button>
        <button class="toolbar-btn" title="Italic (Ctrl+I)" @click="insertMarkdown('italic')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        </button>
        <button class="toolbar-btn" title="Strikethrough" @click="insertMarkdown('strikethrough')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <path d="M16 6c0-1.1-.9-2-2-2s-2 .9-2 2 2 4 2 4 2-2.9 2-4z"></path>
            <path d="M8 6c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4-2-2.9-2-4z"></path>
          </svg>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- Headings -->
        <button class="toolbar-btn" title="Heading 1" @click="insertMarkdown('heading1')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 12h12"></path>
            <path d="M6 4v16"></path>
            <path d="M18 4v16"></path>
          </svg>
        </button>
        <button class="toolbar-btn" title="Heading 2" @click="insertMarkdown('heading2')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h12"></path>
          </svg>
        </button>
        <button class="toolbar-btn" title="Heading 3" @click="insertMarkdown('heading3')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h8"></path>
          </svg>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- Lists -->
        <button class="toolbar-btn" title="Bullet List" @click="insertMarkdown('list')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button class="toolbar-btn" title="Numbered List" @click="insertMarkdown('numbered-list')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- Code -->
        <button class="toolbar-btn" title="Inline Code" @click="insertMarkdown('code')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16,18 22,12 16,6"></polyline>
            <polyline points="8,6 2,12 8,18"></polyline>
          </svg>
        </button>
        <button class="toolbar-btn" title="Code Block" @click="insertMarkdown('code-block')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 18l6-6-6-6"></path>
            <path d="M8 6l-6 6 6 6"></path>
          </svg>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- Links & Media -->
        <button class="toolbar-btn" title="Link" @click="insertMarkdown('link')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
        <button class="toolbar-btn" title="Image" @click="insertMarkdown('image')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21,15 16,10 5,21"></polyline>
          </svg>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- Table -->
        <button class="toolbar-btn" title="Insert Table" @click="toggleTableEditor">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3h18v18H3z"></path>
            <path d="M3 9h18"></path>
            <path d="M3 15h18"></path>
            <path d="M9 3v18"></path>
            <path d="M15 3v18"></path>
          </svg>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- AI Mermaid Tools -->
        <button 
          class="toolbar-btn ai-btn" 
          title="🤖 Generate Mermaid Diagram with AI" 
          @click="generateMermaidDiagram"
          :disabled="!mermaidAI.isConfigured || mermaidAI.generation.isGenerating"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>
          </svg>
          <span v-if="mermaidAI.generation.isGenerating" class="ai-loading">...</span>
        </button>
        <button 
          class="toolbar-btn ai-btn" 
          title="🤖 Auto-fix Mermaid Diagram Errors" 
          @click="autoFixMermaidDiagram"
          :disabled="!mermaidAI.isConfigured || mermaidAI.validation.isGenerating"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
            <path d="M12 21c0-1-1-3-3-3s-3 2-3 3 1 3 3 3 3-2 3-3"></path>
            <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"></path>
          </svg>
          <span v-if="mermaidAI.validation.isGenerating" class="ai-loading">...</span>
        </button>
        
        <div class="toolbar-separator"></div>
        
        <!-- Quote & HR -->
        <button class="toolbar-btn" title="Quote" @click="insertMarkdown('quote')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        <button class="toolbar-btn" title="Horizontal Rule" @click="insertMarkdown('horizontal-rule')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
      
      <div class="toolbar-group">
        <!-- View Mode Toggle -->
        <div class="view-mode-toggle">
          <button 
            class="toolbar-btn"
            :class="{ active: viewMode === 'edit' }"
            title="Edit Mode"
            @click="setViewMode('edit')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </button>
          <button 
            class="toolbar-btn"
            :class="{ active: viewMode === 'split' }"
            title="Split View"
            @click="setViewMode('split')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="18"></rect>
              <rect x="14" y="3" width="7" height="18"></rect>
              <line x1="10" y1="3" x2="10" y2="21"></line>
            </svg>
          </button>
          <button 
            class="toolbar-btn"
            :class="{ active: viewMode === 'preview' }"
            title="Preview Mode"
            @click="setViewMode('preview')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        
        <button 
          class="toolbar-btn"
          title="Save Document"
          @click="saveDocument"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17,21 17,13 7,13 7,21"></polyline>
            <polyline points="7,3 7,8 15,8"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Table Editor Modal -->
    <div v-if="showTableEditor" class="table-editor-modal">
      <div class="table-editor-content">
        <h3>Insert Table</h3>
        <div class="table-editor-form">
          <div class="form-group">
            <label>Rows:</label>
            <input type="number" v-model="tableRows" min="1" max="10" class="form-input">
          </div>
          <div class="form-group">
            <label>Columns:</label>
            <input type="number" v-model="tableCols" min="1" max="10" class="form-input">
          </div>
        </div>
        <div class="table-editor-actions">
          <button class="btn btn-primary" @click="insertTable">Insert Table</button>
          <button class="btn btn-secondary" @click="showTableEditor = false">Cancel</button>
        </div>
      </div>
    </div>

    <!-- New Sophisticated AI Mermaid Modal -->
    <MermaidAIModal 
      :visible="showMermaidAI"
      :enhance-mode="enhanceMode"
      :current-diagram="currentDiagramCode"
      @close="closeMermaidAI"
      @insert="handleMermaidInsert"
    />

    <!-- Context Menu for Mermaid Diagrams -->
    <div 
      v-if="mermaidContextMenu.visible"
      class="mermaid-context-menu"
      :style="{ left: mermaidContextMenu.x + 'px', top: mermaidContextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="enhanceDiagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4"></path>
          <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
        </svg>
        🤖 Enhance with AI
      </div>
    </div>

    <!-- Editor Content -->
    <div class="editor-content">
      <!-- Edit Mode -->
      <div v-if="viewMode === 'edit'" class="text-editor">
        <textarea 
          ref="editorTextarea"
          v-model="document.content"
          class="markdown-textarea"
          placeholder="Start writing your markdown here...

# Quick Start
- Use the toolbar above for formatting
- Press Ctrl+B for bold, Ctrl+I for italic
- Create tables with the table button
- Switch to preview mode to see the result"
          @input="updateContent($event.target.value)"
          @keydown="handleKeydown"
        ></textarea>
      </div>
      
      <!-- Preview Mode -->
      <div v-else-if="viewMode === 'preview'" class="markdown-preview">
        <div 
          class="preview-content"
          v-html="htmlContent"
        ></div>
      </div>
      
      <!-- Split Mode -->
      <div v-else-if="viewMode === 'split'" ref="splitContainer" class="split-container">
        <!-- Editor Panel -->
        <div class="split-editor" :style="{ width: splitDividerPosition + '%' }">
          <textarea 
            ref="editorTextarea"
            v-model="document.content"
            class="markdown-textarea"
            placeholder="Start writing your markdown here..."
            @input="updateContent($event.target.value)"
            @keydown="handleKeydown"
          ></textarea>
        </div>
        
        <!-- Resizable Divider -->
        <div 
          class="split-divider"
          @mousedown="startDragDivider"
          :class="{ dragging: isDraggingDivider }"
        >
          <div class="divider-handle"></div>
        </div>
        
        <!-- Preview Panel -->
        <div class="split-preview" :style="{ width: (100 - splitDividerPosition) + '%' }">
          <div 
            class="preview-content"
            v-html="htmlContent"
          ></div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="editor-status">
      <div class="status-left">
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
          </svg>
          {{ wordCount }} words
        </span>
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
          </svg>
          {{ lineCount }} lines
        </span>
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          {{ characterCount }} chars
        </span>
      </div>
      
      <div class="status-right">
        <span v-if="hasUnsavedChanges" class="status-item unsaved">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          Unsaved changes
        </span>
        <span class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          {{ viewMode === 'edit' ? 'Edit' : viewMode === 'split' ? 'Split' : 'Preview' }} mode
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  gap: 20px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background: #dee2e6;
  margin: 0 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.toolbar-btn:hover {
  background: #e9ecef;
  color: #333;
  border-color: #dee2e6;
}

.toolbar-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.toolbar-btn svg {
  transition: transform 0.2s;
}

.toolbar-btn:hover svg {
  transform: scale(1.1);
}

.view-mode-toggle {
  display: flex;
  gap: 1px;
  background: #e9ecef;
  border-radius: 6px;
  padding: 2px;
}

.view-mode-toggle .toolbar-btn {
  border-radius: 4px;
  margin: 0;
}

.view-mode-toggle .toolbar-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

/* Split View Styles */
.split-container {
  display: flex;
  height: 100%;
  position: relative;
}

.split-editor,
.split-preview {
  height: 100%;
  overflow: hidden;
  position: relative;
}

.split-editor {
  padding: 20px;
}

.split-preview {
  padding: 20px;
  overflow-y: auto;
}

.split-divider {
  width: 4px;
  background: #e9ecef;
  cursor: col-resize;
  position: relative;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-divider:hover,
.split-divider.dragging {
  background: #667eea;
}

.divider-handle {
  width: 2px;
  height: 40px;
  background: #999;
  border-radius: 1px;
  transition: background-color 0.2s;
}

.split-divider:hover .divider-handle,
.split-divider.dragging .divider-handle {
  background: white;
}

.split-divider::before {
  content: '';
  position: absolute;
  top: 0;
  left: -4px;
  right: -4px;
  bottom: 0;
  cursor: col-resize;
}

.text-editor {
  height: 100%;
  padding: 20px;
}

.markdown-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Monaco', 'Consolas', monospace;
  font-size: 15px;
  line-height: 1.6;
  color: #333;
  background: transparent;
  resize: none;
  padding: 0;
}

.markdown-textarea::placeholder {
  color: #999;
  font-style: italic;
}

.markdown-preview {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.preview-content {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.7;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
}

.preview-content h1,
.preview-content h2,
.preview-content h3,
.preview-content h4,
.preview-content h5,
.preview-content h6 {
  margin-top: 32px;
  margin-bottom: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: #2c3e50;
}

.preview-content h1 {
  font-size: 2.5em;
  border-bottom: 3px solid #667eea;
  padding-bottom: 0.3em;
}

.preview-content h2 {
  font-size: 2em;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 0.3em;
}

.preview-content h3 {
  font-size: 1.5em;
}

.preview-content p {
  margin-bottom: 16px;
  font-size: 16px;
}

.preview-content ul,
.preview-content ol {
  margin-bottom: 16px;
  padding-left: 2em;
}

.preview-content li {
  margin-bottom: 8px;
  font-size: 16px;
}

.preview-content blockquote {
  margin: 24px 0;
  padding: 16px 20px;
  color: #6a737d;
  border-left: 4px solid #667eea;
  background: #f8f9fa;
  border-radius: 0 6px 6px 0;
  font-style: italic;
}

.preview-content code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: #f1f3f4;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #e83e8c;
}

.preview-content pre {
  padding: 20px;
  overflow: auto;
  font-size: 14px;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 8px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
}

.preview-content pre code {
  padding: 0;
  background: none;
  color: #333;
}

.preview-content a {
  color: #667eea;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.preview-content a:hover {
  border-bottom-color: #667eea;
}

.preview-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.preview-content th,
.preview-content td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.preview-content th {
  background: #667eea;
  color: white;
  font-weight: 600;
}

.preview-content tr:nth-child(even) {
  background: #f8f9fa;
}

.preview-content tr:hover {
  background: #e9ecef;
}

.editor-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  font-size: 12px;
  color: #666;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.status-item svg {
  opacity: 0.7;
}

.status-item.unsaved {
  color: #e74c3c;
  font-weight: 600;
}

.status-item.unsaved svg {
  opacity: 1;
}

/* Table Editor Modal */
.table-editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.table-editor-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  min-width: 300px;
}

.table-editor-content h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 18px;
}

.table-editor-form {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  width: 80px;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.table-editor-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
}

.btn-secondary {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover {
  background: #e9ecef;
}

/* Dark mode */
.dark .markdown-editor-container {
  background: #2c3e50;
}

.dark .editor-toolbar {
  background: #34495e;
  border-bottom-color: #4a5f7a;
}

.dark .toolbar-separator {
  background: #4a5f7a;
}

.dark .toolbar-btn {
  color: #bdc3c7;
}

.dark .toolbar-btn:hover {
  background: #4a5f7a;
  color: #ecf0f1;
  border-color: #5a6f8a;
}

.dark .markdown-textarea {
  color: #ecf0f1;
}

.dark .markdown-textarea::placeholder {
  color: #95a5a6;
}

.dark .preview-content {
  color: #ecf0f1;
}

.dark .preview-content h1,
.dark .preview-content h2,
.dark .preview-content h3,
.dark .preview-content h4,
.dark .preview-content h5,
.dark .preview-content h6 {
  color: #ecf0f1;
}

.dark .preview-content h1,
.dark .preview-content h2 {
  border-bottom-color: #4a5f7a;
}

.dark .preview-content blockquote {
  color: #95a5a6;
  border-left-color: #667eea;
  background: #34495e;
}

.dark .preview-content code {
  background-color: rgba(255, 255, 255, 0.1);
  color: #f39c12;
}

.dark .preview-content pre {
  background-color: #34495e;
  border-color: #4a5f7a;
}

.dark .preview-content pre code {
  color: #ecf0f1;
}

.dark .preview-content a {
  color: #74b9ff;
}

.dark .preview-content th {
  background: #667eea;
}

.dark .preview-content tr:nth-child(even) {
  background: #34495e;
}

.dark .preview-content tr:hover {
  background: #4a5f7a;
}

.dark .editor-status {
  background: #34495e;
  border-top-color: #4a5f7a;
  color: #bdc3c7;
}

.dark .status-item svg {
  opacity: 0.8;
}

.dark .status-item.unsaved svg {
  opacity: 1;
}

.dark .table-editor-content {
  background: #2c3e50;
  color: #ecf0f1;
}

.dark .table-editor-content h3 {
  color: #ecf0f1;
}

.dark .form-group label {
  color: #bdc3c7;
}

.dark .form-input {
  background: #34495e;
  border-color: #4a5f7a;
  color: #ecf0f1;
}

.dark .form-input:focus {
  border-color: #667eea;
}

.dark .btn-secondary {
  background: #34495e;
  color: #bdc3c7;
  border-color: #4a5f7a;
}

.dark .btn-secondary:hover {
  background: #4a5f7a;
}

/* Dark mode for split view */
.dark .view-mode-toggle {
  background: #4a5f7a;
}

.dark .split-divider {
  background: #4a5f7a;
}

.dark .split-divider:hover,
.dark .split-divider.dragging {
  background: #667eea;
}

.dark .divider-handle {
  background: #bdc3c7;
}

.dark .split-divider:hover .divider-handle,
.dark .split-divider.dragging .divider-handle {
  background: white;
}

/* Mermaid Diagram Styles */
.language-mermaid {
  margin: 24px 0;
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
  position: relative;
}

.language-mermaid svg {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* Enhanced Mermaid Error Styles */
.mermaid-error {
  margin: 24px 0;
  background: #fff5f5;
  border: 2px solid #fed7d7;
  border-radius: 12px;
  padding: 20px;
  text-align: left;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 20px;
}

.error-title {
  font-weight: 600;
  color: #c53030;
  font-size: 16px;
}

.error-message {
  color: #744210;
  background: #fef5e7;
  border: 1px solid #f6e05e;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.error-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.fix-ai-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fix-ai-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.fix-ai-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.error-details {
  margin: 0;
}

.error-details summary {
  cursor: pointer;
  color: #4a5568;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 0;
}

.error-details summary:hover {
  color: #2d3748;
}

.error-code {
  background: #2d3748;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  margin: 8px 0 0 0;
  border: 1px solid #4a5568;
}

.mermaid-error {
  color: #e74c3c;
  background: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
}

.mermaid-error details {
  margin-top: 8px;
}

.mermaid-error summary {
  cursor: pointer;
  color: #666;
  font-size: 12px;
}

.mermaid-error pre {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 8px;
  font-size: 12px;
}

/* Dark mode for mermaid */
.dark .language-mermaid {
  background: #34495e;
  border-color: #4a5f7a;
}

.dark .mermaid-error {
  background: #2d1b1b;
  border-color: #9b2c2c;
}

.dark .error-title {
  color: #fc8181;
}

.dark .error-message {
  background: #2d2017;
  border-color: #9c7c26;
  color: #ecc94b;
}

.dark .fix-ai-btn {
  background: #4299e1;
}

.dark .fix-ai-btn:hover:not(:disabled) {
  background: #3182ce;
}

.dark .error-details summary {
  color: #a0aec0;
}

.dark .error-details summary:hover {
  color: #e2e8f0;
}

.dark .error-code {
  background: #1a202c;
  border-color: #2d3748;
  color: #cbd5e0;
}

.dark .mermaid-error pre {
  background: #2c3e50;
  color: #ecf0f1;
}

/* AI Toolbar Buttons */
.ai-btn {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.ai-btn:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4198 100%);
  color: white;
  border-color: #5a6fd8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ai-btn:disabled {
  background: #e9ecef;
  color: #6c757d;
  border-color: #dee2e6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ai-loading {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  font-size: 10px;
  animation: aiPulse 1.5s ease-in-out infinite;
}

@keyframes aiPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* AI Modal Styles */
.ai-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.ai-modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  min-width: 500px;
  max-width: 700px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.ai-close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  padding: 8px;
  transition: background-color 0.2s;
}

.ai-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ai-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.ai-modal-footer {
  padding: 16px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
}

/* AI Progress */
.ai-progress {
  margin-bottom: 24px;
}

.ai-progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.ai-progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ai-progress-text {
  color: #666;
  font-size: 14px;
  margin: 0;
  text-align: center;
}

/* AI Result Styles */
.ai-result {
  margin-top: 16px;
}

.ai-success {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.ai-success h4 {
  color: #0369a1;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.ai-info {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.ai-info h4 {
  color: #166534;
  margin: 0 0 8px 0;
  font-size: 16px;
}

.ai-suggestions {
  background: #fefce8;
  border: 1px solid #fde047;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.ai-suggestions h4 {
  color: #ca8a04;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.ai-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.ai-error h4 {
  color: #dc2626;
  margin: 0 0 8px 0;
  font-size: 16px;
}

.ai-fixes h5,
.ai-errors h5,
.ai-suggestions-list h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.ai-fixes ul,
.ai-errors ul,
.ai-suggestions-list ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.ai-fixes li,
.ai-errors li,
.ai-suggestions-list li {
  margin-bottom: 4px;
  font-size: 14px;
}

.ai-code-display {
  margin-top: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e9ecef;
}

.ai-code-display h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.ai-code-display pre {
  background: #2d3748;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.ai-code-display code {
  background: none;
  color: inherit;
  padding: 0;
}

/* Dark mode for AI components */
.dark .ai-modal-content {
  background: #2c3e50;
  color: #ecf0f1;
}

.dark .ai-modal-footer {
  background: #34495e;
  border-top-color: #4a5f7a;
}

.dark .ai-progress-bar {
  background: #4a5f7a;
}

.dark .ai-progress-text {
  color: #bdc3c7;
}

.dark .ai-success {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark .ai-info {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.dark .ai-suggestions {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

.dark .ai-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.dark .ai-code-display {
  background: #34495e;
  border-color: #4a5f7a;
}

.dark .ai-code-display h5 {
  color: #bdc3c7;
}

.dark .ai-code-display pre {
  background: #2c3e50;
  color: #ecf0f1;
}

/* Mermaid Context Menu */
.mermaid-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #495057;
  transition: background 0.2s ease;
}

.context-menu-item:hover {
  background: #f8f9fa;
  color: #007bff;
}

.context-menu-item svg {
  opacity: 0.7;
}

.dark .mermaid-context-menu {
  background: #2c3e50;
  border-color: #4a5f7a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .context-menu-item {
  color: #ecf0f1;
}

.dark .context-menu-item:hover {
  background: #34495e;
  color: #74b9ff;
}
</style>
