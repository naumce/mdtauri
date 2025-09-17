<script setup>
import { ref, computed, onMounted } from "vue";
import { useDocumentsStore } from './stores/documents.js'
import { useMindmapStore } from './stores/mindmap.js'
import MarkdownEditor from './components/editor/MarkdownEditor.vue'
import MindmapPanel from './components/MindmapPanel.vue'

// Stores
const documentsStore = useDocumentsStore()
const mindmapStore = useMindmapStore()

// App state
const isDarkMode = ref(false);
const currentView = ref('editor'); // 'editor' | 'mindmap'
const sidebarCollapsed = ref(false);

// Toggle dark mode
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark', isDarkMode.value);
};

// Switch view
const switchView = (view) => {
  currentView.value = view;
};

// Computed classes
const appClasses = computed(() => ({
  'app': true,
  'dark': isDarkMode.value
}));

const sidebarClasses = computed(() => ({
  'sidebar': true,
  'collapsed': sidebarCollapsed.value
}));

// Computed from stores
const documents = computed(() => documentsStore.documents)
const selectedDocument = computed(() => documentsStore.selectedDocument)
const hasUnsavedChanges = computed(() => documentsStore.hasUnsavedChanges)

// Methods
const selectDocument = (id) => {
  documentsStore.selectDocument(id)
}

const createNewDocument = () => {
  documentsStore.createDocument('Untitled Document')
}

const deleteDocument = (id) => {
  if (confirm('Are you sure you want to delete this document?')) {
    documentsStore.deleteDocument(id)
  }
}

const insertMindmapIntoDocument = (mermaidCode) => {
  if (selectedDocument.value) {
    // Add the mindmap code to the current document
    const currentContent = selectedDocument.value.content || ''
    const newContent = currentContent + '\n\n' + mermaidCode
    documentsStore.updateDocumentContent(selectedDocument.value.id, newContent)
    
    // Switch back to editor view to show the inserted mindmap
    currentView.value = 'editor'
  }
}

onMounted(() => {
  // Start auto-save
  documentsStore.startAutoSave()
})
</script>

<template>
  <div :class="appClasses">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <button class="menu-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="logo">
          <span class="logo-icon">🍃</span>
          <span class="logo-text">MD Creator</span>
        </div>
      </div>
      
      <div class="header-right">
        <div v-if="hasUnsavedChanges" class="unsaved-indicator">
          ● Unsaved changes
        </div>
        <button class="icon-button" @click="toggleDarkMode" :title="isDarkMode ? 'Light Mode' : 'Dark Mode'">
          <svg v-if="isDarkMode" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button class="icon-button" title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Sidebar -->
      <aside :class="sidebarClasses">
        <div class="sidebar-section">
          <h3 class="sidebar-title">Documents</h3>
          <div class="document-list">
            <div 
              v-for="doc in documents" 
              :key="doc.id"
              class="document-item"
              :class="{ active: selectedDocument?.id === doc.id }"
              @click="selectDocument(doc.id)"
            >
              <div class="document-icon">📄</div>
              <div class="document-info">
                <div class="document-name">{{ doc.name }}</div>
                <div class="document-date">{{ doc.lastModified.toLocaleDateString() }}</div>
                <div v-if="doc.isDirty" class="document-status">● Modified</div>
              </div>
              <button 
                class="document-delete-btn"
                @click.stop="deleteDocument(doc.id)"
                title="Delete document"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <button class="new-document-btn" @click="createNewDocument">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Document
          </button>
        </div>

        <div class="sidebar-section">
          <h3 class="sidebar-title">Templates</h3>
          <div class="template-list">
            <div class="template-item">
              <div class="template-icon">📋</div>
              <div class="template-name">Meeting Notes</div>
            </div>
            <div class="template-item">
              <div class="template-icon">📊</div>
              <div class="template-name">Project Plan</div>
            </div>
            <div class="template-item">
              <div class="template-icon">💡</div>
              <div class="template-name">Brainstorming</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Editor Area -->
      <main class="editor-area">
        <div class="view-tabs">
          <button 
            class="view-tab"
            :class="{ active: currentView === 'editor' }"
            @click="switchView('editor')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Editor
          </button>
          <button 
            class="view-tab"
            :class="{ active: currentView === 'mindmap' }"
            @click="switchView('mindmap')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
            </svg>
            Mindmap
          </button>
        </div>

        <div class="editor-content">
          <div v-if="currentView === 'editor' && selectedDocument" class="markdown-editor">
            <MarkdownEditor :document="selectedDocument" />
          </div>
          
          <div v-else-if="currentView === 'mindmap' && selectedDocument" class="mindmap-view">
            <MindmapPanel 
              :document="selectedDocument"
              @update-document-content="insertMindmapIntoDocument"
            />
          </div>
          
          <div v-else-if="currentView === 'mindmap'" class="mindmap-view">
            <div class="mindmap-placeholder">
              <div class="mindmap-icon">🧠</div>
              <h3>Mindmap View</h3>
              <p>Select a document to create a mindmap</p>
            </div>
          </div>

          <div v-else class="no-document">
            <div class="no-document-icon">📄</div>
            <h3>No Document Selected</h3>
            <p>Select a document from the sidebar or create a new one</p>
            <button class="create-document-btn" @click="createNewDocument">Create Document</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* App Container */
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: all 0.3s ease;
}

.app.dark {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
}

/* Header */
.header {
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.menu-toggle {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.menu-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 18px;
}

.logo-icon {
  font-size: 24px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.unsaved-indicator {
  font-size: 12px;
  color: #ff6b6b;
  font-weight: 500;
}

.icon-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow-y: auto;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-section {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.document-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.document-item.active {
  background: rgba(102, 126, 234, 0.2);
  border-left: 3px solid #667eea;
}

.document-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-date {
  font-size: 12px;
  color: #999;
}

.document-status {
  font-size: 11px;
  color: #e74c3c;
  font-weight: 500;
}

.document-delete-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}

.document-item:hover .document-delete-btn {
  opacity: 1;
}

.document-delete-btn:hover {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.1);
}

.new-document-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(102, 126, 234, 0.1);
  border: 2px dashed rgba(102, 126, 234, 0.3);
  border-radius: 8px;
  color: #667eea;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 15px;
}

.new-document-btn:hover {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.template-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.template-name {
  font-weight: 500;
  color: #333;
}

/* Editor Area */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.view-tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px 20px;
  background: none;
  border: none;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.view-tab:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.view-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.markdown-editor {
  height: 100%;
}

.mindmap-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.mindmap-placeholder {
  text-align: center;
  color: #666;
}

.mindmap-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.mindmap-placeholder h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.mindmap-placeholder p {
  margin-bottom: 30px;
  color: #666;
}

.create-mindmap-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-mindmap-btn:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.no-document {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
}

.no-document-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-document h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.no-document p {
  margin-bottom: 30px;
  color: #666;
}

.create-document-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-document-btn:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

/* Dark Mode */
.app.dark .sidebar {
  background: rgba(44, 62, 80, 0.95);
  border-right-color: rgba(255, 255, 255, 0.1);
}

.app.dark .sidebar-title {
  color: #bdc3c7;
}

.app.dark .document-name,
.app.dark .template-name {
  color: #ecf0f1;
}

.app.dark .document-date {
  color: #95a5a6;
}

.app.dark .editor-area {
  background: #2c3e50;
}

.app.dark .view-tabs {
  background: #34495e;
  border-bottom-color: #4a5f7a;
}

.app.dark .view-tab {
  color: #bdc3c7;
}

.app.dark .view-tab:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.app.dark .view-tab.active {
  background: #2c3e50;
}

.app.dark .mindmap-view {
  background: #34495e;
}

.app.dark .mindmap-placeholder {
  color: #bdc3c7;
}

.app.dark .mindmap-placeholder h3 {
  color: #ecf0f1;
}

.app.dark .mindmap-placeholder p {
  color: #bdc3c7;
}

.app.dark .no-document {
  color: #bdc3c7;
}

.app.dark .no-document h3 {
  color: #ecf0f1;
}

.app.dark .no-document p {
  color: #bdc3c7;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    height: calc(100vh - 60px);
    z-index: 1000;
    transform: translateX(-100%);
  }
  
  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }
}
</style>
