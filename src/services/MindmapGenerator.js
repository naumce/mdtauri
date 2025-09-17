/**
 * MindmapGenerator - Generates mindmap structures from markdown content
 * Supports heading extraction, selection-based generation, and Mermaid export
 */

export class MindmapGenerator {
  constructor() {
    this.nodeIdCounter = 0
  }

  /**
   * Generate mindmap from document headings
   */
  generateFromHeadings(content) {
    console.log('🧠 Generating mindmap from headings')
    
    const headings = this.extractHeadings(content)
    const mindmapData = this.createMindmapStructure(headings)
    
    console.log('🧠 Mindmap generated:', { nodeCount: mindmapData.nodes.length })
    return mindmapData
  }

  /**
   * Generate mindmap from selected text
   */
  generateFromSelection(selectedText) {
    console.log('🧠 Generating mindmap from selection')
    
    const concepts = this.extractConcepts(selectedText)
    const mindmapData = this.createMindmapStructure(concepts)
    
    console.log('🧠 Selection mindmap generated:', { nodeCount: mindmapData.nodes.length })
    return mindmapData
  }

  /**
   * Extract headings from markdown content
   */
  extractHeadings(content) {
    console.log('🧠 MindmapGenerator: Extracting headings from content:', content)
    console.log('🧠 MindmapGenerator: Content length:', content?.length)
    
    if (!content || typeof content !== 'string') {
      console.warn('🧠 MindmapGenerator: Invalid content type:', typeof content)
      return []
    }
    
    const lines = content.split('\n')
    console.log('🧠 MindmapGenerator: Split into lines:', lines.length)
    
    const headings = []
    
    lines.forEach((line, index) => {
      console.log(`🧠 MindmapGenerator: Line ${index + 1}:`, line)
      console.log(`🧠 MindmapGenerator: Line ${index + 1} length:`, line.length)
      console.log(`🧠 MindmapGenerator: Line ${index + 1} starts with #:`, line.startsWith('#'))
      
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      console.log(`🧠 MindmapGenerator: Regex match for line ${index + 1}:`, headingMatch)
      
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2].trim()
        
        headings.push({
          id: this.generateNodeId(),
          text,
          level,
          lineNumber: index + 1,
          type: 'heading'
        })
        console.log(`🧠 MindmapGenerator: Found heading level ${level}:`, text)
      }
    })
    
    console.log('🧠 MindmapGenerator: Total headings found:', headings.length)
    return headings
  }

  /**
   * Extract concepts from selected text
   */
  extractConcepts(text) {
    const lines = text.split('\n')
    const concepts = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        // Extract key concepts (words starting with capital letters)
        const words = trimmedLine.split(/\s+/)
        const keyWords = words.filter(word => 
          word.length > 2 && 
          /^[A-Z]/.test(word) && 
          !['The', 'And', 'Or', 'But', 'For', 'With', 'From', 'This', 'That'].includes(word)
        )
        
        if (keyWords.length > 0) {
          concepts.push({
            id: this.generateNodeId(),
            text: keyWords.slice(0, 3).join(' '), // Take first 3 key words
            level: 1,
            lineNumber: index + 1,
            type: 'concept'
          })
        }
      }
    })
    
    return concepts.slice(0, 10) // Limit to 10 concepts
  }

  /**
   * Create hierarchical mindmap structure
   */
  createMindmapStructure(items) {
    if (items.length === 0) {
      return {
        nodes: [],
        connections: [],
        metadata: {
          sourceType: 'empty',
          generatedAt: new Date().toISOString(),
          nodeCount: 0
        }
      }
    }

    const nodes = []
    const connections = []
    
    // Create root node if no level 1 items
    let rootNode = null
    if (!items.some(item => item.level === 1)) {
      rootNode = {
        id: this.generateNodeId(),
        text: 'Document',
        level: 0,
        type: 'root'
      }
      nodes.push(rootNode)
    }

    // Process items by level
    const itemsByLevel = this.groupByLevel(items)
    
    Object.keys(itemsByLevel).forEach(level => {
      const levelItems = itemsByLevel[level]
      const parentLevel = parseInt(level) - 1
      
      levelItems.forEach(item => {
        nodes.push(item)
        
        // Find parent node
        const parent = this.findParentNode(item, itemsByLevel[parentLevel] || [], rootNode)
        if (parent) {
          connections.push({
            from: parent.id,
            to: item.id,
            type: 'hierarchy'
          })
        }
      })
    })

    return {
      nodes,
      connections,
      metadata: {
        sourceType: items[0]?.type || 'unknown',
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length
      }
    }
  }

  /**
   * Group items by their level
   */
  groupByLevel(items) {
    return items.reduce((groups, item) => {
      const level = item.level
      if (!groups[level]) {
        groups[level] = []
      }
      groups[level].push(item)
      return groups
    }, {})
  }

  /**
   * Find parent node for a given item
   */
  findParentNode(item, potentialParents, rootNode) {
    // If we have a root node and item is level 1, connect to root
    if (item.level === 1 && rootNode) {
      return rootNode
    }
    
    // Find the closest parent by level
    const parentLevel = item.level - 1
    const parents = potentialParents.filter(p => p.level === parentLevel)
    
    if (parents.length > 0) {
      // For now, connect to the first parent at the right level
      // In a more sophisticated implementation, we'd use proximity
      return parents[0]
    }
    
    return null
  }

  /**
   * Convert mindmap data to Mermaid flowchart
   */
  toMermaidFlowchart(data) {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return 'flowchart TD\n  A[No data]'
    }

    let mermaid = 'flowchart TD\n'
    
    // Add nodes
    data.nodes.forEach(node => {
      const nodeId = this.sanitizeNodeId(node.id)
      const nodeText = this.escapeMermaidText(node.text)
      mermaid += `  ${nodeId}["${nodeText}"]\n`
    })
    
    // Add connections
    data.connections.forEach(conn => {
      const fromId = this.sanitizeNodeId(conn.from)
      const toId = this.sanitizeNodeId(conn.to)
      mermaid += `  ${fromId} --> ${toId}\n`
    })
    
    return mermaid
  }

  /**
   * Convert mindmap data to Mermaid mindmap
   */
  toMermaidMindmap(data) {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return 'mindmap\n  root((No data))'
    }

    let mermaid = 'mindmap\n'
    
    // Find root node
    const rootNode = data.nodes.find(node => node.level === 0 || node.level === 1)
    if (rootNode) {
      mermaid += `  root(("${this.escapeMermaidText(rootNode.text)}"))\n`
      
      // Add children recursively
      const children = data.nodes.filter(node => 
        data.connections.some(conn => conn.from === rootNode.id && conn.to === node.id)
      )
      
      children.forEach(child => {
        mermaid += `    ${this.escapeMermaidText(child.text)}\n`
        
        // Add grandchildren
        const grandchildren = data.nodes.filter(node => 
          data.connections.some(conn => conn.from === child.id && conn.to === node.id)
        )
        
        grandchildren.forEach(grandchild => {
          mermaid += `      ${this.escapeMermaidText(grandchild.text)}\n`
        })
      })
    }
    
    return mermaid
  }

  /**
   * Convert mindmap data to Mermaid graph
   */
  toMermaidGraph(data) {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return 'graph TD\n  A[No data]'
    }

    let mermaid = 'graph TD\n'
    
    // Add nodes with different shapes based on level
    data.nodes.forEach(node => {
      const nodeId = this.sanitizeNodeId(node.id)
      const nodeText = this.escapeMermaidText(node.text)
      
      if (node.level === 0 || node.level === 1) {
        mermaid += `  ${nodeId}(("${nodeText}"))\n`  // Circle for root/main
      } else if (node.level === 2) {
        mermaid += `  ${nodeId}["${nodeText}"]\n`   // Square for secondary
      } else {
        mermaid += `  ${nodeId}("${nodeText}")\n`   // Rounded for tertiary
      }
    })
    
    // Add connections
    data.connections.forEach(conn => {
      const fromId = this.sanitizeNodeId(conn.from)
      const toId = this.sanitizeNodeId(conn.to)
      mermaid += `  ${fromId} --> ${toId}\n`
    })
    
    return mermaid
  }

  /**
   * Convert mindmap data to Mermaid sequence diagram
   */
  toMermaidSequence(data) {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return 'sequenceDiagram\n  participant A as No data'
    }

    let mermaid = 'sequenceDiagram\n'
    
    // Find main participants (root and level 1 nodes)
    const participants = data.nodes.filter(node => node.level <= 1)
    
    participants.forEach((participant, index) => {
      const participantId = this.sanitizeNodeId(participant.id)
      const participantName = this.escapeMermaidText(participant.text)
      mermaid += `  participant ${participantId} as ${participantName}\n`
    })
    
    // Add interactions between participants
    data.connections.forEach((conn, index) => {
      const fromNode = data.nodes.find(n => n.id === conn.from)
      const toNode = data.nodes.find(n => n.id === conn.to)
      
      if (fromNode && toNode && fromNode.level <= 1 && toNode.level <= 1) {
        const fromId = this.sanitizeNodeId(fromNode.id)
        const toId = this.sanitizeNodeId(toNode.id)
        mermaid += `  ${fromId}->>${toId}: ${this.escapeMermaidText(toNode.text)}\n`
      }
    })
    
    return mermaid
  }

  /**
   * Convert mindmap data to Mermaid class diagram
   */
  toMermaidClass(data) {
    if (!data || !data.nodes || data.nodes.length === 0) {
      return 'classDiagram\n  class NoData'
    }

    let mermaid = 'classDiagram\n'
    
    // Add classes based on nodes
    data.nodes.forEach(node => {
      const className = this.sanitizeNodeId(node.id)
      const classText = this.escapeMermaidText(node.text)
      mermaid += `  class ${className} {\n`
      mermaid += `    ${classText}\n`
      mermaid += `  }\n`
    })
    
    // Add relationships
    data.connections.forEach(conn => {
      const fromClass = this.sanitizeNodeId(conn.from)
      const toClass = this.sanitizeNodeId(conn.to)
      mermaid += `  ${fromClass} --> ${toClass}\n`
    })
    
    return mermaid
  }

  /**
   * Get all available export formats
   */
  getExportFormats() {
    return [
      { id: 'json', name: 'JSON Data', description: 'Raw mindmap data structure' },
      { id: 'flowchart', name: 'Mermaid Flowchart', description: 'Process flow diagram' },
      { id: 'mindmap', name: 'Mermaid Mindmap', description: 'Hierarchical mindmap' },
      { id: 'graph', name: 'Mermaid Graph', description: 'General graph diagram' },
      { id: 'sequence', name: 'Mermaid Sequence', description: 'Sequence diagram' },
      { id: 'class', name: 'Mermaid Class', description: 'Class diagram' },
      { id: 'markdown', name: 'Markdown', description: 'Structured markdown document' }
    ]
  }

  /**
   * Export mindmap in specified format
   */
  exportMindmap(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'flowchart':
        return this.toMermaidFlowchart(data)
      case 'mindmap':
        return this.toMermaidMindmap(data)
      case 'graph':
        return this.toMermaidGraph(data)
      case 'sequence':
        return this.toMermaidSequence(data)
      case 'class':
        return this.toMermaidClass(data)
      case 'markdown':
        return this.toMarkdown(data)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Utility methods
   */
  generateNodeId() {
    return `node_${++this.nodeIdCounter}`
  }

  /**
   * Sanitize node ID for Mermaid
   */
  sanitizeNodeId(id) {
    return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, 'n$1')
  }

  /**
   * Escape text for Mermaid
   */
  escapeMermaidText(text) {
    return text
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .trim()
  }

  /**
   * Export mindmap data as JSON
   */
  exportAsJson(mindmapData) {
    return JSON.stringify(mindmapData, null, 2)
  }
}
