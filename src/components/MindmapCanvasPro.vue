<template>
  <div class="mindmap-canvas-pro" ref="canvasContainer">
    <!-- Canvas Placeholder when no nodes -->
    <div v-if="!hasNodes" class="canvas-placeholder">
      <div class="placeholder-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3z"></path>
          <path d="M9 3v18"></path>
          <path d="M15 3v18"></path>
          <path d="M3 9h18"></path>
          <path d="M3 15h18"></path>
        </svg>
        <h3>Professional Mindmap Canvas</h3>
        <p>Generate a mindmap from your document headings first, then it will appear here with professional layouts and interactive nodes.</p>
        <button @click="addNode" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          Add First Node
        </button>
      </div>
    </div>
    
    <!-- Professional SVG Mindmap Canvas -->
    <div ref="svgContainer" class="svg-mindmap-container"></div>
    
    <!-- Toolbar -->
    <div v-if="hasNodes" class="mindmap-toolbar">
      <div class="toolbar-section">
        <label>Layout:</label>
        <select v-model="currentLayout" @change="handleLayoutChange">
          <option value="radial">Radial</option>
          <option value="tree">Tree</option>
          <option value="concentric">Concentric</option>
          <option value="force">Force</option>
        </select>
      </div>
      
      <div class="toolbar-section">
        <label>Shape:</label>
        <select v-model="currentShape" @change="handleShapeChange">
          <option value="circle">Circle</option>
          <option value="square">Square</option>
          <option value="diamond">Diamond</option>
        </select>
      </div>
      
      <div class="toolbar-section">
        <button @click="addNode" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          Add Node
        </button>
        
        <button @click="clearCanvas" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          </svg>
          Clear
        </button>
        
        <button @click="exportMindmap" class="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
          </svg>
          Export
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

// Props
const props = defineProps({
  layout: {
    type: String,
    default: 'radial'
  },
  nodeShape: {
    type: String,
    default: 'circle'
  },
  mindmapData: {
    type: Object,
    default: null
  },
  milestoneMode: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits({
  'nodes-changed': (nodes) => true,
  'export-request': (mermaidCode) => true,
  'node-selected': (nodeId) => true,
  'canvas-clicked': () => true,
  'milestone-selection-start': (coords) => true,
  'milestone-selection-update': (coords) => true,
  'milestone-selection-end': (selectedNodeIds) => true,
  'milestone-selected': (milestoneId) => true
})

// Refs
const canvasContainer = ref(null)
const svgContainer = ref(null)

// State
const nodes = ref([])
const connections = ref([])
const selectedNodeId = ref(null)
const preservedPositions = ref(new Map()) // Store manual positions by node ID
const isDragInProgress = ref(false)
const draggedNodeId = ref(null)
const currentLayout = ref(props.layout)
const currentShape = ref(props.nodeShape)

// Zoom and pan state
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)

// Milestone selection state
const isSelectingMilestone = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionCurrent = ref({ x: 0, y: 0 })
const lastRenderedDataId = ref(null) // Track if we already rendered this data

// Computed
const hasNodes = computed(() => {
  return (props.mindmapData && props.mindmapData.nodes && props.mindmapData.nodes.length > 0) || nodes.value.length > 0
})

// Shape System (Professional SVG shapes from original renderer)
const shapeRegistry = new Map()

const circleShape = {
  name: 'circle',
  displayName: 'Circle',
  render: (x, y, size, color) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', x.toString())
    circle.setAttribute('cy', y.toString())
    circle.setAttribute('r', size.toString())
    circle.setAttribute('fill', color)
    circle.setAttribute('stroke', '#fff')
    circle.setAttribute('stroke-width', '2')
    circle.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
    return circle
  },
  getTextPosition: (x, y, size) => ({ x, y: y + 4 }),
  getTextLimit: (level) => level === 0 ? 12 : 10
}

const squareShape = {
  name: 'square', 
  displayName: 'Square',
  render: (x, y, size, color) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', (x - size).toString())
    rect.setAttribute('y', (y - size).toString())
    rect.setAttribute('width', (size * 2).toString())
    rect.setAttribute('height', (size * 2).toString())
    rect.setAttribute('fill', color)
    rect.setAttribute('stroke', '#fff')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('rx', '4')
    rect.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
    return rect
  },
  getTextPosition: (x, y, size) => ({ x, y: y + 4 }),
  getTextLimit: (level) => level === 0 ? 10 : 8
}

const diamondShape = {
  name: 'diamond',
  displayName: 'Diamond', 
  render: (x, y, size, color) => {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    const points = `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`
    polygon.setAttribute('points', points)
    polygon.setAttribute('fill', color)
    polygon.setAttribute('stroke', '#fff')
    polygon.setAttribute('stroke-width', '2')
    polygon.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
    return polygon
  },
  getTextPosition: (x, y, size) => ({ x, y: y + 4 }),
  getTextLimit: (level) => level === 0 ? 8 : 6
}

// Register shapes
shapeRegistry.set('circle', circleShape)
shapeRegistry.set('square', squareShape)
shapeRegistry.set('diamond', diamondShape)

// Professional color system
const colors = {
  root: '#2196F3',
  heading: '#4CAF50', 
  list: '#FF9800',
  text: '#9C27B0',
  concept: '#F44336',
  manual: '#E91E63'
}

// Professional SVG rendering methods
const renderMindmap = () => {
  if (!svgContainer.value) return
  
  // Use mindmap data if available, otherwise manual nodes
  const nodesToRender = props.mindmapData?.nodes || nodes.value
  if (nodesToRender.length === 0) return
  
  console.log('🎨 Rendering professional mindmap with', nodesToRender.length, 'nodes, layout:', currentLayout.value)
  console.log('🎨 Using data source:', props.mindmapData ? 'Generated mindmap data' : 'Manual nodes')
  
  // Clean up existing drag listeners before clearing
  const existingNodes = svgContainer.value.querySelectorAll('.mindmap-node-pro')
  existingNodes.forEach(node => {
    const cleanup = node._dragCleanup
    if (cleanup) cleanup()
  })
  
  // Clear previous content
  svgContainer.value.innerHTML = ''
  
  // Create responsive SVG element
  const containerRect = svgContainer.value.getBoundingClientRect()
  const containerWidth = containerRect.width || 1000
  const containerHeight = containerRect.height || 600
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
  svg.style.display = 'block'
  svg.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  svg.style.borderRadius = '12px'
  svg.style.border = '1px solid #e0e0e0'
  svg.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
  
  // Add gradient definitions
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
  gradient.setAttribute('id', 'bgGradient')
  gradient.setAttribute('x1', '0%')
  gradient.setAttribute('y1', '0%') 
  gradient.setAttribute('x2', '100%')
  gradient.setAttribute('y2', '100%')
  
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
  stop1.setAttribute('offset', '0%')
  stop1.setAttribute('stop-color', '#667eea')
  stop1.setAttribute('stop-opacity', '0.1')
  
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
  stop2.setAttribute('offset', '100%')
  stop2.setAttribute('stop-color', '#764ba2')
  stop2.setAttribute('stop-opacity', '0.1')
  
  gradient.appendChild(stop1)
  gradient.appendChild(stop2)
  defs.appendChild(gradient)
  svg.appendChild(defs)
  
  // Add background pattern
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bgRect.setAttribute('width', '100%')
  bgRect.setAttribute('height', '100%')
  bgRect.setAttribute('fill', 'url(#bgGradient)')
  svg.appendChild(bgRect)
  
  // Create main content group for zoom/pan
  const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  mainGroup.setAttribute('class', 'main-content-group')
  mainGroup.setAttribute('transform', `translate(${panX.value}, ${panY.value}) scale(${zoomLevel.value})`)
  
  // Render based on layout (pass container dimensions)
  const layoutDimensions = { width: containerWidth, height: containerHeight }
  switch (currentLayout.value) {
    case 'tree':
      renderTreeLayout(mainGroup, nodesToRender, layoutDimensions)
      break
    case 'concentric':
      renderConcentricLayout(mainGroup, nodesToRender, layoutDimensions)
      break
    case 'force':
      renderForceLayout(mainGroup, nodesToRender, layoutDimensions)
      break
    case 'radial':
    default:
      renderRadialLayout(mainGroup, nodesToRender, layoutDimensions)
      break
  }
  
  // Add connections from mindmap data only
  if (props.mindmapData?.connections) {
    renderConnections(mainGroup, props.mindmapData.connections, nodesToRender)
  }
  
  // Render milestone containers
  renderMilestoneContainers(mainGroup, nodesToRender)
  
  // Add responsive title (outside zoom group)
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  title.setAttribute('x', (containerWidth / 2).toString())
  title.setAttribute('y', '30')
  title.setAttribute('text-anchor', 'middle')
  title.style.fontSize = `${Math.max(14, Math.min(20, containerWidth / 60))}px`
  title.style.fontWeight = 'bold'
  title.style.fill = '#fff'
  title.style.filter = 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))'
  const sourceType = props.mindmapData?.metadata?.sourceType || 'manual'
  title.textContent = `${sourceType.toUpperCase()} MINDMAP (${nodesToRender.length} nodes) - ${currentLayout.value.toUpperCase()}`
  svg.appendChild(title)
  
  // Append main group to SVG
  svg.appendChild(mainGroup)
  
  // Add click handler to SVG for deselecting nodes
  svg.addEventListener('click', (e) => {
    // Only handle clicks on the background (not on nodes)
    if (e.target === svg || e.target === mainGroup) {
      selectedNodeId.value = null
      emit('canvas-clicked')
      updateNodeSelection()
    }
  })
  
  // Add canvas navigation: mouse wheel zoom and right-click drag to pan
  addCanvasNavigation(svg, mainGroup)
  
  svgContainer.value.appendChild(svg)
  console.log('🎨 ✅ Professional mindmap rendered successfully')
  
  // Update selection state after rendering
  nextTick(() => {
    updateNodeSelection()
  })
}

// Helper function to check if layout creates its own connections
const isLayoutWithOwnConnections = (layout) => {
  // No layouts create their own connections anymore
  // All layouts use mindmap data connections only
  return false
}

// Professional Layout Algorithms
const renderRadialLayout = (svg, nodeList, dimensions = { width: 1000, height: 600 }) => {
  console.log('🌟 Rendering hierarchical radial layout with responsive dimensions')
  const centerX = dimensions.width / 2
  const centerY = dimensions.height / 2
  
  if (nodeList.length === 1) {
    const node = nodeList[0]
    node.x = centerX
    node.y = centerY
    createNode(svg, node, centerX, centerY)
    return
  }
  
  // Separate generated nodes (from document) from manual nodes (user created)
  const generatedNodes = nodeList.filter(node => node.type !== 'manual')
  const manualIndependentNodes = nodeList.filter(node => node.type === 'manual' && !node.parent)
  const manualChildNodes = nodeList.filter(node => node.type === 'manual' && node.parent)
  
  // Handle generated nodes with hierarchy
  let levels = {}
  let maxLevel = 0
  
  if (generatedNodes.length > 0) {
    generatedNodes.forEach(node => {
      const level = node.level || 1
      if (!levels[level]) levels[level] = []
      levels[level].push(node)
      maxLevel = Math.max(maxLevel, level)
    })
    
    const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b)
    
    levelKeys.forEach((level, levelIndex) => {
      const nodesAtLevel = levels[level]
      const radius = levelIndex * 120 + (levelIndex === 0 ? 0 : 100)
      
      if (levelIndex === 0 && nodesAtLevel.length > 0) {
        // Center node (root)
        const rootNode = nodesAtLevel[0]
        const preserved = preservedPositions.value.get(rootNode.id)
        if (preserved) {
          rootNode.x = preserved.x
          rootNode.y = preserved.y
          console.log(`🔄 Using preserved position for root ${rootNode.id}: (${rootNode.x}, ${rootNode.y})`)
        } else {
          rootNode.x = centerX
          rootNode.y = centerY
        }
        createNode(svg, rootNode, rootNode.x, rootNode.y)
      } else {
        // Arrange nodes in circle for this level
        nodesAtLevel.forEach((node, nodeIndex) => {
          const preserved = preservedPositions.value.get(node.id)
          if (preserved) {
            node.x = preserved.x
            node.y = preserved.y
            console.log(`🔄 Using preserved position for ${node.id}: (${node.x}, ${node.y})`)
          } else {
            const angle = (nodeIndex / nodesAtLevel.length) * 2 * Math.PI
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            
            node.x = x
            node.y = y
          }
          createNode(svg, node, node.x, node.y)
        })
      }
    })
  }
  
  // Handle manual independent nodes - place them in outer ring
  if (manualIndependentNodes.length > 0) {
    const outerRadius = 300 + (generatedNodes.length > 0 ? maxLevel * 120 : 0)
    
    manualIndependentNodes.forEach((node, index) => {
      const preserved = preservedPositions.value.get(node.id)
      if (preserved) {
        node.x = preserved.x
        node.y = preserved.y
        console.log(`🔄 Using preserved position for manual ${node.id}: (${node.x}, ${node.y})`)
      } else if (node.x === undefined || node.y === undefined) {
        // Only auto-position if node doesn't already have position (new nodes)
        const angle = (index / manualIndependentNodes.length) * 2 * Math.PI
        node.x = centerX + Math.cos(angle) * outerRadius
        node.y = centerY + Math.sin(angle) * outerRadius
      }
      createNode(svg, node, node.x, node.y)
    })
  }
  
  // Handle manual child nodes (connected to parents)
  manualChildNodes.forEach(node => {
    if (node.x !== undefined && node.y !== undefined) {
      createNode(svg, node, node.x, node.y)
    }
  })
}

const renderTreeLayout = (svg, nodeList, dimensions = { width: 1000, height: 600 }) => {
  console.log('🌳 Rendering proper hierarchical tree layout')
  
  if (nodeList.length === 0) return
  
  // Separate generated nodes and manual nodes
  const generatedNodes = nodeList.filter(node => node.type !== 'manual')
  const manualNodes = nodeList.filter(node => node.type === 'manual')
  
  // 1. Layout generated nodes as a tree
  if (generatedNodes.length > 0) {
    // Group by levels
    const levels = {}
    let maxLevel = 0
    generatedNodes.forEach(node => {
      const level = node.level || 1
      maxLevel = Math.max(maxLevel, level)
      if (!levels[level]) levels[level] = []
      levels[level].push(node)
    })
    
    const levelHeight = Math.min(120, dimensions.height / (maxLevel + 2))
    const startY = 80
    
    // Position nodes level by level
    for (let level = 1; level <= maxLevel; level++) {
      const levelNodes = levels[level] || []
      if (levelNodes.length === 0) continue
      
      const y = startY + (level - 1) * levelHeight
      const totalWidth = dimensions.width * 0.8
      const nodeSpacing = totalWidth / (levelNodes.length + 1)
      const startX = dimensions.width * 0.1
      
      levelNodes.forEach((node, index) => {
        const preserved = preservedPositions.value.get(node.id)
        if (preserved) {
          node.x = preserved.x
          node.y = preserved.y
          console.log(`🔄 Using preserved position for tree ${node.id}: (${node.x}, ${node.y})`)
        } else {
          node.x = startX + nodeSpacing * (index + 1)
          node.y = y
        }
        console.log('🌳 Creating tree node:', { id: node.id, text: node.text, name: node.name, level: node.level, x: node.x, y: node.y })
        createNode(svg, node, node.x, node.y)
      })
    }
  }
  
  // 2. Layout manual nodes in available space
  if (manualNodes.length > 0) {
    const startY = generatedNodes.length > 0 ? 80 + (Math.max(...generatedNodes.map(n => n.level || 1)) * 120) + 60 : 80
    const manualSpacing = 100
    
    manualNodes.forEach((node, index) => {
      const preserved = preservedPositions.value.get(node.id)
      if (preserved) {
        node.x = preserved.x
        node.y = preserved.y
        console.log(`🔄 Using preserved position for manual tree ${node.id}: (${node.x}, ${node.y})`)
      } else if (node.x === undefined || node.y === undefined) {
        const cols = Math.ceil(Math.sqrt(manualNodes.length))
        const row = Math.floor(index / cols)
        const col = index % cols
        
        node.x = 100 + col * manualSpacing
        node.y = startY + row * manualSpacing
      }
      createNode(svg, node, node.x, node.y)
    })
  }
}

const renderConcentricLayout = (svg, nodeList, dimensions = { width: 1000, height: 600 }) => {
  console.log('🎯 Rendering concentric layout (positions only, connections handled separately) with responsive dimensions')
  
  const centerX = dimensions.width / 2
  const centerY = dimensions.height / 2
  const ringSpacing = Math.min(dimensions.width, dimensions.height) / 8
  
  nodeList.forEach((node, index) => {
    const ring = Math.floor(index / 8) // 8 nodes per ring
    const positionInRing = index % 8
    const radius = ring === 0 ? 0 : ring * ringSpacing
    
    if (radius === 0) {
      node.x = centerX
      node.y = centerY
    } else {
      const angle = (positionInRing / 8) * 2 * Math.PI
      node.x = centerX + Math.cos(angle) * radius
      node.y = centerY + Math.sin(angle) * radius
    }
    
    createNode(svg, node, node.x, node.y)
    
    // Don't create connections here - let renderConnections handle it
  })
}

const renderForceLayout = (svg, nodeList, dimensions = { width: 1000, height: 600 }) => {
  console.log('⚡ Rendering force layout (positions only, connections handled separately) with responsive dimensions')
  
  // Simple force simulation
  nodeList.forEach((node, index) => {
    // Distributed grid with some randomness
    const cols = Math.ceil(Math.sqrt(nodeList.length))
    const row = Math.floor(index / cols)
    const col = index % cols
    
    const spacing = Math.min(dimensions.width, dimensions.height) / 6
    const offsetX = (dimensions.width - (cols - 1) * spacing) / 2
    const offsetY = dimensions.height * 0.2
    
    node.x = offsetX + col * spacing + (Math.random() - 0.5) * 50
    node.y = offsetY + row * spacing + (Math.random() - 0.5) * 50
    
    createNode(svg, node, node.x, node.y)
    
    // Don't create connections here - let renderConnections handle it
  })
}

// Node creation with professional shape system
const createNode = (svg, node, x, y) => {
  node.x = x
  node.y = y
  
  const shape = shapeRegistry.get(currentShape.value) || shapeRegistry.get('circle')
  const size = node.level === 0 ? 40 : 30
  const color = colors[node.type] || colors.manual
  
  // Create node group
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.setAttribute('class', 'mindmap-node-pro')
  group.setAttribute('data-node-id', node.id)
  group.style.cursor = 'grab'
  // Removed transition to prevent interference with dragging
  
  // Create shape
  const shapeElement = shape.render(x, y, size, color)
  group.appendChild(shapeElement)
  
  // Create text
  const textPos = shape.getTextPosition(x, y, size)
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  text.setAttribute('x', textPos.x.toString())
  text.setAttribute('y', textPos.y.toString())
  text.setAttribute('text-anchor', 'middle')
  text.style.fontSize = node.level === 0 ? '14px' : '12px'
  text.style.fontWeight = node.level === 0 ? 'bold' : 'normal'
  text.style.fill = '#fff'
  text.style.pointerEvents = 'none'
  text.style.filter = 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))'
  
  // Truncate text
  const textLimit = shape.getTextLimit(node.level)
  let displayText = node.text || node.name || node.id || 'Untitled'
  if (displayText && displayText.length > textLimit) {
    displayText = displayText.substring(0, textLimit - 3) + '...'
  }
  text.textContent = displayText
  
  group.appendChild(text)
  
  // Add tooltip
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
  title.textContent = `${node.type.toUpperCase()}: ${node.text}`
  group.appendChild(title)
  
  // CLICK SELECTION - Add click handler
  group.addEventListener('click', (e) => {
    selectedNodeId.value = node.id
    emit('node-selected', node.id)
    console.log('🎨 Node selected:', node.text)
    updateNodeSelection()
    e.stopPropagation()
  })
  
  // SIMPLE HOVER EFFECTS - NO TRANSFORMS, JUST VISUAL
  group.addEventListener('mouseenter', () => {
    if (!isDragInProgress.value && draggedNodeId.value !== node.id) {
      // Only change filter, no transforms
      shapeElement.style.filter = 'drop-shadow(0px 4px 8px rgba(0,0,0,0.3)) brightness(1.1)'
      group.style.cursor = 'grab'
    }
  })
  
  group.addEventListener('mouseleave', () => {
    if (!isDragInProgress.value && draggedNodeId.value !== node.id) {
      // Reset filter only
      shapeElement.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
    }
  })
  
  // Add drag behavior
  addDragBehavior(group, node, svg)
  
  svg.appendChild(group)
}

// Render connections from mindmap data
const renderConnections = (svg, connections, nodeList) => {
  console.log('🔗 Rendering', connections.length, 'connections')
  connections.forEach(conn => {
    const fromNode = nodeList.find(n => n.id === conn.from)
    const toNode = nodeList.find(n => n.id === conn.to)
    
    if (fromNode && toNode && fromNode.x !== undefined && toNode.x !== undefined) {
      createConnection(svg, fromNode, toNode)
    }
  })
}

// Professional connection creation with proper ID tracking
const createConnection = (svg, fromNode, toNode, isTreeConnection = false) => {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  
  // Calculate line endpoints to stop at circle edges (not center)
  const nodeRadius = 30 // Circle radius
  const dx = toNode.x - fromNode.x
  const dy = toNode.y - fromNode.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Normalize direction vector
  const unitX = dx / distance
  const unitY = dy / distance
  
  // Calculate start and end points at circle edges
  const startX = fromNode.x + unitX * nodeRadius
  const startY = fromNode.y + unitY * nodeRadius
  const endX = toNode.x - unitX * nodeRadius
  const endY = toNode.y - unitY * nodeRadius
  
  line.setAttribute('x1', startX.toString())
  line.setAttribute('y1', startY.toString())
  line.setAttribute('x2', endX.toString())
  line.setAttribute('y2', endY.toString())
  line.setAttribute('stroke', isTreeConnection ? '#4CAF50' : 'rgba(255,255,255,0.6)')
  line.setAttribute('stroke-width', '3')
  line.setAttribute('stroke-linecap', 'round')
  line.setAttribute('class', 'connection-line')
  line.setAttribute('data-connection-id', `${fromNode.id}-${toNode.id}`) // ADD ID FOR TRACKING
  line.style.filter = 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))'
  
  // Add arrow marker - SMALLER AND CLEANER
  const markerId = `arrow-${fromNode.id}-${toNode.id}-${Date.now()}`
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  marker.setAttribute('id', markerId)
  marker.setAttribute('markerWidth', '6')  // Reduced from 10
  marker.setAttribute('markerHeight', '6')  // Reduced from 10
  marker.setAttribute('refX', '5')         // Adjusted for smaller size
  marker.setAttribute('refY', '2')         // Adjusted for smaller size
  marker.setAttribute('orient', 'auto')
  
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  arrow.setAttribute('points', '0 0, 6 2, 0 4')  // Smaller triangle
  arrow.setAttribute('fill', 'rgba(255,255,255,0.9)')  // Slightly more opaque
  
  marker.appendChild(arrow)
  svg.appendChild(marker)
  line.setAttribute('marker-end', `url(#${markerId})`)
  
  svg.appendChild(line)
}

// SMOOTH SVG-BASED DRAG SYSTEM - COMPLETELY REWRITTEN
const addDragBehavior = (nodeGroup, nodeData, svg) => {
  let isDragging = false
  let startMouseX = 0
  let startMouseY = 0
  
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only left mouse button
    
    console.log('🖱️ Smooth drag start on:', nodeData.text)
    
    isDragging = true
    startMouseX = e.clientX
    startMouseY = e.clientY
    
    isDragInProgress.value = true
    draggedNodeId.value = nodeData.id
    selectedNodeId.value = nodeData.id
    
    emit('node-selected', nodeData.id)
    
    // Visual feedback
    nodeGroup.style.cursor = 'grabbing'
    nodeGroup.style.opacity = '0.8'
    
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleMouseMove = (e) => {
    if (!isDragging) return
    
    // Calculate movement delta
    const deltaX = e.clientX - startMouseX
    const deltaY = e.clientY - startMouseY
    
    // Update node data position directly
    const newX = nodeData.x + deltaX
    const newY = nodeData.y + deltaY
    
    // Allow dragging anywhere on the canvas (remove boundaries)
    // Users can pan/zoom to navigate to different areas
    nodeData.x = newX
    nodeData.y = newY
    
    // Update ALL child elements positions directly (SVG approach)
    const shape = nodeGroup.children[0] // The shape element
    const text = nodeGroup.children[1]  // The text element
    
    if (shape.tagName === 'circle') {
      shape.setAttribute('cx', nodeData.x.toString())
      shape.setAttribute('cy', nodeData.y.toString())
    } else if (shape.tagName === 'rect') {
      const size = 30
      shape.setAttribute('x', (nodeData.x - size).toString())
      shape.setAttribute('y', (nodeData.y - size).toString())
    } else if (shape.tagName === 'polygon') {
      const size = 30
      const points = `${nodeData.x},${nodeData.y - size} ${nodeData.x + size},${nodeData.y} ${nodeData.x},${nodeData.y + size} ${nodeData.x - size},${nodeData.y}`
      shape.setAttribute('points', points)
    }
    
    // Update text position
    text.setAttribute('x', nodeData.x.toString())
    text.setAttribute('y', (nodeData.y + 4).toString())
    
    // Update start position for next frame
    startMouseX = e.clientX
    startMouseY = e.clientY
    
    // Update connections in real-time during drag
    updateConnections(svg, nodeData.id)
    
    e.preventDefault()
  }
  
  const handleMouseUp = (e) => {
    if (!isDragging) return
    
    console.log('🖱️ Smooth drag end on:', nodeData.text, 'final position:', nodeData.x, nodeData.y)
    
    isDragging = false
    isDragInProgress.value = false
    draggedNodeId.value = null
    
    // Reset visual state
    nodeGroup.style.cursor = 'grab'
    nodeGroup.style.opacity = '1'
    
    // Snap to grid for cleaner positioning
    const gridSize = 20
    nodeData.x = Math.round(nodeData.x / gridSize) * gridSize
    nodeData.y = Math.round(nodeData.y / gridSize) * gridSize
    
    // No boundary restrictions - let users pan/zoom to navigate
    // Grid snapping is still applied for clean positioning
    
    // Final position update after snapping
    const shape = nodeGroup.children[0]
    const text = nodeGroup.children[1]
    
    if (shape.tagName === 'circle') {
      shape.setAttribute('cx', nodeData.x.toString())
      shape.setAttribute('cy', nodeData.y.toString())
    } else if (shape.tagName === 'rect') {
      const size = 30
      shape.setAttribute('x', (nodeData.x - size).toString())
      shape.setAttribute('y', (nodeData.y - size).toString())
    } else if (shape.tagName === 'polygon') {
      const size = 30
      const points = `${nodeData.x},${nodeData.y - size} ${nodeData.x + size},${nodeData.y} ${nodeData.x},${nodeData.y + size} ${nodeData.x - size},${nodeData.y}`
      shape.setAttribute('points', points)
    }
    
    text.setAttribute('x', nodeData.x.toString())
    text.setAttribute('y', (nodeData.y + 4).toString())
    
    // Save the manual position for this node
    preservedPositions.value.set(nodeData.id, { x: nodeData.x, y: nodeData.y })
    console.log(`💾 Saved position: ${nodeData.id} at (${nodeData.x}, ${nodeData.y})`)
    
    // Final connection update after snapping
    updateConnections(svg, nodeData.id)
    
    e.preventDefault()
    e.stopPropagation()
  }
  
  // Add event listeners directly to the node group
  nodeGroup.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  // Store cleanup function
  nodeGroup._dragCleanup = () => {
    nodeGroup.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}

// Update node position
const updateNodePosition = (nodeGroup, x, y) => {
  nodeGroup.setAttribute('transform', `translate(${x - (nodeGroup._originalX || 0)}, ${y - (nodeGroup._originalY || 0)})`)
}

// Update connections when nodes move - PROPERLY IMPLEMENTED WITH EDGE CALCULATION
const updateConnections = (svg, nodeId) => {
  if (!props.mindmapData?.connections) return
  
  // Find all connections involving this node
  const relevantConnections = props.mindmapData.connections.filter(conn => 
    conn.from === nodeId || conn.to === nodeId
  )
  
  relevantConnections.forEach(connection => {
    // Find the connection line element
    const connectionLine = svg.querySelector(`[data-connection-id="${connection.from}-${connection.to}"]`)
    if (!connectionLine) return
    
    // Find the nodes involved
    const nodesToRender = props.mindmapData?.nodes || nodes.value
    const fromNode = nodesToRender.find(n => n.id === connection.from)
    const toNode = nodesToRender.find(n => n.id === connection.to)
    
    if (fromNode && toNode) {
      // Calculate line endpoints to stop at circle edges (same logic as createConnection)
      const nodeRadius = 30
      const dx = toNode.x - fromNode.x
      const dy = toNode.y - fromNode.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 0) { // Avoid division by zero
        const unitX = dx / distance
        const unitY = dy / distance
        
        const startX = fromNode.x + unitX * nodeRadius
        const startY = fromNode.y + unitY * nodeRadius
        const endX = toNode.x - unitX * nodeRadius
        const endY = toNode.y - unitY * nodeRadius
        
        connectionLine.setAttribute('x1', startX.toString())
        connectionLine.setAttribute('y1', startY.toString())
        connectionLine.setAttribute('x2', endX.toString())
        connectionLine.setAttribute('y2', endY.toString())
      }
    }
  })
}

// Public methods
const addNode = () => {
  console.log('🎨 Adding independent node to professional canvas')
  
  if (!svgContainer.value) return
  
  // Get container dimensions for smart positioning
  const containerRect = svgContainer.value.getBoundingClientRect()
  const centerX = (containerRect.width || 1000) / 2
  const centerY = (containerRect.height || 600) / 2
  
  // Position new independent nodes away from center to avoid overlap
  const angle = Math.random() * 2 * Math.PI
  const distance = 200 + Math.random() * 100
  const x = centerX + Math.cos(angle) * distance
  const y = centerY + Math.sin(angle) * distance
  
  const newNode = {
    id: `node_${Date.now()}`,
    text: `New Topic ${nodes.value.length + 1}`,
    x: Math.max(80, Math.min((containerRect.width || 1000) - 80, x)),
    y: Math.max(80, Math.min((containerRect.height || 600) - 80, y)),
    type: 'manual'
  }
  
  // Add to the appropriate data source (not both!)
  if (props.mindmapData?.nodes) {
    // If we have mindmap data, add to that only
    props.mindmapData.nodes.push(newNode)
  } else {
    // Otherwise add to manual nodes only
    nodes.value.push(newNode)
  }
  
  emit('nodes-changed', nodes.value)
  
  // Re-render the canvas
  renderMindmap()
  
  // Auto-select the new node
  selectedNodeId.value = newNode.id
  console.log('🎨 ✅ Independent node created and selected:', newNode.text)
}

const addChildNode = () => {
  console.log('🎨 Adding child node to selected parent')
  
  if (!selectedNodeId.value) {
    console.warn('🎨 ⚠️ No node selected for adding child')
    return
  }
  
  if (!svgContainer.value) return
  
  // Find parent node
  const nodesToSearch = props.mindmapData?.nodes || nodes.value
  const parentNode = nodesToSearch.find(n => n.id === selectedNodeId.value)
  
  if (!parentNode) {
    console.warn('🎨 ⚠️ Selected node not found')
    return
  }
  
  // Position child node intelligently based on layout
  const childDistance = 120
  let childX, childY
  
  if (currentLayout.value === 'radial') {
    // For radial layout, position children in a circle around parent
    const containerRect = svgContainer.value.getBoundingClientRect()
    const centerX = (containerRect.width || 1000) / 2
    const centerY = (containerRect.height || 600) / 2
    
    // Find existing children of this parent to avoid overlap
    const existingChildren = (props.mindmapData?.nodes || nodes.value).filter(n => n.parent === parentNode.id)
    const childIndex = existingChildren.length
    
    // Position children in a radial pattern around parent
    const angleStep = (2 * Math.PI) / Math.max(6, childIndex + 3) // At least 6 positions
    const baseAngle = Math.atan2(parentNode.y - centerY, parentNode.x - centerX) // Parent's angle from center
    const childAngle = baseAngle + (childIndex * angleStep) + (Math.PI / 6) // Offset slightly
    
    childX = parentNode.x + Math.cos(childAngle) * childDistance
    childY = parentNode.y + Math.sin(childAngle) * childDistance
  } else {
    // For other layouts, use random positioning around parent
    const angle = Math.random() * 2 * Math.PI
    childX = parentNode.x + Math.cos(angle) * childDistance
    childY = parentNode.y + Math.sin(angle) * childDistance
  }
  
  // Get container bounds
  const containerRect = svgContainer.value.getBoundingClientRect()
  const maxX = (containerRect.width || 1000) - 80
  const maxY = (containerRect.height || 600) - 80
  
  const childNode = {
    id: `node_${Date.now()}`,
    text: `Child of ${parentNode.text}`,
    x: Math.max(80, Math.min(maxX, childX)),
    y: Math.max(80, Math.min(maxY, childY)),
    type: 'manual',
    parent: parentNode.id
  }
  
  // Add to the appropriate data source (not both!)
  if (props.mindmapData?.nodes) {
    // If we have mindmap data, add to that only
    props.mindmapData.nodes.push(childNode)
    
    // Add connection to mindmap data
    if (!props.mindmapData.connections) {
      props.mindmapData.connections = []
    }
    props.mindmapData.connections.push({
      from: parentNode.id,
      to: childNode.id,
      type: 'parent-child'
    })
  } else {
    // Otherwise add to manual nodes only
    nodes.value.push(childNode)
    
    // Add connection to manual connections
    connections.value.push({
      from: parentNode.id,
      to: childNode.id,
      type: 'parent-child'
    })
  }
  
  emit('nodes-changed', nodes.value)
  
  // Re-render the canvas
  renderMindmap()
  
  // Select the new child node
  selectedNodeId.value = childNode.id
  console.log('🎨 ✅ Child node created and selected:', childNode.text)
}

const updateNodeSelection = () => {
  if (!svgContainer.value) return
  
  // Remove previous selection indicators
  const existingSelections = svgContainer.value.querySelectorAll('.node-selection-ring')
  existingSelections.forEach(ring => ring.remove())
  
  if (!selectedNodeId.value) return
  
  // Find selected node group
  const selectedNodeGroup = svgContainer.value.querySelector(`[data-node-id="${selectedNodeId.value}"]`)
  if (!selectedNodeGroup) return
  
  // Create selection ring
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  ring.setAttribute('class', 'node-selection-ring')
  ring.setAttribute('cx', '0')
  ring.setAttribute('cy', '0')
  ring.setAttribute('r', '40')
  ring.setAttribute('fill', 'none')
  ring.setAttribute('stroke', '#667eea')
  ring.setAttribute('stroke-width', '3')
  ring.setAttribute('stroke-dasharray', '5,5')
  ring.style.animation = 'pulse 2s infinite'
  
  selectedNodeGroup.appendChild(ring)
}

// Zoom and Pan methods
const zoomIn = () => {
  zoomLevel.value = Math.min(3, zoomLevel.value * 1.2)
  applyZoomAndPan()
}

const zoomOut = () => {
  zoomLevel.value = Math.max(0.3, zoomLevel.value / 1.2)
  applyZoomAndPan()
}

const resetZoom = () => {
  zoomLevel.value = 1
  panX.value = 0
  panY.value = 0
  applyZoomAndPan()
}

const applyZoomAndPan = () => {
  if (!svgContainer.value) return
  
  const svg = svgContainer.value.querySelector('svg')
  if (!svg) return
  
  const transform = `translate(${panX.value}, ${panY.value}) scale(${zoomLevel.value})`
  
  // Apply transform to all content within the SVG
  const mainGroup = svg.querySelector('.main-content-group')
  if (mainGroup) {
    mainGroup.setAttribute('transform', transform)
  } else {
    // Create a main group if it doesn't exist
    const existingContent = Array.from(svg.children)
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    mainGroup.setAttribute('class', 'main-content-group')
    mainGroup.setAttribute('transform', transform)
    
    // Move all existing content into the group
    existingContent.forEach(element => {
      if (element.tagName !== 'defs') { // Keep defs outside the transform group
        mainGroup.appendChild(element)
      }
    })
    
    svg.appendChild(mainGroup)
  }
}

const clearCanvas = () => {
  console.log('🎨 Clearing professional canvas')
  nodes.value = []
  connections.value = []
  selectedNodeId.value = null
  
  if (svgContainer.value) {
    svgContainer.value.innerHTML = ''
  }
  
  emit('nodes-changed', nodes.value)
}

const exportMindmap = () => {
  const mermaidCode = exportToMermaid()
  emit('export-request', mermaidCode)
}

const exportToMermaid = () => {
  console.log('🎨 Exporting professional canvas to Mermaid')
  
  if (nodes.value.length === 0) return ''
  
  let mermaid = 'mindmap\n'
  
  if (nodes.value.length === 1) {
    mermaid += `  root((${nodes.value[0].text}))\n`
  } else {
    const rootNode = nodes.value[0]
    mermaid += `  root((${rootNode.text}))\n`
    
    for (let i = 1; i < nodes.value.length; i++) {
      const node = nodes.value[i]
      mermaid += `    ${node.text}\n`
    }
  }
  
  return mermaid
}

// Handle layout and shape changes
const handleLayoutChange = () => {
  console.log('🎨 Layout changed to:', currentLayout.value)
  if (hasNodes.value) {
    renderMindmap()
  }
}

const handleShapeChange = () => {
  console.log('🎨 Shape changed to:', currentShape.value)
  if (hasNodes.value) {
    renderMindmap()
  }
}

// Watch for prop changes
watch(() => props.layout, (newLayout) => {
  console.log('🎨 Layout prop changed to:', newLayout)
  currentLayout.value = newLayout
  // Don't auto-render here - let parent control rendering
})

watch(() => props.nodeShape, (newShape) => {
  console.log('🎨 Shape prop changed to:', newShape)
  currentShape.value = newShape
  // Don't auto-render here - let parent control rendering
})

// TEMPORARY: Disable watcher to stop infinite loop
// The parent component should call renderMindmap() explicitly when data changes
/*
watch(() => props.mindmapData, (newData) => {
  if (!newData || !newData.nodes || newData.nodes.length === 0) return
  
  // Create a unique ID for this data set
  const dataId = `${newData.nodes.length}-${newData.metadata?.generatedAt || Date.now()}`
  
  // Only render if we haven't already rendered this exact data
  if (dataId !== lastRenderedDataId.value) {
    console.log('🎨 New mindmap data detected, rendering once')
    lastRenderedDataId.value = dataId
    renderMindmap()
  } else {
    console.log('🎨 Same mindmap data, skipping render')
  }
}, { immediate: true })
*/

// Canvas navigation system
const addCanvasNavigation = (svg, mainGroup) => {
  let isPanning = false
  let lastPanX = 0
  let lastPanY = 0
  
  // Mouse wheel zoom
  svg.addEventListener('wheel', (e) => {
    e.preventDefault()
    
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel.value * zoomFactor))
    
    // Calculate zoom center point
    const beforeZoomX = (mouseX - panX.value) / zoomLevel.value
    const beforeZoomY = (mouseY - panY.value) / zoomLevel.value
    
    // Update zoom
    zoomLevel.value = newZoom
    
    // Adjust pan to keep mouse position stable
    panX.value = mouseX - beforeZoomX * newZoom
    panY.value = mouseY - beforeZoomY * newZoom
    
    applyZoomAndPan()
    console.log(`🔍 Mouse wheel zoom: ${newZoom.toFixed(2)} at (${mouseX}, ${mouseY})`)
  })
  
  // Handle mouse down for different modes
  svg.addEventListener('mousedown', (e) => {
    if (e.button === 2 || e.button === 1) { 
      // Right click or middle click - always pan
      e.preventDefault()
      isPanning = true
      lastPanX = e.clientX
      lastPanY = e.clientY
      svg.style.cursor = 'grabbing'
      console.log('🤏 Started panning')
    } else if (e.button === 0 && props.milestoneMode) {
      // Left click in milestone mode - start selection
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      selectionStart.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      selectionCurrent.value = { ...selectionStart.value }
      isSelectingMilestone.value = true
      svg.style.cursor = 'crosshair'
      
      emit('milestone-selection-start', selectionStart.value)
      console.log('🏁 Started milestone selection at:', selectionStart.value)
    }
  })
  
  svg.addEventListener('mousemove', (e) => {
    if (isPanning) {
      e.preventDefault()
      const deltaX = e.clientX - lastPanX
      const deltaY = e.clientY - lastPanY
      
      panX.value += deltaX
      panY.value += deltaY
      
      lastPanX = e.clientX
      lastPanY = e.clientY
      
      applyZoomAndPan()
    } else if (isSelectingMilestone.value) {
      // Update milestone selection
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      selectionCurrent.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      
      const selectionBounds = {
        x: Math.min(selectionStart.value.x, selectionCurrent.value.x),
        y: Math.min(selectionStart.value.y, selectionCurrent.value.y),
        width: Math.abs(selectionCurrent.value.x - selectionStart.value.x),
        height: Math.abs(selectionCurrent.value.y - selectionStart.value.y)
      }
      
      emit('milestone-selection-update', selectionBounds)
    }
  })
  
  svg.addEventListener('mouseup', (e) => {
    if (e.button === 2 || e.button === 1) {
      isPanning = false
      svg.style.cursor = 'default'
      console.log('🤏 Stopped panning')
    } else if (e.button === 0 && isSelectingMilestone.value) {
      // End milestone selection
      isSelectingMilestone.value = false
      svg.style.cursor = props.milestoneMode ? 'crosshair' : 'default'
      
      // Find nodes within selection bounds
      const selectionBounds = {
        x: Math.min(selectionStart.value.x, selectionCurrent.value.x),
        y: Math.min(selectionStart.value.y, selectionCurrent.value.y),
        width: Math.abs(selectionCurrent.value.x - selectionStart.value.x),
        height: Math.abs(selectionCurrent.value.y - selectionStart.value.y)
      }
      
      const selectedNodeIds = findNodesInSelection(selectionBounds)
      emit('milestone-selection-end', selectedNodeIds)
      console.log('🏁 Milestone selection ended, selected nodes:', selectedNodeIds)
    }
  })
  
  // Prevent context menu on right click
  svg.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
  
  console.log('🗺️ Canvas navigation enabled: Mouse wheel = zoom, Right-click drag = pan')
}

// Find nodes within selection bounds using screen coordinates (like original @renderer)
const findNodesInSelection = (bounds) => {
  const selectedIds = []
  
  if (!svgContainer.value) return selectedIds
  
  // Convert SVG-local selection bounds to screen coordinates
  const containerRect = svgContainer.value.getBoundingClientRect()
  const selRect = {
    left: containerRect.left + bounds.x,
    top: containerRect.top + bounds.y,
    right: containerRect.left + bounds.x + bounds.width,
    bottom: containerRect.top + bounds.y + bounds.height
  }
  
  console.log(`🏁 Selection screen bounds: left=${selRect.left}, top=${selRect.top}, right=${selRect.right}, bottom=${selRect.bottom}`)
  
  // Get all visual node elements
  const nodeElements = svgContainer.value.querySelectorAll('[data-node-id]')
  
  nodeElements.forEach(nodeElement => {
    const nodeId = nodeElement.getAttribute('data-node-id')
    
    // Skip milestone nodes
    if (nodeId && nodeId.startsWith('milestone_')) return
    
    // Get screen coordinates of the node element
    const nodeRect = nodeElement.getBoundingClientRect()
    const cx = nodeRect.left + nodeRect.width / 2
    const cy = nodeRect.top + nodeRect.height / 2
    
    // Check if node center is within selection bounds (both in screen space)
    if (cx >= selRect.left && cx <= selRect.right && cy >= selRect.top && cy <= selRect.bottom) {
      selectedIds.push(nodeId)
      console.log(`🏁 Selected node ${nodeId} at screen position (${cx}, ${cy})`)
    } else {
      console.log(`🏁 Node ${nodeId} at screen position (${cx}, ${cy}) -> excluded`)
    }
  })
  
  console.log(`🏁 Found ${selectedIds.length} nodes in selection:`, selectedIds)
  
  return selectedIds
}

// Render milestone containers around grouped nodes
const renderMilestoneContainers = (svg, allNodes) => {
  if (!props.mindmapData?.nodes) return
  
  console.log('🏁 renderMilestoneContainers called with', allNodes.length, 'nodes')
  console.log('🏁 All nodes positions:', allNodes.map(n => ({ id: n.id, x: n.x, y: n.y, text: n.text || n.name })))
  
  // Find all milestones from the dedicated milestones array
  const milestones = props.mindmapData.milestones || []
  
  console.log('🏁 Rendering', milestones.length, 'milestone containers')
  
  // Remove existing milestone containers to avoid duplicates
  svg.querySelectorAll('.milestone-container, .milestone-title, .milestone-hit-area').forEach(el => el.remove())
  
  milestones.forEach(milestone => {
    const groupedNodeIds = new Set(milestone.groupedNodes)
    
    console.log('🏁 Processing milestone:', milestone.id, 'with grouped node IDs:', milestone.groupedNodes)
    
    // Get actual visual positions from the DOM instead of stored coordinates
    const visualPositions = []
    groupedNodeIds.forEach(nodeId => {
      const nodeElement = svg.querySelector(`[data-node-id="${nodeId}"]`)
      if (nodeElement) {
        // For circles, get cx, cy
        const circle = nodeElement.querySelector('circle')
        if (circle) {
          const x = parseFloat(circle.getAttribute('cx'))
          const y = parseFloat(circle.getAttribute('cy'))
          visualPositions.push({ id: nodeId, x, y })
          console.log(`🏁 Visual position for ${nodeId}: (${x}, ${y})`)
        }
      } else {
        console.log(`🏁 Warning: No visual element found for node ${nodeId}`)
      }
    })
    
    if (visualPositions.length === 0) {
      console.log('🏁 Milestone', milestone.id, 'has no visual nodes')
      return
    }
    
    // Calculate bounding box from visual positions
    const padding = 40
    const minX = Math.min(...visualPositions.map(n => n.x)) - padding
    const minY = Math.min(...visualPositions.map(n => n.y)) - padding
    const maxX = Math.max(...visualPositions.map(n => n.x)) + padding
    const maxY = Math.max(...visualPositions.map(n => n.y)) + padding
    const width = maxX - minX
    const height = maxY - minY
    
    console.log('🏁 Milestone container bounds from visual positions:', { minX, minY, maxX, maxY, width, height })
    
    // Create beautiful milestone container
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    container.setAttribute('x', minX.toString())
    container.setAttribute('y', minY.toString())
    container.setAttribute('width', width.toString())
    container.setAttribute('height', height.toString())
    
    console.log('🏁 Created milestone container element with attributes:', {
      x: container.getAttribute('x'),
      y: container.getAttribute('y'), 
      width: container.getAttribute('width'),
      height: container.getAttribute('height')
    })
    container.setAttribute('rx', '16')
    container.setAttribute('ry', '16')
    container.setAttribute('fill', 'rgba(255, 107, 53, 0.08)')
    container.setAttribute('stroke', '#ff6b35')
    container.setAttribute('stroke-width', '2')
    container.setAttribute('stroke-dasharray', '8,4')
    container.setAttribute('class', 'milestone-container')
    container.setAttribute('data-milestone-id', milestone.id)
    
    // Add gradient animation to the container
    container.style.filter = 'drop-shadow(0px 4px 12px rgba(255, 107, 53, 0.2))'
    
    // Insert container behind nodes (at beginning of the main content group)
    svg.insertBefore(container, svg.firstChild || null)
    
    // Create milestone title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    title.setAttribute('x', (minX + 12).toString())
    title.setAttribute('y', (minY - 8).toString())
    title.setAttribute('class', 'milestone-title')
    title.style.fontSize = '12px'
    title.style.fontWeight = 'bold'
    title.style.fill = '#ff6b35'
    title.style.filter = 'drop-shadow(0px 1px 2px rgba(255, 107, 53, 0.3))'
    title.textContent = milestone.title || 'Milestone'
    svg.appendChild(title)
    
    // Create invisible hit area for selection
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    hitArea.setAttribute('x', minX.toString())
    hitArea.setAttribute('y', minY.toString())
    hitArea.setAttribute('width', width.toString())
    hitArea.setAttribute('height', height.toString())
    hitArea.setAttribute('fill', 'transparent')
    hitArea.setAttribute('class', 'milestone-hit-area')
    hitArea.setAttribute('data-milestone-id', milestone.id)
    hitArea.style.cursor = 'pointer'
    
    // Add click handler for milestone selection
    hitArea.addEventListener('click', (e) => {
      e.stopPropagation()
      console.log('🏁 Milestone clicked:', milestone.id)
      selectedNodeId.value = null
      emit('node-selected', null) // Clear node selection
      emit('milestone-selected', milestone.id) // Select milestone
    })
    
    svg.appendChild(hitArea)
    
    console.log('🏁 ✅ Rendered milestone container:', milestone.title, 'with', visualPositions.length, 'nodes')
  })
}

// Expose methods
defineExpose({
  addNode,
  addChildNode,
  clearCanvas,
  exportToMermaid,
  renderMindmap,
  updateNodeSelection,
  zoomIn,
  zoomOut,
  resetZoom,
  selectedNodeId
})

// Lifecycle
onMounted(() => {
  console.log('🎨 Professional MindmapCanvas mounted')
  // Auto-render if mindmap data is already available
  if (props.mindmapData && props.mindmapData.nodes && props.mindmapData.nodes.length > 0) {
    console.log('🎨 Auto-rendering existing mindmap data on mount')
    const dataId = `${props.mindmapData.nodes.length}-${props.mindmapData.metadata?.generatedAt || Date.now()}`
    lastRenderedDataId.value = dataId
    renderMindmap()
  }
})

onBeforeUnmount(() => {
  console.log('🎨 Professional MindmapCanvas unmounting')
})
</script>

<style scoped>
.mindmap-canvas-pro {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* Selection animation */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.canvas-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.placeholder-content {
  text-align: center;
  max-width: 400px;
}

.placeholder-content h3 {
  margin: 1rem 0 0.5rem 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.placeholder-content p {
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.5;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.svg-mindmap-container {
  width: 100%;
  height: calc(100% - 60px);
  position: relative;
}

.mindmap-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 24px;
  backdrop-filter: blur(10px);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbar-section select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.toolbar-section select:hover {
  border-color: #667eea;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f8f9fa;
  border-color: #667eea;
  color: #667eea;
}

/* Professional node styles */
.mindmap-node-pro {
  cursor: grab;
}

.mindmap-node-pro:hover {
  filter: brightness(1.1);
}

.connection-line {
  pointer-events: none;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .mindmap-canvas-pro {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  }
  
  .mindmap-toolbar {
    background: rgba(44, 62, 80, 0.95);
    border-top-color: #4a5f7a;
  }
  
  .toolbar-section label {
    color: #bdc3c7;
  }
  
  .toolbar-section select {
    background: #34495e;
    border-color: #4a5f7a;
    color: #ecf0f1;
  }
  
  .toolbar-btn {
    background: #34495e;
    border-color: #4a5f7a;
    color: #bdc3c7;
  }
  
  .toolbar-btn:hover {
    background: #4a5f7a;
    color: #ecf0f1;
  }
}
</style>
