'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sun, Search, User, Settings, LogOut, Bell, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  data?: {
    maintenanceId?: string
    clientId?: string
    status?: string
  }
}

interface NavbarProps {
  isClientPortal?: boolean
}

export function Navbar({ isClientPortal = false }: NavbarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Prevent hydration mismatch by only rendering dropdowns after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isClientPortal) {
      // Get client info from session
      const getClientSession = async () => {
        try {
          const response = await fetch('/api/auth/client-session')
          const result = await response.json()
          if (result.success) {
            setUserName(`${result.client.firstName} ${result.client.lastName}`)
            setUserEmail(result.client.email)
            setIsAuthenticated(true)
            loadNotifications()
          } else {
            setIsAuthenticated(false)
          }
        } catch (err) {
          console.error('Error getting client session:', err)
          setIsAuthenticated(false)
        } finally {
          setAuthChecked(true)
        }
      }
      getClientSession()

      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    } else {
      // Get admin/staff info from Supabase
      const getUser = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setUserEmail(user.email || null)
            setUserName(user.user_metadata?.name || user.email || null)
            setIsAuthenticated(true)
            loadNotifications()
          } else {
            setIsAuthenticated(false)
          }
        } catch (err) {
          console.error('Error getting user:', err)
          setIsAuthenticated(false)
        } finally {
          setAuthChecked(true)
        }
      }
      getUser()

      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isClientPortal])

  const loadNotifications = async () => {
    try {
      const apiPath = isClientPortal ? '/api/cliente/notifications' : '/api/notifications'
      const response = await fetch(apiPath)
      const data = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const apiPath = isClientPortal
        ? `/api/cliente/notifications/${notificationId}/read`
        : `/api/notifications/${notificationId}/read`
      const response = await fetch(apiPath, {
        method: 'PATCH',
      })

      if (response.ok) {
        loadNotifications()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const apiPath = isClientPortal
        ? '/api/cliente/notifications/mark-all-read'
        : '/api/notifications/mark-all-read'
      const response = await fetch(apiPath, {
        method: 'POST',
      })

      if (response.ok) {
        loadNotifications()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const apiPath = isClientPortal
        ? `/api/cliente/notifications/${notificationId}`
        : `/api/notifications/${notificationId}`
      const response = await fetch(apiPath, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Update local state immediately
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId)
          return notification && !notification.read ? prev - 1 : prev
        })
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Handle notification click - navigate to the relevant page and delete it
  const handleNotificationClick = async (notification: Notification) => {
    // Delete notification when clicked (it will disappear)
    deleteNotification(notification.id)

    // Navigate based on notification type and data
    if (notification.data?.maintenanceId) {
      if (isClientPortal) {
        // Client goes to their maintenance page
        router.push('/cliente/mantenimientos')
      } else {
        // Admin goes to specific maintenance detail
        router.push(`/maintenance/${notification.data.maintenanceId}`)
      }
    }
  }

  const handleSignOut = async () => {
    if (isClientPortal) {
      await fetch('/api/auth/client-logout', { method: 'POST' })
    } else {
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  const handleProfile = () => {
    if (isClientPortal) {
      router.push('/cliente/perfil')
    } else {
      router.push('/profile')
    }
  }

  const handleSettings = () => {
    if (isClientPortal) {
      router.push('/cliente/perfil')
    } else {
      router.push('/settings')
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-24 items-center">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-2">
          <img 
            src="/assets/logos/logo.svg" 
            alt="MundoSolar" 
            className="h-20 w-auto"
          />
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar clientes, órdenes, productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          {!mounted ? (
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
          ) : (
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault()
                      markAllAsRead()
                    }}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Marcar todas como leídas
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p>No tienes notificaciones</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex-col items-start p-3 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-blue-600 mt-1"></div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            title="Eliminar notificación"
                          >
                            <X className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                          </button>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          {/* User Menu */}
          {!mounted || !authChecked ? (
            // Loading state - show empty avatar while checking auth
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gray-200 animate-pulse"></AvatarFallback>
              </Avatar>
            </Button>
          ) : !isAuthenticated ? (
            // Not authenticated - show login button
            <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
              Iniciar Sesión
            </Button>
          ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={userName || ''} />
                  <AvatarFallback>
                    {userName
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {userName || userEmail}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfile}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}