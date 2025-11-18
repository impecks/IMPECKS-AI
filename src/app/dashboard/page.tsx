'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Settings,
  LogOut,
  MessageCircle
} from 'lucide-react'

export default function Dashboard() {
  const { user, logout, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth'
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const stats = [
    {
      title: "Total Posts",
      value: "12",
      change: "+2 from last week",
      icon: <FileText className="h-4 w-4" />,
      trend: "up"
    },
    {
      title: "Total Views",
      value: "1,234",
      change: "+12% from last month",
      icon: <TrendingUp className="h-4 w-4" />,
      trend: "up"
    },
    {
      title: "Active Users",
      value: "89",
      change: "+5 from yesterday",
      icon: <Users className="h-4 w-4" />,
      trend: "up"
    },
    {
      title: "Avg. Read Time",
      value: "4m 32s",
      change: "+15s from last week",
      icon: <Clock className="h-4 w-4" />,
      trend: "down"
    }
  ]

  const recentPosts = [
    { id: 1, title: "Getting Started with Next.js 15", date: "2024-01-15", views: 234 },
    { id: 2, title: "Building Modern Web Apps", date: "2024-01-14", views: 189 },
    { id: 3, title: "TypeScript Best Practices", date: "2024-01-13", views: 156 },
    { id: 4, title: "Database Design Patterns", date: "2024-01-12", views: 145 },
  ]

  return (
    <div className="min-h-screen bg-muted/20">
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name || user.email}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className="h-8 w-8 rounded-md bg-primary/10 p-2 text-primary">
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Posts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
                <CardDescription>Your latest published content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <h3 className="font-medium">{post.title}</h3>
                        <p className="text-sm text-muted-foreground">{post.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{post.views} views</span>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  View All Posts
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" onClick={() => window.location.href = '/posts'}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Posts
                </Button>
                <Button className="w-full justify-start" onClick={() => window.location.href = '/posts'}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create New Post
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/chat'}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}