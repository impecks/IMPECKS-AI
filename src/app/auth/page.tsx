'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ email: '', password: '', name: '' })
  const { login, signUp } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await login(loginData.email, loginData.password)
      if (!result.success) {
        setError(result.error || 'Login failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signUp(signupData.email, signupData.password, signupData.name)
      if (!result.success) {
        setError(result.error || 'Signup failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">IMPECKS-AI</h1>
          <p className="text-white/70">AI-Powered Development Environment</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-center">Welcome Back</CardTitle>
            <CardDescription className="text-white/70 text-center">
              Sign in to your AI coding workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-white/10">Login</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-white/10">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 text-sm">{error}</span>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-white">Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your name"
                      value={signupData.name}
                      onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-red-400 text-sm">{error}</span>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}