'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { 
  File, 
  Folder, 
  FolderOpen, 
  Plus, 
  Search, 
  Settings, 
  Play, 
  Save,
  GitBranch,
  Terminal,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Code,
  FileText,
  FileJson,
  FileCode,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Bot,
  Zap,
  Cpu,
  Cloud,
  Database,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Copy,
  Edit3,
  Eye,
  EyeOff
} from 'lucide-react'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
  isOpen?: boolean
  language?: string
  size?: number
  modified?: string
}

interface Tab {
  id: string
  name: string
  content: string
  language: string
  isDirty: boolean
  isSaved: boolean
  filePath: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'chat' | 'code' | 'refactor' | 'bug' | 'docs'
}

interface TerminalLine {
  id: string
  content: string
  type: 'command' | 'output' | 'error'
  timestamp: Date
}

export default function Workspace() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('welcome')
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'welcome',
      name: 'Welcome.js',
      content: `// Welcome to IMPECKS-AI Workspace
// This is your AI-powered development environment

const aiAssistant = {
  capabilities: [
    'Code generation with GLM 4.6',
    'Auto-refactoring',
    'Bug detection',
    'Documentation generation',
    'Performance optimization'
  ],
  
  async generateCode(prompt) {
    console.log(\`Generating code with GLM 4.6: \${prompt}\`)
    // AI code generation happens here
  }
}

// Start building your project!
console.log('Ready to code with GLM 4.6 AI assistance 🚀')`,
      language: 'javascript',
      isDirty: false,
      isSaved: true,
      filePath: '/welcome.js'
    }
  ])
  const [fileTree, setFileTree] = useState<FileNode[]>([
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      isOpen: true,
      children: [
        {
          id: 'app',
          name: 'app',
          type: 'folder',
          isOpen: true,
          children: [
            { id: 'layout', name: 'layout.tsx', type: 'file', content: '// Layout component', language: 'typescript' },
            { id: 'page', name: 'page.tsx', type: 'file', content: '// Home page', language: 'typescript' },
            { id: 'globals', name: 'globals.css', type: 'file', content: '/* Global styles */', language: 'css' }
          ]
        },
        {
          id: 'components',
          name: 'components',
          type: 'folder',
          isOpen: false,
          children: [
            { id: 'ui', name: 'ui', type: 'folder', isOpen: false, children: [] },
            { id: 'header', name: 'header.tsx', type: 'file', content: '// Header component', language: 'typescript' }
          ]
        },
        { id: 'lib', name: 'lib', type: 'folder', isOpen: false, children: [] }
      ]
    },
    {
      id: 'public',
      name: 'public',
      type: 'folder',
      isOpen: false,
      children: [
        { id: 'favicon', name: 'favicon.ico', type: 'file' }
      ]
    },
    { id: 'package', name: 'package.json', type: 'file', content: '{}', language: 'json' },
    { id: 'readme', name: 'README.md', type: 'file', content: '# Project Documentation', language: 'markdown' }
  ])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your GLM 4.6 AI coding assistant. I can help you with:\n\n💻 **Code Generation** - Generate high-quality code\n🔧 **Auto-Refactoring** - Improve and optimize your code\n🐛 **Bug Detection** - Find and fix issues\n📚 **Documentation** - Generate comprehensive docs\n⚡ **Performance** - Optimize your code\n\nWhat would you like to work on today?',
      timestamp: new Date(),
      type: 'chat'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([
    { id: '1', content: 'IMPECKS-AI Terminal v1.0.0 - GLM 4.6 Powered', type: 'output', timestamp: new Date() },
    { id: '2', content: 'Ready for commands...', type: 'output', timestamp: new Date() }
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedModel, setSelectedModel] = useState('zhipuai/glm-4-6b')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeAction, setActiveAction] = useState<string | null>(null)
  
  const terminalRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 text-blue-400" />
      case 'json':
        return <FileJson className="h-4 w-4 text-yellow-400" />
      case 'md':
        return <FileText className="h-4 w-4 text-gray-400" />
      case 'css':
      case 'scss':
        return <FileText className="h-4 w-4 text-purple-400" />
      default:
        return <File className="h-4 w-4 text-gray-400" />
    }
  }

  const toggleFolder = (folderId: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === folderId) {
          return { ...node, isOpen: !node.isOpen }
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) }
        }
        return node
      })
    }
    setFileTree(updateTree(fileTree))
  }

  const openFile = (fileId: string) => {
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === fileId && node.type === 'file') {
          return node
        }
        if (node.children) {
          const found = findFile(node.children)
          if (found) return found
        }
      }
      return null
    }

    const file = findFile(fileTree)
    if (file) {
      const existingTab = tabs.find(tab => tab.id === fileId)
      if (!existingTab) {
        const newTab: Tab = {
          id: fileId,
          name: file.name,
          content: file.content || '',
          language: file.language || 'javascript',
          isDirty: false,
          isSaved: true,
          filePath: `/${file.name}`
        }
        setTabs([...tabs, newTab])
      }
      setActiveTab(fileId)
    }
  }

  const closeTab = (tabId: string) => {
    if (tabs.length > 1) {
      const newTabs = tabs.filter(tab => tab.id !== tabId)
      setTabs(newTabs)
      if (activeTab === tabId) {
        setActiveTab(newTabs[0].id)
      }
    }
  }

  const updateTabContent = (tabId: string, content: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true, isSaved: false }
        : tab
    ))
  }

  const sendMessage = async (type: 'chat' | 'code' | 'refactor' | 'bug' | 'docs' = 'chat') => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
      type
    }

    setChatMessages([...chatMessages, userMessage])
    setChatInput('')
    setIsProcessing(true)

    try {
      let endpoint = '/api/ai/chat'
      let requestBody: any = { messages: [{ role: 'user', content: chatInput }], userId: user?.userId, model: selectedModel }

      switch (type) {
        case 'code':
          endpoint = '/api/ai/generate'
          requestBody = { prompt: chatInput, userId: user?.userId, language: 'javascript', model: selectedModel }
          break
        case 'refactor':
          endpoint = '/api/refactor'
          // Get current tab content for refactoring
          const currentTab = tabs.find(tab => tab.id === activeTab)
          if (currentTab) {
            requestBody = { code: currentTab.content, instruction: chatInput, language: currentTab.language, userId: user?.userId, model: selectedModel }
          }
          break
        case 'bug':
          endpoint = '/api/ai/analyze'
          const bugTab = tabs.find(tab => tab.id === activeTab)
          if (bugTab) {
            requestBody = { code: bugTab.content, language: bugTab.language, userId: user?.userId, model: selectedModel }
          }
          break
        case 'docs':
          endpoint = '/api/ai/docs'
          const docsTab = tabs.find(tab => tab.id === activeTab)
          if (docsTab) {
            requestBody = { code: docsTab.content, language: docsTab.language, userId: user?.userId, model: selectedModel }
          }
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: type === 'refactor' ? data.refactoredCode : 
                  type === 'code' ? data.code : 
                  type === 'bug' ? data.analysis :
                  type === 'docs' ? data.documentation :
                  data.content || 'I apologize, but I couldn\'t process that request.',
        timestamp: new Date(),
        type
      }

      setChatMessages(prev => [...prev, aiResponse])

      // Auto-update editor for refactoring
      if (type === 'refactor' && data.refactoredCode) {
        const currentTab = tabs.find(tab => tab.id === activeTab)
        if (currentTab) {
          updateTabContent(activeTab, data.refactoredCode)
        }
      }

    } catch (error) {
      console.error('AI API Error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        type
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const executeCommand = (command: string) => {
    setTerminalOutput(prev => [...prev, {
      id: Date.now().toString(),
      content: `$ ${command}`,
      type: 'command',
      timestamp: new Date()
    }])

    // Process commands
    switch (command.toLowerCase()) {
      case 'help':
        setTerminalOutput(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: 'Available commands:\n  help     - Show this help message\n  clear    - Clear terminal\n  status   - Show workspace status\n  build    - Build project\n  deploy   - Deploy to AWS\n  ai-chat  - Open AI chat\n  refactor  - Refactor current file',
          type: 'output',
          timestamp: new Date()
        }])
        break
      case 'clear':
        setTerminalOutput([{
          id: Date.now().toString(),
          content: 'Terminal cleared',
          type: 'output',
          timestamp: new Date()
        }])
        break
      case 'status':
        setTerminalOutput(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: `Workspace Status:\n  Files: ${tabs.length} open\n  Model: ${selectedModel}\n  User: ${user?.email || 'Guest'}\n  GLM 4.6: Active`,
          type: 'output',
          timestamp: new Date()
        }])
        break
      case 'build':
        setTerminalOutput(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: '🔨 Building project...\n✅ Build completed successfully!',
          type: 'output',
          timestamp: new Date()
        }])
        break
      case 'deploy':
        setTerminalOutput(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: '🚀 Deploying to AWS...\n✅ Deployment completed!',
          type: 'output',
          timestamp: new Date()
        }])
        break
      default:
        setTerminalOutput(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: `Command not found: ${command}. Type 'help' for available commands.`,
          type: 'error',
          timestamp: new Date()
        }])
    }
  }

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (terminalInput.trim()) {
      executeCommand(terminalInput)
      setTerminalInput('')
    }
  }

  const saveFile = async () => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    if (currentTab && currentTab.content) {
      // Simulate saving to S3
      setTabs(tabs.map(tab => 
        tab.id === activeTab 
          ? { ...tab, isDirty: false, isSaved: true }
          : tab
      ))
      
      setTerminalOutput(prev => [...prev, {
        id: Date.now().toString(),
        content: `💾 Saved ${currentTab.name} to workspace`,
        type: 'output',
        timestamp: new Date()
      }])
    }
  }

  const currentTab = tabs.find(tab => tab.id === activeTab)

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <span className="font-semibold">IMPECKS-AI</span>
            </div>
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              GLM 4.6 Active
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Bot className="w-3 h-3 mr-1" />
              {selectedModel.split('/')[1]?.split('-')[0]?.toUpperCase() || 'GLM'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1 text-sm"
            >
              <option value="zhipuai/glm-4-6b">GLM 4.6</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5</option>
              <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="google/gemini-pro">Gemini Pro</option>
            </select>
            <Button variant="ghost" size="sm">
              <GitBranch className="h-4 w-4 mr-2" />
              main
            </Button>
            <Button variant="ghost" size="sm">
              <Cloud className="h-4 w-4 mr-2" />
              AWS
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15}>
            <Card className="h-full rounded-none border-0 border-r">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Explorer</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setShowSearch(!showSearch)}>
                      <Search className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
                {showSearch && (
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mt-2"
                  />
                )}
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <div className="p-2">
                    {fileTree.map(node => (
                      <div key={node.id}>
                        {node.type === 'folder' ? (
                          <div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start p-1 h-6"
                              onClick={() => toggleFolder(node.id)}
                            >
                              {node.isOpen ? (
                                <ChevronDown className="h-3 w-3 mr-1" />
                              ) : (
                                <ChevronRight className="h-3 w-3 mr-1" />
                              )}
                              {node.isOpen ? (
                                <FolderOpen className="h-4 w-4 mr-2 text-blue-400" />
                              ) : (
                                <Folder className="h-4 w-4 mr-2 text-blue-400" />
                              )}
                              {node.name}
                            </Button>
                            {node.isOpen && node.children && (
                              <div className="ml-4">
                                {node.children.map(child => (
                                  <div key={child.id}>
                                    {child.type === 'folder' ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start p-1 h-6"
                                        onClick={() => toggleFolder(child.id)}
                                      >
                                        {child.isOpen ? (
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 mr-1" />
                                        )}
                                        <Folder className="h-4 w-4 mr-2 text-blue-400" />
                                        {child.name}
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start p-1 h-6"
                                        onClick={() => openFile(child.id)}
                                      >
                                        <div className="w-4 mr-2" />
                                        {getFileIcon(child.name)}
                                        <span className="ml-2">{child.name}</span>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start p-1 h-6"
                            onClick={() => openFile(node.id)}
                          >
                            {getFileIcon(node.name)}
                            <span className="ml-2">{node.name}</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor Area */}
          <ResizablePanel defaultSize={50}>
            <div className="h-full flex flex-col">
              {/* Tabs */}
              <div className="border-b bg-muted/30">
                <div className="flex items-center overflow-x-auto">
                  {tabs.map(tab => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none border-r justify-between whitespace-nowrap"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(tab.name)}
                        <span className="truncate">{tab.name}</span>
                        {tab.isDirty && <div className="w-2 h-2 bg-orange-400 rounded-full" />}
                        {!tab.isSaved && <EyeOff className="h-3 w-3 text-gray-400" />}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(tab.id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 p-4">
                {currentTab ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{currentTab.filePath}</span>
                        <Badge variant="outline" className="text-xs">
                          {currentTab.language}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={saveFile}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 bg-muted/50 rounded-lg p-4">
                      <textarea
                        ref={editorRef}
                        value={currentTab.content}
                        onChange={(e) => updateTabContent(currentTab.id, e.target.value)}
                        className="w-full h-full bg-transparent font-mono text-sm leading-relaxed resize-none outline-none"
                        placeholder="Start coding..."
                        spellCheck={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No file open</h3>
                      <p className="text-muted-foreground">Select a file from the explorer to start coding</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="border-t bg-muted/30 px-4 py-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Line 1, Col 1</span>
                    <span>{currentTab?.language || 'Plain Text'}</span>
                    <span>UTF-8</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>GLM 4.6 Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Side Panel */}
          <ResizablePanel defaultSize={30}>
            <Tabs defaultValue="chat" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Chat
                </TabsTrigger>
                <TabsTrigger value="terminal" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Terminal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="h-full m-0">
                <Card className="h-full rounded-none border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      GLM 4.6 Assistant
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button 
                        variant={activeAction === 'chat' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveAction('chat')}
                      >
                        Chat
                      </Button>
                      <Button 
                        variant={activeAction === 'code' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveAction('code')}
                      >
                        Generate
                      </Button>
                      <Button 
                        variant={activeAction === 'refactor' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveAction('refactor')}
                      >
                        Refactor
                      </Button>
                      <Button 
                        variant={activeAction === 'bug' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveAction('bug')}
                      >
                        Debug
                      </Button>
                      <Button 
                        variant={activeAction === 'docs' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveAction('docs')}
                      >
                        Docs
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex flex-col h-[calc(100vh-12rem)]">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {chatMessages.map(message => (
                            <div
                              key={message.id}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                {message.type && (
                                  <Badge variant="outline" className="mb-2 text-xs">
                                    {message.type === 'chat' ? '💬' :
                                     message.type === 'code' ? '💻' :
                                     message.type === 'refactor' ? '🔧' :
                                     message.type === 'bug' ? '🐛' : '📚'} {message.type}
                                  </Badge>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {isProcessing && (
                            <div className="flex justify-start">
                              <div className="bg-muted p-3 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="border-t p-4">
                        <form onSubmit={(e) => { e.preventDefault(); sendMessage(activeAction as any || 'chat'); }} className="flex gap-2">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={activeAction === 'refactor' ? "Describe how to refactor the current file..." :
                                     activeAction === 'code' ? "What code would you like me to generate?" :
                                     activeAction === 'bug' ? "Describe the bug you're looking for..." :
                                     activeAction === 'docs' ? "What documentation would you like me to generate?" :
                                     "Ask GLM 4.6 for help with your code..."}
                            className="flex-1"
                          />
                          <Button type="submit" size="sm" disabled={isProcessing}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terminal" className="h-full m-0">
                <Card className="h-full rounded-none border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Terminal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="flex flex-col h-[calc(100vh-8rem)]">
                      <ScrollArea ref={terminalRef} className="flex-1 p-4 font-mono text-sm">
                        <div className="space-y-1">
                          {terminalOutput.map(line => (
                            <div key={line.id} className={line.type === 'error' ? 'text-red-400' : 
                                                                       line.type === 'command' ? 'text-green-400' : 
                                                                       'text-green-400'}>
                              {line.content}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <form onSubmit={handleTerminalSubmit} className="border-t p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-mono">$</span>
                          <Input
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            placeholder="Enter command..."
                            className="flex-1 font-mono text-sm border-0 bg-transparent focus-visible:ring-0"
                          />
                        </div>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}