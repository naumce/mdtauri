<template>
  <div class="mindmap-panel">
    <!-- Mindmap Toolbar -->
    <div class="mindmap-toolbar">
      <div class="toolbar-header">
        <h4>🧠 Mindmap Generator</h4>
        <p class="toolbar-description">Transform your content into interactive mindmaps</p>
      </div>
      
      <div class="toolbar-actions">
        <!-- Generation Buttons -->
        <div class="action-group">
          <button 
            @click="() => generateFromHeadings(documentsStore.selectedDocument?.content)" 
            :disabled="!canGenerateFromHeadings || isGenerating"
            :class="['action-btn', 'primary', { 'no-headings': !hasHeadings }]"
            :title="!hasHeadings ? 'No headings found in document' : 'Generate mindmap from document headings'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11H3l8-8 8 8h-6v10H9V11z"/>
            </svg>
            <span v-if="!hasHeadings">⚠️ From Headings</span>
            <span v-else>From Headings</span>
          </button>
          
          <button 
            @click="() => generateFromSelection(documentsStore.selectedDocument?.content)" 
            :disabled="isGenerating"
            class="action-btn secondary"
            title="Generate from selected text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            From Selection
          </button>
          
          <button 
            @click="clearMindmap" 
            :disabled="!mindmapData || isGenerating"
            class="action-btn danger"
            title="Clear current mindmap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18l-2 13H5L3 6z"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Clear
          </button>
        </div>

        <!-- Export Menu -->
        <div class="action-group">
          <div class="export-dropdown">
            <button class="action-btn export-toggle" @click="showExportMenu = !showExportMenu">
              Export
            </button>
            
            <div v-if="showExportMenu" class="export-menu">
              <div class="export-section">
                <h6>Download</h6>
                <button v-for="format in exportFormats" :key="format.id" 
                        @click="downloadMindmap(format.id)" 
                        class="export-option">
                  {{ format.name }}
                  <small>{{ format.description }}</small>
                </button>
              </div>
              
              <div class="export-section">
                <h6>Insert into Document</h6>
                <button v-for="format in exportFormats.filter(f => f.id !== 'json')" :key="format.id" 
                        @click="insertIntoDocument(format.id)" 
                        class="export-option">
                  Insert {{ format.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Switcher -->
    <div class="view-switcher">
      <button 
        @click="currentView = 'tree'" 
        :class="['view-btn', { active: currentView === 'tree' }]"
      >
        Tree
      </button>
      <button 
        @click="switchToCanvas" 
        :class="['view-btn', { active: currentView === 'canvas' }]"
      >
        Canvas
      </button>
    </div>

    <!-- Content Area -->
    <div class="mindmap-content">
      <!-- Loading State -->
      <div v-if="isGenerating" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Generating mindmap...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!mindmapData" class="empty-state">
        <div class="empty-icon">🧠</div>
        <h3>No Mindmap Generated</h3>
        <p>Click "From Headings" to generate a mindmap from your document structure.</p>
      </div>

      <!-- Tree View -->
      <div v-else-if="currentView === 'tree'" class="tree-view">
        <div class="tree-header">
          <h5>{{ mindmapData.metadata.sourceType.toUpperCase() }} MINDMAP</h5>
          <p>{{ nodeCount }} nodes • Hierarchical structure</p>
        </div>
        
        <div class="tree-structure">
          <div v-for="node in mindmapData.nodes" :key="node.id" 
               :class="['tree-node', `level-${node.level}`]"
               :style="{ marginLeft: (node.level * 20) + 'px' }">
            <div class="node-content">
              <span class="node-bullet">•</span>
              <span class="node-text">{{ node.text }}</span>
              <span class="node-level">L{{ node.level }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Canvas View - Full Screen -->
      <div v-else-if="currentView === 'canvas'" class="canvas-view">
        <!-- Canvas Header -->
        <div class="canvas-header">
          <div class="canvas-title">
            <h3>{{ mindmapData?.metadata?.sourceType?.toUpperCase() || 'MINDMAP' }} - Interactive Canvas</h3>
            <p>{{ nodeCount }} nodes • Full-screen interactive view</p>
            <small v-if="isInMilestoneMode" class="milestone-mode-hint">
              🏁 Milestone Mode: Drag to select nodes, then release to create milestone
            </small>
          </div>
          <div class="canvas-controls">
            <!-- Node Creation Buttons -->
            <button @click="addNewNode" class="canvas-btn primary" title="Add Independent Node">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Add Node
            </button>
            <button @click="addChildToSelected" class="canvas-btn secondary" title="Add Child to Selected Node" :disabled="!hasSelectedNode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <line x1="19" y1="8" x2="19" y2="14"></line>
                <line x1="22" y1="11" x2="16" y2="11"></line>
              </svg>
              Add Child
            </button>
            
            <!-- Layout Selector -->
            <div class="layout-selector">
              <label class="layout-label">Layout:</label>
              <select v-model="selectedLayout" @change="applyLayout" class="layout-select">
                <option value="radial">Radial</option>
                <option value="tree">Tree</option>
                <option value="concentric">Concentric</option>
                <option value="force">Force</option>
              </select>
            </div>
            
            <!-- Node Shape Selector -->
            <div class="shape-selector">
              <label class="shape-label">Shape:</label>
              <select v-model="selectedShape" @change="applyShape" class="shape-select">
                <option value="circle">Circle</option>
                <option value="square">Square</option>
                <option value="diamond">Diamond</option>
                <option value="hexagon">Hexagon</option>
              </select>
            </div>
            
            <!-- Milestone Mode Toggle -->
            <button 
              @click="toggleMilestoneMode" 
              :class="['canvas-btn', 'milestone-btn', { 'active': isInMilestoneMode }]" 
              :title="isInMilestoneMode ? 'Exit milestone mode' : 'Create milestone: drag to select nodes'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
              <span class="milestone-btn-text">
                {{ isInMilestoneMode ? 'Exit' : 'Milestone' }}
              </span>
              <div v-if="isInMilestoneMode" class="milestone-mode-indicator"></div>
            </button>
            
            <!-- Close Button -->
            <button @click="currentView = 'tree'" class="canvas-close-btn" title="Exit Full-Screen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Canvas Container - Full Height -->
        <div class="canvas-container">
          <MindmapCanvasPro 
            ref="mindmapCanvas"
            :mindmap-data="mindmapData"
            :layout="selectedLayout"
            :node-shape="selectedShape"
            :milestone-mode="isInMilestoneMode"
            @milestone-selection-start="handleMilestoneSelectionStart"
            @milestone-selection-update="handleMilestoneSelectionUpdate"
            @milestone-selection-end="handleMilestoneSelectionEnd"
            @milestone-selected="handleMilestoneSelected"
            @node-selected="handleNodeSelected"
            @canvas-clicked="handleCanvasClicked"
          />
          
          <!-- Beautiful Selection Overlay for Milestone Creation -->
          <div 
            v-if="selectionBox.active" 
            class="milestone-selection-overlay"
            :style="{
              left: selectionBox.x + 'px',
              top: selectionBox.y + 'px', 
              width: selectionBox.width + 'px',
              height: selectionBox.height + 'px'
            }"
          >
            <div class="selection-border"></div>
            <div class="selection-corners">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
            </div>
            <div class="selection-label">Milestone Selection</div>
          </div>
          
          <!-- Node/Milestone Inspector Panel -->
          <div v-if="showInspector && (selectedNode || selectedMilestone)" class="node-inspector">
            <div class="inspector-header">
              <div class="inspector-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                {{ selectedMilestone ? 'Milestone Inspector' : 'Node Inspector' }}
              </div>
              <button @click="closeInspector" class="inspector-close-btn" title="Close Inspector">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div class="inspector-content">
              <!-- Milestone Inspector -->
              <div v-if="selectedMilestone">
                <!-- Basic Properties -->
                <div class="inspector-section">
                  <label class="inspector-label">Title</label>
                  <input 
                    v-model="milestoneTitleField" 
                    @input="applyMilestoneTitle"
                    class="inspector-input" 
                    type="text" 
                    placeholder="Milestone title"
                  />
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Description</label>
                  <textarea 
                    v-model="milestoneDescriptionField" 
                    @input="applyMilestoneDescription"
                    class="inspector-textarea" 
                    rows="3" 
                    placeholder="Milestone description"
                  ></textarea>
                </div>
                
                <!-- Project Management Fields -->
                <div class="inspector-section">
                  <label class="inspector-label">Status</label>
                  <select v-model="milestoneStatusField" @change="applyMilestonePMField('status')" class="inspector-select">
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Priority</label>
                  <select v-model="milestonePriorityField" @change="applyMilestonePMField('priority')" class="inspector-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Owner</label>
                  <input 
                    v-model="milestoneOwnerField" 
                    @input="applyMilestonePMField('owner')"
                    class="inspector-input" 
                    type="text" 
                    placeholder="Assignee"
                  />
                </div>
                
                <!-- Date Fields -->
                <div class="inspector-section">
                  <div class="inspector-row">
                    <div class="inspector-col">
                      <label class="inspector-label">Start Date</label>
                      <input 
                        v-model="milestoneStartDateField" 
                        @change="applyMilestonePMField('startDate')"
                        class="inspector-input" 
                        type="date"
                      />
                    </div>
                    <div class="inspector-col">
                      <label class="inspector-label">End Date</label>
                      <input 
                        v-model="milestoneEndDateField" 
                        @change="applyMilestonePMField('endDate')"
                        class="inspector-input" 
                        type="date"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Duration (days)</label>
                  <input 
                    v-model.number="milestoneDurationDaysField" 
                    @input="applyMilestonePMField('durationDays')"
                    class="inspector-input" 
                    type="number" 
                    min="0"
                    placeholder="0"
                  />
                </div>
                
                <!-- Grouped Nodes -->
                <div class="inspector-section">
                  <label class="inspector-label">Grouped Nodes ({{ selectedMilestone.groupedNodes?.length || 0 }})</label>
                  <div class="grouped-nodes-list">
                    <div 
                      v-for="nodeId in (selectedMilestone.groupedNodes || [])" 
                      :key="nodeId" 
                      class="grouped-node-item"
                    >
                      <span class="node-id">{{ getNodeTitle(nodeId) || nodeId }}</span>
                      <button @click="removeNodeFromMilestone(nodeId)" class="remove-node-btn" title="Remove from milestone">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Metadata -->
                <div class="inspector-section">
                  <div class="inspector-metadata">
                    <div class="metadata-item">
                      <span class="metadata-label">Type:</span>
                      <span class="metadata-value">milestone</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">ID:</span>
                      <span class="metadata-value">{{ selectedMilestone.id }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Node Inspector -->
              <div v-else-if="selectedNode">
                <!-- Basic Properties -->
                <div class="inspector-section">
                  <label class="inspector-label">Name</label>
                  <input 
                    v-model="nameField" 
                    @input="applyName"
                    class="inspector-input" 
                    type="text" 
                    placeholder="Node name"
                  />
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Description</label>
                  <textarea 
                    v-model="descriptionField" 
                    @input="applyDescription"
                    class="inspector-textarea" 
                    rows="3" 
                    placeholder="Node description"
                  ></textarea>
                </div>
                
                <!-- Project Management Fields -->
                <div class="inspector-section">
                  <label class="inspector-label">Status</label>
                  <select v-model="statusField" @change="applyPMField('status')" class="inspector-select">
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Priority</label>
                  <select v-model="priorityField" @change="applyPMField('priority')" class="inspector-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Owner</label>
                  <input 
                    v-model="ownerField" 
                    @input="applyPMField('owner')"
                    class="inspector-input" 
                    type="text" 
                    placeholder="Assignee"
                  />
                </div>
                
                <!-- Date Fields -->
                <div class="inspector-section">
                  <div class="inspector-row">
                    <div class="inspector-col">
                      <label class="inspector-label">Start Date</label>
                      <input 
                        v-model="startDateField" 
                        @change="applyPMField('startDate')"
                        class="inspector-input" 
                        type="date"
                      />
                    </div>
                    <div class="inspector-col">
                      <label class="inspector-label">End Date</label>
                      <input 
                        v-model="endDateField" 
                        @change="applyPMField('endDate')"
                        class="inspector-input" 
                        type="date"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="inspector-section">
                  <label class="inspector-label">Duration (days)</label>
                  <input 
                    v-model.number="durationDaysField" 
                    @input="applyPMField('durationDays')"
                    class="inspector-input" 
                    type="number" 
                    min="0"
                    placeholder="0"
                  />
                </div>
                
                <!-- Metadata -->
                <div class="inspector-section">
                  <div class="inspector-metadata">
                    <div class="metadata-item">
                      <span class="metadata-label">Type:</span>
                      <span class="metadata-value">{{ selectedNode.type || 'node' }}</span>
                    </div>
                    <div class="metadata-item">
                      <span class="metadata-label">ID:</span>
                      <span class="metadata-value">{{ selectedNode.id }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useMindmap } from '../composables/useMindmap.js'
import { useDocumentsStore } from '../stores/documents.js'
import MindmapCanvasPro from './MindmapCanvasPro.vue'

// Store
const documentsStore = useDocumentsStore()

// Mindmap composable
const { mindmapData, isGenerating, generateFromHeadings, generateFromSelection, clearMindmap, downloadMindmap, insertIntoDocument, getExportFormats } = useMindmap()

// UI State
const currentView = ref('tree')
const showExportMenu = ref(false)
const mindmapCanvas = ref(null)

// Canvas layout and shape state
const selectedLayout = ref('radial')
const selectedShape = ref('circle')

// Milestone state
const isInMilestoneMode = ref(false)
const isSelecting = ref(false)
const selectionBox = ref({ active: false, x: 0, y: 0, width: 0, height: 0 })
const selectedMilestoneId = ref(null)
const milestones = ref([])

// Inspector state for nodes and milestones
const showInspector = ref(false)
const nameField = ref('')
const descriptionField = ref('')
const statusField = ref('planned')
const priorityField = ref('medium')
const ownerField = ref('')
const startDateField = ref('')
const endDateField = ref('')
const durationDaysField = ref(0)

// Milestone inspector state
const milestoneTitleField = ref('')
const milestoneDescriptionField = ref('')
const milestoneStatusField = ref('planned')
const milestonePriorityField = ref('medium')
const milestoneOwnerField = ref('')
const milestoneStartDateField = ref('')
const milestoneEndDateField = ref('')
const milestoneDurationDaysField = ref(0)

// Computed properties
const exportFormats = computed(() => getExportFormats())
const nodeCount = computed(() => mindmapData.value?.nodes?.length || 0)

const hasHeadings = computed(() => {
  const content = documentsStore.selectedDocument?.content || ''
  const headingRegex = /^#{1,6}\s+.+$/gm
  return headingRegex.test(content)
})

const canGenerateFromHeadings = computed(() => {
  return documentsStore.selectedDocument?.content && hasHeadings.value && !isGenerating.value
})

const hasSelectedNode = computed(() => {
  return mindmapCanvas.value?.selectedNodeId || false
})

const selectedNode = computed(() => {
  if (!mindmapData.value?.nodes || !mindmapCanvas.value?.selectedNodeId) return null
  return mindmapData.value.nodes.find(node => node.id === mindmapCanvas.value.selectedNodeId)
})

const selectedMilestone = computed(() => {
  if (!selectedMilestoneId.value || !milestones.value.length) return null
  return milestones.value.find(milestone => milestone.id === selectedMilestoneId.value)
})

// Watchers
watch(selectedNode, (newNode) => {
  if (newNode) {
    nameField.value = newNode.name || newNode.text || ''
    descriptionField.value = newNode.description || ''
    statusField.value = newNode.status || 'planned'
    priorityField.value = newNode.priority || 'medium'
    ownerField.value = newNode.owner || ''
    startDateField.value = newNode.startDate || ''
    endDateField.value = newNode.endDate || ''
    durationDaysField.value = newNode.durationDays || 0
    showInspector.value = true
  } else {
    showInspector.value = false
  }
})

watch(selectedMilestone, (newMilestone) => {
  if (newMilestone) {
    milestoneTitleField.value = newMilestone.title || ''
    milestoneDescriptionField.value = newMilestone.description || ''
    milestoneStatusField.value = newMilestone.status || 'planned'
    milestonePriorityField.value = newMilestone.priority || 'medium'
    milestoneOwnerField.value = newMilestone.owner || ''
    milestoneStartDateField.value = newMilestone.startDate || ''
    milestoneEndDateField.value = newMilestone.endDate || ''
    milestoneDurationDaysField.value = newMilestone.durationDays || 0
    showInspector.value = true
  }
})

// Methods
const switchToCanvas = async () => {
  currentView.value = 'canvas'
}

// Canvas control methods
const addNewNode = () => {
  if (mindmapCanvas.value) {
    mindmapCanvas.value.addNode()
  }
}

const addChildToSelected = () => {
  if (mindmapCanvas.value) {
    mindmapCanvas.value.addChildNode()
  }
}

// Layout and Shape methods
const applyLayout = () => {
  console.log('🎨 Applying layout:', selectedLayout.value)
  if (mindmapCanvas.value) {
    mindmapCanvas.value.renderMindmap()
  }
}

const applyShape = () => {
  console.log('🎨 Applying shape:', selectedShape.value)
  if (mindmapCanvas.value) {
    mindmapCanvas.value.renderMindmap()
  }
}

// Milestone methods
const toggleMilestoneMode = () => {
  isInMilestoneMode.value = !isInMilestoneMode.value
  if (!isInMilestoneMode.value) {
    // Reset selection state when exiting milestone mode
    selectionBox.value = { active: false, x: 0, y: 0, width: 0, height: 0 }
    isSelecting.value = false
  }
}

const handleMilestoneSelectionStart = (coords) => {
  selectionBox.value = {
    active: true,
    x: coords.x,
    y: coords.y,
    width: 0,
    height: 0
  }
  isSelecting.value = true
}

const handleMilestoneSelectionUpdate = (coords) => {
  if (isSelecting.value) {
    selectionBox.value.x = coords.x
    selectionBox.value.y = coords.y
    selectionBox.value.width = coords.width
    selectionBox.value.height = coords.height
  }
}

const handleMilestoneSelectionEnd = (selectedNodeIds) => {
  isSelecting.value = false
  selectionBox.value.active = false
  
  if (selectedNodeIds.length > 0) {
    createMilestone(selectedNodeIds)
  }
  
  // Reset selection box
  selectionBox.value = { active: false, x: 0, y: 0, width: 0, height: 0 }
}

const handleMilestoneSelected = (milestoneId) => {
  selectedMilestoneId.value = milestoneId
  console.log('🏁 Selected milestone:', milestoneId)
  showInspector.value = true
}

const handleNodeSelected = (nodeId) => {
  console.log('🎯 Node selected in panel:', nodeId)
  selectedMilestoneId.value = null // Clear milestone selection
  
  // Ensure the canvas component knows about the selection
  if (mindmapCanvas.value) {
    mindmapCanvas.value.selectedNodeId = nodeId
  }
  
  showInspector.value = !!nodeId // Only show inspector if nodeId is not null
}

const handleCanvasClicked = () => {
  console.log('🎯 Canvas clicked - clearing selections')
  selectedMilestoneId.value = null
  showInspector.value = false
  
  // Clear node selection in canvas
  if (mindmapCanvas.value) {
    mindmapCanvas.value.selectedNodeId = null
    mindmapCanvas.value.updateNodeSelection()
  }
}

const createMilestone = (nodeIds) => {
  const milestoneId = `milestone_${Date.now()}`
  const milestone = {
    id: milestoneId,
    type: 'milestone',
    isContainer: true,
    groupedNodes: nodeIds,
    title: `Milestone ${milestones.value.length + 1}`,
    description: '',
    status: 'planned',
    priority: 'medium',
    owner: '',
    startDate: '',
    endDate: '',
    durationDays: 0
  }
  
  milestones.value.push(milestone)
  
  // Store milestone in separate metadata instead of adding as visual node
  if (mindmapData.value) {
    if (!mindmapData.value.milestones) {
      mindmapData.value.milestones = []
    }
    mindmapData.value.milestones.push(milestone)
    
    // Update the metadata timestamp to force re-render
    if (mindmapData.value.metadata) {
      mindmapData.value.metadata.generatedAt = Date.now()
    }
    
    // Force re-render of the canvas to show milestone immediately
    nextTick(() => {
      if (mindmapCanvas.value && mindmapCanvas.value.renderMindmap) {
        console.log('🏁 Forcing canvas re-render to show new milestone')
        mindmapCanvas.value.renderMindmap()
      }
    })
  }
  
  console.log('🏁 Created milestone:', milestone.title, 'with', nodeIds.length, 'nodes')
}

// Inspector methods
const closeInspector = () => {
  showInspector.value = false
  if (mindmapCanvas.value) {
    mindmapCanvas.value.selectedNodeId = null
    mindmapCanvas.value.updateNodeSelection()
  }
  selectedMilestoneId.value = null
}

const applyName = () => {
  if (selectedNode.value) {
    selectedNode.value.name = nameField.value
    selectedNode.value.text = nameField.value // Keep text in sync
  }
}

const applyDescription = () => {
  if (selectedNode.value) {
    selectedNode.value.description = descriptionField.value
  }
}

const applyPMField = (fieldName) => {
  if (selectedNode.value) {
    switch (fieldName) {
      case 'status':
        selectedNode.value.status = statusField.value
        break
      case 'priority':
        selectedNode.value.priority = priorityField.value
        break
      case 'owner':
        selectedNode.value.owner = ownerField.value
        break
      case 'startDate':
        selectedNode.value.startDate = startDateField.value
        break
      case 'endDate':
        selectedNode.value.endDate = endDateField.value
        break
      case 'durationDays':
        selectedNode.value.durationDays = durationDaysField.value
        break
    }
  }
}

// Milestone inspector methods
const applyMilestoneTitle = () => {
  if (selectedMilestone.value) {
    selectedMilestone.value.title = milestoneTitleField.value
  }
}

const applyMilestoneDescription = () => {
  if (selectedMilestone.value) {
    selectedMilestone.value.description = milestoneDescriptionField.value
  }
}

const applyMilestonePMField = (fieldName) => {
  if (selectedMilestone.value) {
    switch (fieldName) {
      case 'status':
        selectedMilestone.value.status = milestoneStatusField.value
        break
      case 'priority':
        selectedMilestone.value.priority = milestonePriorityField.value
        break
      case 'owner':
        selectedMilestone.value.owner = milestoneOwnerField.value
        break
      case 'startDate':
        selectedMilestone.value.startDate = milestoneStartDateField.value
        break
      case 'endDate':
        selectedMilestone.value.endDate = milestoneEndDateField.value
        break
      case 'durationDays':
        selectedMilestone.value.durationDays = milestoneDurationDaysField.value
        break
    }
  }
}

const getNodeTitle = (nodeId) => {
  if (!mindmapData.value?.nodes) return nodeId
  const node = mindmapData.value.nodes.find(n => n.id === nodeId)
  return node ? (node.name || node.text || nodeId) : nodeId
}

const removeNodeFromMilestone = (nodeId) => {
  if (selectedMilestone.value && selectedMilestone.value.groupedNodes) {
    const index = selectedMilestone.value.groupedNodes.indexOf(nodeId)
    if (index > -1) {
      selectedMilestone.value.groupedNodes.splice(index, 1)
    }
  }
}

// Document integration method
const insertMindmapIntoDocument = (format) => {
  insertIntoDocument(format)
}

// Expose methods for parent component
defineExpose({
  insertMindmapIntoDocument
})
</script>

<style scoped>
.mindmap-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 0;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.mindmap-toolbar {
  background: white;
  border-bottom: 2px solid #e9ecef;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  flex-shrink: 0;
  width: 100%;
}

.toolbar-header h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.toolbar-description {
  margin: 0 0 16px 0;
  color: #6c757d;
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  color: #495057;
  border: 2px solid #dee2e6;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.action-btn.secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border-color: transparent;
}

.action-btn.danger {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  border-color: transparent;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-btn.no-headings {
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  color: #2d3436;
}

.export-dropdown {
  position: relative;
}

.export-toggle {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border-color: transparent;
}

.export-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  z-index: 1000;
  margin-top: 4px;
  min-width: 280px;
  max-width: 400px;
}

.export-section {
  padding: 12px;
}

.export-section h6 {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 12px;
  font-weight: 600;
}

.export-section:not(:last-child) {
  border-bottom: 1px solid #e9ecef;
}

.export-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #495057;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  text-align: left;
  transition: background-color 0.2s ease;
}

.export-option:hover {
  background: #f8f9fa;
}

.export-option small {
  color: #6c757d;
  font-size: 12px;
  margin-top: 2px;
}

.view-switcher {
  display: flex;
  background: white;
  border-bottom: 1px solid #e9ecef;
  padding: 0 20px;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #6c757d;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.view-btn:hover {
  color: #495057;
  background: #f8f9fa;
}

.view-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.mindmap-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #6c757d;
  padding: 40px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #495057;
}

.empty-state p {
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
}

.tree-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  max-width: 100%;
}

.tree-header {
  margin-bottom: 20px;
  text-align: center;
}

.tree-header h5 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.tree-header p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.tree-structure {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tree-node {
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.tree-node:hover {
  background: #f8f9fa;
}

.tree-node.level-0 {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-left: 4px solid #667eea;
  font-weight: 600;
}

.tree-node.level-1 {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.1) 0%, rgba(245, 87, 108, 0.1) 100%);
  border-left: 4px solid #f093fb;
  font-weight: 500;
}

.tree-node.level-2 {
  background: linear-gradient(135deg, rgba(0, 184, 148, 0.1) 0%, rgba(0, 206, 201, 0.1) 100%);
  border-left: 4px solid #00b894;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-bullet {
  color: #667eea;
  font-weight: bold;
  font-size: 16px;
}

.node-text {
  flex: 1;
  color: #2c3e50;
}

.node-level {
  background: #e9ecef;
  color: #6c757d;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

/* Canvas View - Full Screen */
.canvas-view {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: white;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  flex-shrink: 0;
}

.canvas-title h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.canvas-title p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.milestone-mode-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #ff6b35;
  font-weight: 500;
  animation: pulse-text 1.5s ease-in-out infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.canvas-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.canvas-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: rgba(255,255,255,0.2);
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.canvas-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
  transform: translateY(-1px);
}

.canvas-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.canvas-btn.primary {
  background: rgba(40, 167, 69, 0.9);
}

.canvas-btn.secondary {
  background: rgba(255, 193, 7, 0.9);
}

.milestone-btn {
  position: relative;
}

.milestone-btn.active {
  background: rgba(255, 107, 53, 0.9);
  animation: pulse-button 2s ease-in-out infinite;
}

@keyframes pulse-button {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.milestone-mode-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #ff6b35;
  border-radius: 50%;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.canvas-close-btn {
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-close-btn:hover {
  background: rgba(220, 53, 69, 1);
  transform: scale(1.1);
}

/* Layout and Shape Selectors */
.layout-selector,
.shape-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.layout-label,
.shape-label {
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.layout-select,
.shape-select {
  padding: 6px 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
  cursor: pointer;
}

.layout-select:hover,
.shape-select:hover {
  border-color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.2);
}

.layout-select:focus,
.shape-select:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(255,255,255,0.25);
}

.layout-select option,
.shape-select option {
  background: #2c3e50;
  color: white;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* Node Inspector */
.node-inspector {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 320px;
  max-height: calc(100% - 32px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.inspector-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.inspector-close-btn {
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.2);
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.inspector-close-btn:hover {
  background: rgba(255,255,255,0.3);
}

.inspector-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.inspector-section {
  margin-bottom: 16px;
}

.inspector-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.inspector-input,
.inspector-textarea,
.inspector-select {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.inspector-input:focus,
.inspector-textarea:focus,
.inspector-select:focus {
  outline: none;
  border-color: #667eea;
}

.inspector-textarea {
  resize: vertical;
  min-height: 60px;
}

.inspector-row {
  display: flex;
  gap: 12px;
}

.inspector-col {
  flex: 1;
}

.inspector-metadata {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.metadata-item:last-child {
  margin-bottom: 0;
}

.metadata-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.metadata-value {
  font-size: 12px;
  color: #495057;
  font-weight: 600;
}

/* Grouped Nodes */
.grouped-nodes-list {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.grouped-node-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 4px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
}

.grouped-node-item:last-child {
  margin-bottom: 0;
}

.node-id {
  flex: 1;
  color: #495057;
  font-weight: 500;
}

.remove-node-btn {
  padding: 2px;
  border: none;
  border-radius: 3px;
  background: #dc3545;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-node-btn:hover {
  background: #c82333;
}

/* Milestone Selection Overlay */
.milestone-selection-overlay {
  position: absolute;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  animation: fade-in 0.2s ease-out forwards;
}

@keyframes fade-in {
  to { opacity: 1; }
}

.selection-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px dashed #ff6b35;
  background: rgba(255, 107, 53, 0.1);
  border-radius: 8px;
  animation: border-pulse 1.5s ease-in-out infinite;
}

@keyframes border-pulse {
  0%, 100% { border-color: #ff6b35; }
  50% { border-color: #ff8c42; }
}

.selection-corners {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.corner {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #ff6b35;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  animation: corner-pulse 1s ease-in-out infinite;
}

@keyframes corner-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.corner.top-left {
  top: -6px;
  left: -6px;
}

.corner.top-right {
  top: -6px;
  right: -6px;
}

.corner.bottom-left {
  bottom: -6px;
  left: -6px;
}

.corner.bottom-right {
  bottom: -6px;
  right: -6px;
}

.selection-label {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff6b35;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* Responsive Design */
@media (max-width: 768px) {
  .mindmap-toolbar {
    padding: 16px;
  }
  
  .toolbar-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .action-group {
    justify-content: center;
  }
  
  .canvas-header {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .canvas-controls {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .layout-selector,
  .shape-selector {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .export-menu {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 300px;
    max-width: 90vw;
  }
}

@media (max-width: 480px) {
  .mindmap-toolbar {
    padding: 12px;
  }
  
  .toolbar-header h4 {
    font-size: 16px;
  }
  
  .action-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .canvas-title h3 {
    font-size: 16px;
  }
  
  .canvas-title p {
    font-size: 12px;
  }
}
</style>
