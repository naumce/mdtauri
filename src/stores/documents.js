import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDocumentsStore = defineStore('documents', () => {
  // State
  const documents = ref([
    {
      id: 1,
      name: 'Getting Started',
      content: '# Welcome to MD Creator\n\nStart writing your ideas...',
      lastModified: new Date(),
      isDirty: false
    },
    {
      id: 2,
      name: 'Project Plan',
      content: '# Project Plan\n\n## Goals\n- Create amazing content\n- Build beautiful mindmaps',
      lastModified: new Date(),
      isDirty: false
    },
    {
      id: 3,
      name: 'Ideas & Notes',
      content: '# Ideas & Notes\n\n### Feature Ideas\n- Real-time collaboration\n- AI-powered suggestions',
      lastModified: new Date(),
      isDirty: false
    }
  ])
  
  const selectedDocumentId = ref(1)
  const autoSaveInterval = ref(null)

  // Getters
  const selectedDocument = computed(() => 
    documents.value.find(doc => doc.id === selectedDocumentId.value)
  )

  const hasUnsavedChanges = computed(() => 
    documents.value.some(doc => doc.isDirty)
  )

  // Actions
  const selectDocument = (id) => {
    selectedDocumentId.value = id
  }

  const updateDocument = (id, updates) => {
    const doc = documents.value.find(d => d.id === id)
    if (doc) {
      Object.assign(doc, updates, { 
        lastModified: new Date(),
        isDirty: true 
      })
    }
  }

  const updateDocumentContent = (id, newContent) => {
    const doc = documents.value.find(d => d.id === id)
    if (doc) {
      doc.content = newContent
      doc.lastModified = new Date()
      doc.isDirty = true
    }
  }

  const createDocument = (name = 'Untitled Document') => {
    const newDoc = {
      id: Date.now(),
      name,
      content: '# ' + name + '\n\nStart writing...',
      lastModified: new Date(),
      isDirty: false
    }
    documents.value.push(newDoc)
    selectDocument(newDoc.id)
    return newDoc
  }

  const deleteDocument = (id) => {
    const index = documents.value.findIndex(d => d.id === id)
    if (index > -1) {
      documents.value.splice(index, 1)
      if (selectedDocumentId.value === id) {
        selectDocument(documents.value[0]?.id || null)
      }
    }
  }

  const saveDocument = (id) => {
    const doc = documents.value.find(d => d.id === id)
    if (doc) {
      doc.isDirty = false
      // TODO: Implement actual file system save
      console.log('Saving document:', doc.name)
    }
  }

  const startAutoSave = () => {
    if (autoSaveInterval.value) return
    
    autoSaveInterval.value = setInterval(() => {
      documents.value
        .filter(doc => doc.isDirty)
        .forEach(doc => saveDocument(doc.id))
    }, 30000) // Auto-save every 30 seconds
  }

  const stopAutoSave = () => {
    if (autoSaveInterval.value) {
      clearInterval(autoSaveInterval.value)
      autoSaveInterval.value = null
    }
  }

  return {
    // State
    documents,
    selectedDocumentId,
    
    // Getters
    selectedDocument,
    hasUnsavedChanges,
    
    // Actions
    selectDocument,
    updateDocument,
    updateDocumentContent,
    createDocument,
    deleteDocument,
    saveDocument,
    startAutoSave,
    stopAutoSave
  }
})
