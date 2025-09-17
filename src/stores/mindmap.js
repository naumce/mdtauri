import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMindmapStore = defineStore('mindmap', () => {
  // State
  const nodes = ref([])
  const connections = ref([])
  const selectedNodeId = ref(null)
  const selectedMilestoneId = ref(null)
  const interactionMode = ref('select') // 'select', 'add_node', 'add_milestone'
  const milestones = ref([])

  // Getters
  const selectedNode = computed(() => 
    nodes.value.find(node => node.id === selectedNodeId.value)
  )

  const selectedMilestone = computed(() => 
    milestones.value.find(milestone => milestone.id === selectedMilestoneId.value)
  )

  const nodeConnections = computed(() => (nodeId) => 
    connections.value.filter(conn => 
      conn.source === nodeId || conn.target === nodeId
    )
  )

  // Actions
  const addNode = (data) => {
    const newNode = {
      id: Date.now(),
      x: data.x || 0,
      y: data.y || 0,
      text: data.text || 'New Node',
      metadata: {
        description: '',
        status: 'pending',
        priority: 'medium',
        owner: '',
        startDate: null,
        endDate: null,
        duration: 1
      },
      ...data
    }
    nodes.value.push(newNode)
    return newNode
  }

  const updateNode = (id, updates) => {
    const node = nodes.value.find(n => n.id === id)
    if (node) {
      Object.assign(node, updates)
    }
  }

  const deleteNode = (id) => {
    // Remove node
    const nodeIndex = nodes.value.findIndex(n => n.id === id)
    if (nodeIndex > -1) {
      nodes.value.splice(nodeIndex, 1)
    }
    
    // Remove connections
    connections.value = connections.value.filter(conn => 
      conn.source !== id && conn.target !== id
    )
    
    // Clear selection if this node was selected
    if (selectedNodeId.value === id) {
      selectedNodeId.value = null
    }
  }

  const addConnection = (sourceId, targetId) => {
    const newConnection = {
      id: Date.now(),
      source: sourceId,
      target: targetId
    }
    connections.value.push(newConnection)
    return newConnection
  }

  const deleteConnection = (id) => {
    const index = connections.value.findIndex(c => c.id === id)
    if (index > -1) {
      connections.value.splice(index, 1)
    }
  }

  const selectNode = (id) => {
    selectedNodeId.value = id
    selectedMilestoneId.value = null
  }

  const clearSelection = () => {
    selectedNodeId.value = null
    selectedMilestoneId.value = null
  }

  const setInteractionMode = (mode) => {
    interactionMode.value = mode
  }

  // Milestone functions
  const createMilestone = (data) => {
    const newMilestone = {
      id: Date.now(),
      title: data.title || 'New Milestone',
      description: data.description || '',
      groupedNodes: data.groupedNodes || [],
      bounds: data.bounds || { x: 0, y: 0, width: 200, height: 150 },
      ...data
    }
    milestones.value.push(newMilestone)
    return newMilestone
  }

  const updateMilestone = (id, updates) => {
    const milestone = milestones.value.find(m => m.id === id)
    if (milestone) {
      Object.assign(milestone, updates)
    }
  }

  const deleteMilestone = (id) => {
    const index = milestones.value.findIndex(m => m.id === id)
    if (index > -1) {
      milestones.value.splice(index, 1)
    }
    
    if (selectedMilestoneId.value === id) {
      selectedMilestoneId.value = null
    }
  }

  const selectMilestone = (id) => {
    selectedMilestoneId.value = id
    selectedNodeId.value = null
  }

  const addNodeToMilestone = (milestoneId, nodeId) => {
    const milestone = milestones.value.find(m => m.id === milestoneId)
    if (milestone && !milestone.groupedNodes.includes(nodeId)) {
      milestone.groupedNodes.push(nodeId)
    }
  }

  const removeNodeFromMilestone = (milestoneId, nodeId) => {
    const milestone = milestones.value.find(m => m.id === milestoneId)
    if (milestone) {
      milestone.groupedNodes = milestone.groupedNodes.filter(id => id !== nodeId)
    }
  }

  // Clear all data
  const clearMindmap = () => {
    nodes.value = []
    connections.value = []
    milestones.value = []
    selectedNodeId.value = null
    selectedMilestoneId.value = null
  }

  return {
    // State
    nodes,
    connections,
    selectedNodeId,
    selectedMilestoneId,
    interactionMode,
    milestones,
    
    // Getters
    selectedNode,
    selectedMilestone,
    nodeConnections,
    
    // Actions
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    selectNode,
    clearSelection,
    setInteractionMode,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    selectMilestone,
    addNodeToMilestone,
    removeNodeFromMilestone,
    clearMindmap
  }
})
