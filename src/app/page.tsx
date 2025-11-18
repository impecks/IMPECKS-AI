'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Zap, 
  Shield, 
  Globe, 
  Code, 
  Database, 
  Cloud,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  TrendingUp,
  Monitor,
  Bot,
  Terminal,
  GitBranch,
  Cpu,
  Lock
} from 'lucide-react'

export default function Home() {
  const [email, setEmail] = useState('')
  const { user, logout, loading } = useAuth()

  useEffect(() => {
    if (user && !loading) {
      window.location.href = '/workspace'
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing IMPECKS-AI...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to workspace
  }

  const features = [
    {
      icon: <Monitor className="h-6 w-6" />,
      title: "Monaco Editor",
      description: "Full VS Code editing experience with IntelliSense, multi-cursor, and advanced refactoring."
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "AI-Powered Coding",
      description: "GLM 4.6 integration for intelligent code generation, debugging, and refactoring."
    },
    {
      icon: <Terminal className="h-6 w-6" />,
      title: "Real-time Output",
      description: "Live terminal output, compilation results, and execution feedback."
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: "Version Control",
      description: "Integrated Git support with branch management and commit history."
    },
    {
      icon: <Cloud className="h-6 w-6" />,
      title: "AWS Serverless",
      description: "Deploy to Lambda, API Gateway, DynamoDB with one-click deployment."
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Enterprise Security",
      description: "End-to-end encryption with Cognito auth and RBAC access control."
    }
  ]

  const capabilities = [
    {
      title: "Frontend Development",
      items: ["Next.js 14 App Router", "React 19", "TypeScript 5", "Tailwind CSS", "Framer Motion"]
    },
    {
      title: "Desktop IDE", 
      items: ["Electron.js Workspace", "Monaco Editor", "File Tree Navigation", "Multi-tab Support", "Theme Switcher"]
    },
    {
      title: "Backend & Cloud",
      items: ["AWS Lambda", "API Gateway", "DynamoDB", "S3 Storage", "CloudWatch Logs"]
    },
    {
      title: "AI & Automation",
      items: ["GLM 4.6 Model", "Code Generation", "Auto-refactoring", "Bug Detection", "Performance Optimization"]
    }
  ]

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      description: "Test and educational usage",
      features: [
        "150 daily requests",
        "Slow rate limit",
        "Basic code generation",
        "Educational purposes only",
        "Community support"
      ],
      highlighted: false,
      color: "slate"
    },
    {
      name: "Basic",
      price: "$6",
      description: "Personal projects",
      features: [
        "25,000 monthly tokens",
        "Standard speed",
        "Small coding tasks",
        "Personal projects",
        "Email support"
      ],
      highlighted: false,
      color: "blue"
    },
    {
      name: "Pro",
      price: "$25",
      description: "Recommended for students & indie devs",
      features: [
        "150,000 tokens",
        "Multi-file edits",
        "Fast inference",
        "Priority support",
        "Advanced debugging"
      ],
      highlighted: true,
      color: "purple"
    },
    {
      name: "Enterprise",
      price: "$299",
      description: "Unlimited productivity",
      features: [
        "5 million tokens",
        "Highest speed",
        "Unlimited concurrency",
        "SLA guarantee",
        "On-device caching"
      ],
      highlighted: false,
      color: "emerald"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative px-4 py-20 md:py-32">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="container mx-auto text-center relative z-10">
          <Badge variant="outline" className="mb-6 text-sm border-purple-500/30 text-purple-300 bg-purple-500/10">
            <Cpu className="w-3 h-3 mr-2" />
            AI-Powered Development Environment
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              IMPECKS-AI
            </span>
            <br />
            <span className="text-3xl md:text-5xl text-white/90">
              World-Class AI Coding Engine
            </span>
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto leading-relaxed">
            The next-generation IDE that combines VS Code's power with AI intelligence. 
            Build Next.js apps, manage Electron workspaces, and deploy to AWS serverless—all with AI assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0">
              <Terminal className="mr-2 h-5 w-5" />
              Launch IDE
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white/20 text-white hover:bg-white/10">
              <Monitor className="mr-2 h-5 w-5" />
              Download Desktop
            </Button>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>50,000+ developers</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>10x faster coding</span>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="py-20 px-4 bg-black/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Complete Development Stack
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Everything you need for modern full-stack development in one unified platform
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((capability, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-lg">{capability.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {capability.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              AI-Enhanced Development Experience
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Built with cutting-edge AI technology to accelerate your development workflow
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center text-purple-400 mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-white/70 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-black/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-white/70">
              Scale from learning to enterprise development
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all ${
                  plan.highlighted ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-white">
                    {plan.price}
                    {plan.price !== "$0" && <span className="text-lg text-white/60">/month</span>}
                  </div>
                  <CardDescription className="text-white/70">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-white/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.highlighted 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 border-0" 
                        : "border-white/20 text-white hover:bg-white/10"
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.price === "$0" ? "Start Free" : "Upgrade Now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-12 backdrop-blur-sm border border-white/10">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Code 10x Faster?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Join thousands of developers using AI to build better software, faster.
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 border-0 px-8">
                  Start Free Trial
                </Button>
              </div>
              <p className="text-sm mt-4 text-white/60">
                No credit card required. 150 free requests to test the platform.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}