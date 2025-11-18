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
  Upload,
  Download,
  Wand2
} from 'lucide-react'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
  isOpen?: boolean
}

interface Tab {
  id: string
  name: string
  content: string
  language: string
  isDirty: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
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
// GLM 4.6 Powered Development Environment

const aiAssistant = {
  capabilities: [
    'GLM 4.6 Chat',
    'Auto-refactoring',
    'Multi-file refactoring',
    'Code generation',
    'Bug detection',
    'Documentation generation'
  ],
  
  async generateCode(prompt) {
    console.log(\`Generating code with GLM 4.6: \${prompt}\`)
    // AI code generation happens here
  },
  
  async refactorCode(code, instruction) {
    console.log('Refactoring with GLM 4.6...')
    // Advanced refactoring happens here
  }
}

// Start building your project with AI assistance! 🚀
console.log('Ready to code with GLM 4.6 assistance!')`,
      language: 'javascript',
      isDirty: false
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
            { id: 'layout', name: 'layout.tsx', type: 'file', content: '// Layout component' },
            { id: 'page', name: 'page.tsx', type: 'file', content: '// Home page' },
            { id: 'globals', name: 'globals.css', type: 'file', content: '/* Global styles */' }
          ]
        },
        {
          id: 'components',
          name: 'components',
          type: 'folder',
          isOpen: false,
          children: [
            { id: 'ui', name: 'ui', type: 'folder', isOpen: false, children: [] },
            { id: 'header', name: 'header.tsx', type: 'file', content: '// Header component' }
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
    { id: 'package', name: 'package.json', type: 'file', content: '{}' },
    { id: 'readme', name: 'README.md', type: 'file', content: '# Project Documentation' }
  ])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '🚀 Welcome to IMPECKS-AI! I\'m your GLM 4.6 coding assistant. I can help you with:\n\n• **Code Generation**: Create code from descriptions\n• **Auto-Refactoring**: Improve and optimize your code\n• **Multi-file Refactoring**: Refactor entire codebases\n• **Bug Detection**: Find and fix issues in your code\n• **Documentation**: Generate comprehensive docs\n• **Performance Analysis**: Optimize your code\n\nHow can I assist you today?',
      timestamp: new Date()
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [refactorModalOpen, setRefactorModalOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [refactorInstruction, setRefactorInstruction] = useState('')
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [])

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
          language: 'javascript',
          isDirty: false
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

  const sendMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }

    setChatMessages([...chatMessages, userMessage])
    setChatInput('')
    setIsProcessing(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert software engineer and AI coding assistant powered by GLM 4.6. You provide helpful, accurate, and detailed coding assistance.'
            },
            {
              role: 'user',
              content: chatInput
            }
          ],
          userId: user?.userId,
          model: 'zhipuai/glm-4-6b'
        })
      })

      const result = await response.json()

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content || 'I apologize, but I couldn\'t process that request.',
        timestamp: new Date()
      }

      setChatMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Chat API Error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const startMultiFileRefactor = () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to refactor')
      return
    }

    const files = selectedFiles.map(fileId => {
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

      return findFile(fileTree)
    }).filter(f => f !== null).map(f => ({
      name: f.name,
      content: f.content || '',
      language: 'javascript'
    }))

    if (files.length > 0) {
      setRefactorModalOpen(true)
    }
  }

  const executeMultiFileRefactor = async () => {
    if (!refactorInstruction.trim()) return

    const files = selectedFiles.map(fileId => {
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

      return findFile(fileTree)
    }).filter(f => f !== null).map(f => ({
      name: f.name,
      content: f.content || '',
      language: 'javascript'
    }))

    setIsProcessing(true)
    setRefactorModalOpen(false)

    try {
      const response = await fetch('/api/refactor/multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          instruction: refactorInstruction,
          userId: user?.userId,
          model: 'zhipuai/glm-4-6b'
        })
      })

      const result = await response.json()

      if (result.success) {
        // Add refactored files as new tabs
        result.refactoredFiles.forEach((file: any, index) => {
          const newTab: Tab = {
            id: `refactored-${file.name}-${Date.now()}`,
            name: `${file.name}-refactored.js`,
            content: file.refactoredCode,
            language: 'javascript',
            isDirty: false
          }
          setTabs(prev => [...prev, newTab])
        })

        // Switch to first refactored file
        if (result.refactoredFiles.length > 0) {
          setActiveTab(`refactored-${result.refactoredFiles[0].name}-${Date.now()}`)
        }

        alert('Multi-file refactoring completed! Check the new tabs for refactored code.')
      } else {
        alert('Refactoring failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Multi-file refactor error:', error)
      alert('Refactoring failed: ' + error.message)
    } finally {
      setIsProcessing(false)
      setRefactorInstruction('')
      setSelectedFiles([])
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const currentTab = tabs.find(tab => tab.id === activeTab)

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading workspace...</p>
      </div>
    </div>
  }

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
              GLM 4.6
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <GitBranch className="h-4 w-4 mr-2" />
              main
            </Button>
            <Button variant="ghost" size="sm">
              <Terminal className="h-4 w-4 mr-2" />
              Terminal
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setRefactorModalOpen(true)}
                      disabled={selectedFiles.length === 0}
                    >
                      <Wand2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardTitle>
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
                                        <input
                                          type="checkbox"
                                          checked={selectedFiles.includes(child.id)}
                                          onChange={() => toggleFileSelection(child.id)}
                                          className="mr-2"
                                        />
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
                            <input
                              type="checkbox"
                              checked={selectedFiles.includes(node.id)}
                              onChange={() => toggleFileSelection(node.id)}
                              className="mr-2"
                            />
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
          <ResizablePanel defaultSize={60}>
            <div className="h-full flex flex-col">
              {/* Tabs */}
              <div className="border-b bg-muted/30">
                <div className="flex items-center">
                  {tabs.map(tab => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none border-r justify-between"
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(tab.name)}
                        <span>{tab.name}</span>
                        {tab.isDirty && <div className="w-2 h-2 bg-orange-400 rounded-full" />}
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
              <div className="flex-1 p-4 font-mono text-sm">
                {currentTab && (
                  <div className="h-full">
                    <div className="bg-muted/50 rounded-lg p-4 h-full">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                        <code>{currentTab.content}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="border-t bg-muted/30 px-4 py-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>Line 1, Col 1</span>
                    <span>{currentTab?.language || 'JavaScript'}</span>
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
          <ResizablePanel defaultSize={20}>
            <Tabs defaultValue="chat" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
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
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">GLM 4.6 is thinking...</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="border-t p-4">
                        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask GLM 4.6 for coding help..."
                            className="flex-1"
                            disabled={isProcessing}
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
                    <div className="flex flex-col h-[calc(100vh-12rem)]">
                      <ScrollArea ref={terminalRef} className="flex-1 p-4 font-mono text-sm">
                        <div className="space-y-1">
                          <div className="text-green-400">$ IMPECKS-AI Terminal v1.0.0</div>
                          <div className="text-green-400">$ GLM 4.6 Integration: Active</div>
                          <div className="text-green-400">$ Ready for commands...</div>
                          <div className="text-green-400">$ Type "help" for available commands</div>
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Multi-file Refactor Modal */}
      {refactorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Multi-file Refactor with GLM 4.6
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setRefactorModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Selected Files ({selectedFiles.length}):</label>
                  <div className="text-xs text-muted-foreground mb-2">
                    {selectedFiles.map(fileId => {
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
                      return file ? file.name : 'Unknown'
                    }).join(', ')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Refactoring Instruction:</label>
                  <textarea
                    value={refactorInstruction}
                    onChange={(e) => setRefactorInstruction(e.target.value)}
                    placeholder="e.g., Optimize for performance, Add error handling, Convert to modern syntax, Improve code organization..."
                    className="w-full h-32 p-3 border rounded-md bg-muted/50 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={executeMultiFileRefactor}
                    className="flex-1"
                    disabled={!refactorInstruction.trim() || selectedFiles.length === 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refactoring with GLM 4.6...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Start Multi-file Refactor
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setRefactorModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}