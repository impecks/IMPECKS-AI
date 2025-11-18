'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { 
  Menu, 
  X, 
  Home, 
  FileText, 
  MessageCircle, 
  Settings, 
  LogOut,
  User,
  ChevronDown
} from 'lucide-react'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: Settings, requiresAuth: true },
  { name: 'Posts', href: '/posts', icon: FileText, requiresAuth: true },
  { name: 'AI Chat', href: '/chat', icon: MessageCircle, requiresAuth: true },
]

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const filteredNavigation = navigation.filter(item => 
    !item.requiresAuth || user
  )

  const isActive = (href: string) => pathname === href

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <img
                  src="/logo.svg"
                  alt="Z.ai Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-xl">DevPlatform</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:block">{user.name || user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth">Get Started</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  {filteredNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive(item.href)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                  
                  {!user && (
                    <>
                      <div className="border-t pt-4">
                        <Button variant="ghost" className="w-full justify-start" asChild>
                          <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                            Sign In
                          </Link>
                        </Button>
                        <Button className="w-full mt-2" asChild>
                          <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                            Get Started
                          </Link>
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {user && (
                    <>
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm font-medium">{user.name || user.email}</span>
                        </div>
                        <Button variant="ghost" className="w-full justify-start" asChild>
                          <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Dashboard
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start" 
                          onClick={() => {
                            logout()
                            setMobileMenuOpen(false)
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}