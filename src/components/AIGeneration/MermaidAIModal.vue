<template>
  <div v-if="visible" class="ai-modal-overlay" @click.self="$emit('close')">
    <div class="ai-modal-container">
      <!-- Header -->
      <div class="ai-modal-header">
        <div class="ai-modal-title">
          <svg class="ai-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>
          </svg>
          <h2>🤖 {{ props.enhanceMode ? 'Enhance Mermaid Diagram' : 'AI Mermaid Generator' }}</h2>
        </div>
        <button @click="$emit('close')" class="ai-close-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Progress Steps -->
      <div class="ai-steps-indicator">
        <div 
          v-for="(stepInfo, index) in steps" 
          :key="index"
          :class="['step-indicator', { 
            'active': currentStep === index + 1, 
            'completed': currentStep > index + 1 
          }]"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <span class="step-label">{{ stepInfo.label }}</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="ai-modal-content">
        
        <!-- Step 1: Template Selection -->
        <div v-if="currentStep === 1" class="step-content">
          <h3 class="step-title">Choose Diagram Type</h3>
          <p class="step-description">Select the type of diagram you want to create</p>
          
          <div class="template-grid">
            <div 
              v-for="template in templates" 
              :key="template.type"
              :class="['template-card', { 'selected': selectedTemplate?.type === template.type }]"
              @click="selectTemplate(template)"
            >
              <div class="template-icon">{{ template.icon }}</div>
              <h4 class="template-name">{{ template.name }}</h4>
              <p class="template-description">{{ template.description }}</p>
              <div class="template-syntax">{{ template.syntax }}</div>
            </div>
          </div>
        </div>

        <!-- Step 2: Customization -->
        <div v-if="currentStep === 2" class="step-content">
          <h3 class="step-title">
            {{ props.enhanceMode ? 'Describe Enhancement' : selectedTemplate?.name + ' Details' }}
          </h3>
          
          <!-- Template Preview -->
          <div class="template-preview">
            <div class="preview-header">
              <span class="preview-icon">{{ selectedTemplate?.icon }}</span>
              <span class="preview-name">{{ selectedTemplate?.name }}</span>
              <span class="preview-syntax">{{ selectedTemplate?.syntax }}</span>
            </div>
            <p class="preview-description">{{ selectedTemplate?.description }}</p>
            
            <!-- Example Toggle -->
            <details class="example-toggle">
              <summary>View Example Code</summary>
              <pre class="example-code">{{ selectedTemplate?.example }}</pre>
            </details>
          </div>

          <!-- Description Input -->
          <div class="input-section">
            <label class="input-label" for="description">
              Describe your diagram requirements
            </label>
            <textarea 
              id="description"
              v-model="description"
              class="description-input"
              rows="4"
              :placeholder="props.enhanceMode ? 
                'e.g., Add error handling steps, include database connections, add new workflow branches, change styling...' : 
                (selectedTemplate?.placeholder || 'e.g., Create a flowchart for user login process with authentication, validation, and error handling...')"
            ></textarea>
          </div>

          <!-- Advanced Options -->
          <details class="advanced-options">
            <summary>Advanced Options</summary>
            <div class="options-grid">
              <div class="option-item">
                <label class="option-label">Creativity Level</label>
                <input 
                  type="range" 
                  v-model.number="options.temperature" 
                  min="0.1" 
                  max="1" 
                  step="0.1" 
                  class="slider"
                >
                <span class="slider-value">{{ options.temperature }}</span>
              </div>
              <div class="option-item">
                <label class="option-label">Complexity</label>
                <select v-model="options.complexity" class="select-input">
                  <option value="simple">Simple</option>
                  <option value="moderate">Moderate</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
            </div>
          </details>
        </div>

        <!-- Step 3: Generation Progress -->
        <div v-if="currentStep === 3" class="step-content generation-step">
          <div class="generation-animation">
            <div class="ai-spinner">
              <svg class="spinner-svg" width="64" height="64" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v2a6 6 0 0 0-6 6H4z" opacity="0.75">
                  <animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" values="0 12 12;360 12 12"></animateTransform>
                </path>
              </svg>
            </div>
            <h3 class="generation-title">{{ generationStage }}</h3>
            <p class="generation-subtitle">Using intelligent prompting for optimal results</p>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: generationProgress + '%' }"></div>
          </div>
          
          <div class="generation-steps">
            <div 
              v-for="(step, index) in generationStages" 
              :key="index"
              :class="['generation-step-item', { 
                'active': currentGenerationStep === index,
                'completed': currentGenerationStep > index 
              }]"
            >
              <div class="generation-step-icon">
                <svg v-if="currentGenerationStep > index" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                <div v-else class="step-dot"></div>
              </div>
              <span class="generation-step-text">{{ step }}</span>
            </div>
          </div>
        </div>

        <!-- Step 4: Results -->
        <div v-if="currentStep === 4" class="step-content">
          <div class="result-header">
            <h3 class="result-title">
              Generated {{ selectedTemplate?.name }}
              <span :class="['validation-badge', validationResult.isValid ? 'valid' : 'invalid']">
                {{ validationResult.isValid ? '✓ Valid' : '⚠ Needs Review' }}
              </span>
            </h3>
          </div>

          <!-- Validation Messages -->
          <div v-if="!validationResult.isValid" class="validation-messages">
            <div v-if="validationResult.errors.length" class="validation-errors">
              <h4>⚠️ Issues Found:</h4>
              <ul>
                <li v-for="error in validationResult.errors" :key="error">{{ error }}</li>
              </ul>
            </div>
            <div v-if="validationResult.suggestions.length" class="validation-suggestions">
              <h4>💡 Suggestions:</h4>
              <ul>
                <li v-for="suggestion in validationResult.suggestions" :key="suggestion">{{ suggestion }}</li>
              </ul>
            </div>
          </div>

          <!-- Generated Content -->
          <div class="result-content">
            <div class="result-header-bar">
              <span class="result-label">Generated Mermaid Code</span>
              <div class="result-actions">
                <button @click="copyToClipboard" class="action-btn secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                  Copy
                </button>
                <button @click="previewDiagram" class="action-btn secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Preview
                </button>
              </div>
            </div>
            <textarea 
              v-model="generatedContent"
              class="result-textarea"
              rows="12"
              readonly
            ></textarea>
          </div>

          <!-- Preview Container -->
          <div v-if="showPreview" class="preview-container">
            <div class="preview-header">
              <h4>📊 Diagram Preview</h4>
              <button @click="showPreview = false" class="close-preview-btn">×</button>
            </div>
            <div id="mermaid-preview" class="mermaid-preview"></div>
          </div>
        </div>

        <!-- Step 5: Error State -->
        <div v-if="currentStep === 5" class="step-content error-step">
          <div class="error-animation">
            <svg class="error-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <h3 class="error-title">Generation Failed</h3>
            <p class="error-message">{{ errorMessage }}</p>
          </div>
          <button @click="retryGeneration" class="retry-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Try Again
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="ai-modal-actions">
        <button @click="$emit('close')" class="action-btn secondary">
          Cancel
        </button>
        
        <button 
          v-if="currentStep === 1" 
          @click="nextStep"
          :disabled="!selectedTemplate"
          class="action-btn primary"
        >
          Continue
        </button>
        
        <button 
          v-if="currentStep === 2" 
          @click="generateDiagram"
          :disabled="!description.trim()"
          class="action-btn primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon>
          </svg>
          Generate Diagram
        </button>
        
        <button 
          v-if="currentStep === 4" 
          @click="insertAndClose"
          class="action-btn primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
          Insert & Close
        </button>
        
        <button 
          v-if="currentStep === 4 && !validationResult.isValid" 
          @click="regenerate"
          class="action-btn warning"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23,4 23,10 17,10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Regenerate
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useMermaidAI } from '../../composables/useAI.js'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  enhanceMode: {
    type: Boolean,
    default: false
  },
  currentDiagram: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['close', 'insert'])

// AI Integration
const mermaidAI = useMermaidAI()

// State
const currentStep = ref(1)
const selectedTemplate = ref(null)
const description = ref('')
const generatedContent = ref('')
const errorMessage = ref('')
const generationStage = ref('Understanding requirements...')
const generationProgress = ref(0)
const currentGenerationStep = ref(0)

const options = ref({
  temperature: 0.7,
  complexity: 'moderate'
})

const validationResult = ref({
  isValid: true,
  errors: [],
  suggestions: []
})

const showPreview = ref(false)

// Steps configuration
const steps = [
  { label: 'Template' },
  { label: 'Customize' },
  { label: 'Generate' },
  { label: 'Result' }
]

const generationStages = [
  'Analyzing requirements',
  'Selecting optimal diagram type',
  'Generating Mermaid syntax',
  'Validating diagram structure',
  'Finalizing result'
]

// Templates
const templates = ref([
  {
    type: 'flowchart',
    name: 'Flowchart',
    icon: '📊',
    description: 'Process flows, decision trees, and workflow diagrams',
    syntax: 'flowchart TD',
    placeholder: 'e.g., Create a user registration process with validation steps...',
    example: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`
  },
  {
    type: 'sequence',
    name: 'Sequence',
    icon: '🔄',
    description: 'Interactions and communications over time',
    syntax: 'sequenceDiagram',
    placeholder: 'e.g., Show API interaction between frontend, backend, and database...',
    example: `sequenceDiagram
    User->>Frontend: Login Request
    Frontend->>Backend: Validate Credentials
    Backend->>Database: Query User
    Database-->>Backend: User Data
    Backend-->>Frontend: Login Success`
  },
  {
    type: 'class',
    name: 'Class Diagram',
    icon: '🏗️',
    description: 'Object relationships and system structure',
    syntax: 'classDiagram',
    placeholder: 'e.g., Design a class structure for an e-commerce system...',
    example: `classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    User --> Order : creates`
  },
  {
    type: 'mindmap',
    name: 'Mindmap',
    icon: '🧠',
    description: 'Hierarchical concept visualization',
    syntax: 'mindmap',
    placeholder: 'e.g., Create a project planning mindmap with phases and tasks...',
    example: `mindmap
  root((Project))
    Planning
      Research
      Requirements
    Development
      Frontend
      Backend`
  },
  {
    type: 'journey',
    name: 'User Journey',
    icon: '🗺️',
    description: 'User experience flows and touchpoints',
    syntax: 'journey',
    placeholder: 'e.g., Map the customer onboarding journey from signup to first use...',
    example: `journey
    title User Registration
    section Sign Up
      Visit website: 5: Me
      Click register: 3: Me
      Fill form: 2: Me
    section Verification
      Receive email: 4: Me
      Click verify: 5: Me`
  },
  {
    type: 'gitgraph',
    name: 'Git Graph',
    icon: '🌿',
    description: 'Branch workflows and version control',
    syntax: 'gitGraph',
    placeholder: 'e.g., Show a git workflow with feature branches and merges...',
    example: `gitGraph
    commit
    branch develop
    checkout develop
    commit
    branch feature
    checkout feature
    commit
    checkout develop
    merge feature`
  }
])

// Methods
const selectTemplate = (template) => {
  selectedTemplate.value = template
}

const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

const generateDiagram = async () => {
  if (!description.value.trim() || !selectedTemplate.value) return
  
  currentStep.value = 3
  generationProgress.value = 0
  currentGenerationStep.value = 0
  
  try {
    // Simulate generation stages
    const stagePromises = generationStages.map((stage, index) => {
      return new Promise(resolve => {
        setTimeout(() => {
          currentGenerationStep.value = index
          generationStage.value = stage
          generationProgress.value = ((index + 1) / generationStages.length) * 100
          resolve()
        }, index * 800) // 800ms per stage
      })
    })
    
    // Wait for all stages to complete
    await Promise.all(stagePromises)
    
    // Generate the actual content with STRICT formatting requirements
    const basePrompt = props.enhanceMode ? 
      `Enhance this existing ${selectedTemplate.value?.name || 'Mermaid'} diagram: ${description.value}

CURRENT DIAGRAM:
\`\`\`
${props.currentDiagram}
\`\`\`

ENHANCEMENT REQUEST: ${description.value}

CRITICAL REQUIREMENTS:
- MUST start with "${selectedTemplate.value?.syntax || 'flowchart TD'}"
- MUST use ONLY ${selectedTemplate.value?.name || 'flowchart'} syntax
- Keep the existing structure where it makes sense
- Add the requested enhancements
- Return ONLY valid Mermaid code (no explanations)` :
      `Create a perfect ${selectedTemplate.value.name} diagram for: ${description.value}

CRITICAL REQUIREMENTS:
- MUST start with EXACTLY: "${selectedTemplate.value.syntax}"
- MUST use ONLY ${selectedTemplate.value.name} syntax (not mindmap, not other types)
- MUST be valid Mermaid syntax that renders without errors
- Return ONLY the diagram code (no explanations, no markdown)
- Template: ${selectedTemplate.value.syntax}
- Description: ${selectedTemplate.value.description}

REQUIREMENTS: ${description.value}

VALID ${selectedTemplate.value.name.toUpperCase()} CODE:`

    const enhancedPrompt = basePrompt

    const content = await mermaidAI.generateDiagram(enhancedPrompt)
    
    // CRITICAL: Clean any markdown wrapper from AI response first
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```mermaid')) {
      cleanContent = cleanContent.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '').trim()
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    }
    
    console.log('🧹 Cleaned AI response in modal:', {
      originalLength: content.length,
      cleanedLength: cleanContent.length,
      originalPreview: content.substring(0, 50) + '...',
      cleanedPreview: cleanContent.substring(0, 50) + '...'
    })
    
    // VALIDATE: Ensure content starts with correct syntax
    const expectedStart = selectedTemplate.value.syntax
    
    if (!cleanContent.startsWith(expectedStart)) {
      console.warn('⚠️ AI generated wrong diagram type:', {
        expected: expectedStart,
        received: cleanContent.substring(0, 50) + '...'
      })
      
      // Try to fix by adding the correct start
      if (cleanContent.includes('mindmap') && selectedTemplate.value.syntax.includes('flowchart')) {
        // Convert mindmap to flowchart format
        errorMessage.value = 'AI generated wrong diagram type. Please try again with a clearer description.'
        currentStep.value = 5
        return
      }
      
      // Add correct syntax if missing
      generatedContent.value = expectedStart + '\n' + cleanContent
    } else {
      generatedContent.value = cleanContent
    }
    
    // Validate the result
    const validation = await mermaidAI.validateAndFix(generatedContent.value)
    validationResult.value = validation
    
    currentStep.value = 4
    
  } catch (error) {
    console.error('🤖 Generation failed:', error)
    errorMessage.value = error.message || 'Unknown error occurred'
    currentStep.value = 5
  }
}

const regenerate = () => {
  currentStep.value = 2
  generateDiagram()
}

const retryGeneration = () => {
  currentStep.value = 2
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedContent.value)
    // Could add a toast notification here
    console.log('📋 Content copied to clipboard')
  } catch (error) {
    console.error('❌ Failed to copy to clipboard:', error)
  }
}

const previewDiagram = async () => {
  showPreview.value = !showPreview.value
  
  if (showPreview.value) {
    // Give Vue time to render the preview container
    await nextTick()
    
    // Render the mermaid diagram in the preview container
    try {
      const element = document.getElementById('mermaid-preview')
      if (element && generatedContent.value) {
        // Import mermaid dynamically for rendering
        const mermaid = (await import('mermaid')).default
        
        // Clear previous content
        element.innerHTML = ''
        
        // Generate unique ID for this diagram
        const diagramId = `preview-${Date.now()}`
        
        // Render the diagram
        const { svg } = await mermaid.render(diagramId, generatedContent.value)
        element.innerHTML = svg
      }
    } catch (error) {
      console.error('❌ Preview rendering failed:', error)
      errorMessage.value = `Preview failed: ${error.message}`
    }
  }
}

const insertAndClose = () => {
  console.log('🚀 Insert & Close clicked!', { 
    hasContent: !!generatedContent.value,
    contentLength: generatedContent.value?.length,
    content: generatedContent.value
  })
  
  if (!generatedContent.value) {
    console.warn('⚠️ No content to insert!')
    return
  }
  
  // Emit the insert event with the generated content
  emit('insert', generatedContent.value)
  
  // Small delay to ensure the insert is processed before closing
  setTimeout(() => {
    emit('close')
  }, 100)
}

// Reset state when modal closes
watch(() => props.visible, (visible) => {
  if (visible && props.enhanceMode) {
    // For enhancement mode, skip to description step and set a default template
    currentStep.value = 2
    selectedTemplate.value = templates.value[0] // Default to flowchart
    description.value = ''
    generatedContent.value = ''
    errorMessage.value = ''
    generationProgress.value = 0
    currentGenerationStep.value = 0
    validationResult.value = { isValid: true, errors: [], suggestions: [] }
  } else if (!visible) {
    // Reset after a short delay to allow for exit animation
    setTimeout(() => {
      currentStep.value = 1
      selectedTemplate.value = null
      description.value = ''
      generatedContent.value = ''
      errorMessage.value = ''
      generationProgress.value = 0
      currentGenerationStep.value = 0
      validationResult.value = { isValid: true, errors: [], suggestions: [] }
      showPreview.value = false
    }, 300)
  }
})
</script>

<style scoped>
/* Modal Overlay */
.ai-modal-overlay {
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
  animation: fadeIn 0.3s ease-out;
}

.ai-modal-container {
  background: white;
  border-radius: 16px;
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  animation: slideInUp 0.3s ease-out;
}

/* Header */
.ai-modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-modal-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.ai-icon {
  color: #ffd700;
}

.ai-close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 8px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.ai-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Steps Indicator */
.ai-steps-indicator {
  display: flex;
  padding: 16px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  justify-content: space-between;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
}

.step-indicator:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -50%;
  top: 50%;
  width: 100%;
  height: 2px;
  background: #dee2e6;
  z-index: 1;
}

.step-indicator.completed::after {
  background: #28a745;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dee2e6;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  position: relative;
  z-index: 2;
}

.step-indicator.active .step-number {
  background: #667eea;
  color: white;
}

.step-indicator.completed .step-number {
  background: #28a745;
  color: white;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
}

.step-indicator.active .step-label {
  color: #667eea;
  font-weight: 600;
}

.step-indicator.completed .step-label {
  color: #28a745;
}

/* Content */
.ai-modal-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.step-content {
  min-height: 400px;
}

.step-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #343a40;
}

.step-description {
  margin: 0 0 24px;
  color: #6c757d;
  font-size: 14px;
}

/* Template Grid */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.template-card {
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.template-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.template-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  display: block;
}

.template-name {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #343a40;
}

.template-description {
  margin: 0 0 12px;
  font-size: 14px;
  color: #6c757d;
  line-height: 1.4;
}

.template-syntax {
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
  color: #495057;
  border: 1px solid #e9ecef;
}

/* Template Preview */
.template-preview {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.preview-icon {
  font-size: 1.25rem;
}

.preview-name {
  font-weight: 600;
  color: #343a40;
}

.preview-syntax {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
  color: #495057;
  border: 1px solid #dee2e6;
}

.preview-description {
  margin: 0 0 16px;
  color: #6c757d;
  font-size: 14px;
}

.example-toggle {
  cursor: pointer;
}

.example-toggle summary {
  font-weight: 500;
  color: #667eea;
  padding: 8px 0;
  outline: none;
}

.example-code {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #495057;
  overflow-x: auto;
  margin-top: 8px;
}

/* Input Section */
.input-section {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #343a40;
  font-size: 14px;
}

.description-input {
  width: 100%;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s;
  font-family: inherit;
}

.description-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Advanced Options */
.advanced-options {
  margin-bottom: 24px;
}

.advanced-options summary {
  font-weight: 500;
  color: #667eea;
  cursor: pointer;
  padding: 12px 0;
  outline: none;
  border-top: 1px solid #e9ecef;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 16px 0;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: #343a40;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
}

.slider-value {
  font-size: 12px;
  color: #6c757d;
  text-align: center;
}

.select-input {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

/* Generation Step */
.generation-step {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.generation-animation {
  margin-bottom: 32px;
}

.ai-spinner {
  margin-bottom: 24px;
}

.spinner-svg {
  color: #667eea;
}

.generation-title {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 600;
  color: #343a40;
}

.generation-subtitle {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 32px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
  border-radius: 4px;
}

.generation-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 300px;
}

.generation-step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  text-align: left;
}

.generation-step-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.generation-step-item.active .generation-step-icon {
  border-color: #667eea;
  background: #667eea;
}

.generation-step-item.completed .generation-step-icon {
  border-color: #28a745;
  background: #28a745;
}

.generation-step-item.completed .generation-step-icon svg {
  color: white;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dee2e6;
}

.generation-step-item.active .step-dot {
  background: white;
}

.generation-step-text {
  font-size: 14px;
  color: #6c757d;
}

.generation-step-item.active .generation-step-text {
  color: #667eea;
  font-weight: 500;
}

.generation-step-item.completed .generation-step-text {
  color: #28a745;
}

/* Results */
.result-header {
  margin-bottom: 20px;
}

.result-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #343a40;
  display: flex;
  align-items: center;
  gap: 12px;
}

.validation-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.validation-badge.valid {
  background: #d4edda;
  color: #155724;
}

.validation-badge.invalid {
  background: #fff3cd;
  color: #856404;
}

/* Validation Messages */
.validation-messages {
  margin-bottom: 24px;
}

.validation-errors, .validation-suggestions {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
}

.validation-errors {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.validation-suggestions {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
}

.validation-errors h4, .validation-suggestions h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.validation-errors ul, .validation-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.validation-errors li, .validation-suggestions li {
  font-size: 14px;
  margin-bottom: 4px;
}

/* Result Content */
.result-content {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.result-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-textarea {
  width: 100%;
  border: none;
  padding: 16px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  background: white;
  color: #495057;
}

.result-textarea:focus {
  outline: none;
}

/* Error Step */
.error-step {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.error-animation {
  margin-bottom: 32px;
}

.error-icon {
  color: #dc3545;
  margin-bottom: 24px;
}

.error-title {
  margin: 0 0 16px;
  font-size: 1.5rem;
  font-weight: 600;
  color: #dc3545;
}

.error-message {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
  max-width: 400px;
  line-height: 1.5;
}

.retry-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
}

/* Action Buttons */
.ai-modal-actions {
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8f9fa;
}

.action-btn {
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: none;
}

.action-btn.secondary {
  background: #6c757d;
  color: white;
}

.action-btn.secondary:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4198 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-btn.warning {
  background: #ffc107;
  color: #212529;
}

.action-btn.warning:hover {
  background: #e0a800;
  transform: translateY(-1px);
}

.action-btn:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .ai-modal-container {
    width: 95vw;
    height: 95vh;
    max-height: none;
  }
  
  .template-grid {
    grid-template-columns: 1fr;
  }
  
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .ai-steps-indicator {
    flex-direction: column;
    gap: 8px;
  }
  
  .step-indicator::after {
    display: none;
  }
  
  .ai-modal-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .ai-modal-container {
    background: #2c3e50;
    color: #ecf0f1;
  }
  
  .ai-modal-header {
    border-color: #34495e;
  }
  
  .ai-steps-indicator {
    background: #34495e;
    border-color: #4a5f7a;
  }
  
  .template-card {
    background: #34495e;
    border-color: #4a5f7a;
    color: #ecf0f1;
  }
  
  .template-card.selected {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  }
  
  .template-preview {
    background: #34495e;
    border-color: #4a5f7a;
  }
  
  .description-input {
    background: #34495e;
    border-color: #4a5f7a;
    color: #ecf0f1;
  }
  
  .result-textarea {
    background: #34495e;
    color: #ecf0f1;
  }
  
  .result-header-bar {
    background: #34495e;
    border-color: #4a5f7a;
  }
  
  .ai-modal-actions {
    background: #34495e;
    border-color: #4a5f7a;
  }
}

/* Preview Container */
.preview-container {
  margin-top: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
  overflow: hidden;
}

.preview-header {
  padding: 0.75rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.close-preview-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-preview-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.mermaid-preview {
  padding: 1rem;
  text-align: center;
  min-height: 200px;
  background: white;
  overflow: auto;
}

.mermaid-preview svg {
  max-width: 100%;
  height: auto;
}
</style>
