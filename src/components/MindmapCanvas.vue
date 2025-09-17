<template>
  <div class="mindmap-canvas" ref="canvasContainer">
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
        <h3>Visual Mindmap Editor</h3>
        <p>Click "Add Node" to start creating your mindmap visually.</p>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Props
const props = defineProps({
  layout: {
    type: String,
    default: 'radial'
  },
  nodeShape: {
    type: String,
    default: 'circle'
  }
})

// Emits
const emit = defineEmits({
  'nodes-changed': (nodes) => true,
  'export-request': (mermaidCode) => true,
  'node-selected': (nodeId) => true
})

// Refs
const canvasContainer = ref(null)
const svgContainer = ref(null)

// State
const nodes = ref([])
const connections = ref([])
const selectedNodeId = ref(null)
const isDragInProgress = ref(false)
const draggedNodeId = ref(null)
const zoomLevel = ref(1)
const panX = ref(0)
const panY = ref(0)

// Computed
const hasNodes = computed(() => nodes.value.length > 0)

// Methods
const addNode = () => {
  console.log('🎨 MindmapCanvas: Adding node')
  
  const newNode = {
    id: `node_${Date.now()}`,
    text: 'New Node',
    type: 'text',
    x: Math.random() * 400 + 100,
    y: Math.random() * 300 + 100,
    width: 120,
    height: 80,
    color: getNodeColor('text')
  }
  
  nodes.value.push(newNode)
  emit('nodes-changed', nodes.value)
  
  console.log('🎨 Node added:', newNode)
}

const addChildNode = (parentNode) => {
  const childNode = {
    id: `node_${Date.now()}`,
    text: 'Child Node',
    type: 'text',
    x: parentNode.x + 150,
    y: parentNode.y + 100,
    width: 120,
    height: 80,
    color: getNodeColor('text')
  }
  nodes.value.push(childNode)
  
  // Add connection
  const connection = {
    id: `conn_${Date.now()}`,
    from: parentNode.id,
    to: childNode.id,
    x1: parentNode.x + parentNode.width / 2,
    y1: parentNode.y + parentNode.height / 2,
    x2: childNode.x + childNode.width / 2,
    y2: childNode.y + childNode.height / 2
  }
  connections.value.push(connection)
  
  selectNode(childNode)
  emit('nodes-changed', nodes.value)
}

const deleteNode = (node) => {
  // Remove connections
  connections.value = connections.value.filter(conn => 
    conn.from !== node.id && conn.to !== node.id
  )
  
  // Remove node
  nodes.value = nodes.value.filter(n => n.id !== node.id)
  
  if (selectedNodeId.value === node.id) {
    selectedNodeId.value = null
  }
  
  updateConnections()
  emit('nodes-changed', nodes.value)
}

const selectNode = (node) => {
  selectedNodeId.value = node.id
}

const editNode = (node) => {
  const newText = prompt('Edit node text:', node.text)
  if (newText && newText.trim()) {
    node.text = newText.trim()
    emit('nodes-changed', nodes.value)
  }
}

const clearCanvas = () => {
  console.log('🎨 MindmapCanvas: Clearing canvas')
  nodes.value = []
  connections.value = []
  selectedNodeId.value = null
  emit('nodes-changed', nodes.value)
}

const getNodeColor = (type) => {
  const colors = {
    root: '#667eea',
    heading: '#4CAF50',
    list: '#FF9800',
    text: '#9C27B0',
    concept: '#F44336'
  }
  
  return colors[type] || '#9C27B0'
}

const startDrag = (node, event) => {
  if (event.button !== 0) return // Only left mouse button
  
  isDragging.value = true
  selectedNodeId.value = node.id
  dragStart.value = {
    x: event.clientX - node.x,
    y: event.clientY - node.y
  }
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  event.preventDefault()
}

const handleDrag = (event) => {
  if (!isDragging.value || !selectedNodeId.value) return
  
  const node = nodes.value.find(n => n.id === selectedNodeId.value)
  if (!node) return
  
  node.x = event.clientX - dragStart.value.x
  node.y = event.clientY - dragStart.value.y
  
  // Keep node within canvas bounds
  node.x = Math.max(0, Math.min(canvasWidth.value - node.width, node.x))
  node.y = Math.max(0, Math.min(canvasHeight.value - node.height, node.y))
  
  updateConnections()
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startResize = (node, event) => {
  if (event.button !== 0) return
  
  isResizing.value = true
  dragStart.value = {
    x: event.clientX - node.width,
    y: event.clientY - node.height
  }
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

const handleResize = (event) => {
  if (!isResizing.value || !selectedNodeId.value) return
  
  const node = nodes.value.find(n => n.id === selectedNodeId.value)
  if (!node) return
  
  node.width = Math.max(80, event.clientX - dragStart.value.x)
  node.height = Math.max(60, event.clientY - dragStart.value.y)
  
  updateConnections()
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

const updateConnections = () => {
  connections.value.forEach(conn => {
    const fromNode = nodes.value.find(n => n.id === conn.from)
    const toNode = nodes.value.find(n => n.id === conn.to)
    
    if (fromNode && toNode) {
      conn.x1 = fromNode.x + fromNode.width / 2
      conn.y1 = fromNode.y + fromNode.height / 2
      conn.x2 = toNode.x + toNode.width / 2
      conn.y2 = toNode.y + toNode.height / 2
    }
  })
}

const exportToMermaid = () => {
  console.log('🎨 MindmapCanvas: Exporting to Mermaid')
  
  if (nodes.value.length === 0) {
    return ''
  }

  // Generate basic Mermaid mindmap syntax
  let mermaid = 'mindmap\n'
  
  if (nodes.value.length === 1) {
    mermaid += `  root((${nodes.value[0].text}))\n`
  } else {
    // Simple structure for multiple nodes
    const rootNode = nodes.value[0]
    mermaid += `  root((${rootNode.text}))\n`
    
    for (let i = 1; i < nodes.value.length; i++) {
      const node = nodes.value[i]
      mermaid += `    ${node.text}\n`
    }
  }
  
  console.log('🎨 Generated Mermaid:', mermaid)
  return mermaid
}

// Expose methods for parent component
defineExpose({
  addNode,
  clearCanvas,
  exportToMermaid
})

// Lifecycle
onMounted(() => {
  console.log('🎨 MindmapCanvas: Component mounted')
})

onBeforeUnmount(() => {
  console.log('🎨 MindmapCanvas: Component unmounting')
})
</script>

<style scoped>
.mindmap-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  background: #fafafa;
  border-radius: 8px;
  border: 2px dashed #e0e0e0;
  overflow: hidden;
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
  font-size: 1.25rem;
}

.placeholder-content p {
  margin: 0 0 1rem 0;
  color: #666;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: #5a6fd8;
}

.canvas-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.connection-line {
  pointer-events: none;
}

.canvas-node {
  position: absolute;
  background: #667eea;
  border: 2px solid #4a5f7a;
  border-radius: 8px;
  padding: 8px;
  cursor: move;
  user-select: none;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s, transform 0.1s;
  pointer-events: auto;
}

.canvas-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.canvas-node.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.node-title {
  font-weight: 600;
  color: white;
  font-size: 14px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
}

.node-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.canvas-node:hover .node-actions {
  opacity: 1;
}

.node-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.node-action:hover {
  background: rgba(255, 255, 255, 0.3);
}

.node-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-type {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: se-resize;
  opacity: 0;
  transition: opacity 0.2s;
}

.canvas-node:hover .resize-handle {
  opacity: 1;
}

.resize-handle:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
