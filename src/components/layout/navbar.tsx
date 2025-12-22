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
import { Sun, Search, User, Settings, LogOut, Bell, Check, X, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react'
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
    timeWasChanged?: boolean
    originalScheduledDate?: string
    newScheduledDate?: string
    oldScheduledDate?: string
    rescheduleReason?: string
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
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
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

  // Helper function to format date for display
  const formatScheduledDate = (dateString: string | undefined) => {
    if (!dateString) return 'No especificada'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  // Check if notification is a time change notification
  const isTimeChangeNotification = (notification: Notification) => {
    return notification.type === 'maintenance_time_changed' ||
           notification.type === 'maintenance_rescheduled' ||
           (notification.type === 'maintenance_scheduled' && notification.data?.timeWasChanged)
  }

  // Handle notification click - expand for time change, navigate otherwise
  const handleNotificationClick = async (notification: Notification, e: React.MouseEvent) => {
    // If it's a time change notification, toggle expand instead of navigating
    if (isTimeChangeNotification(notification)) {
      e.preventDefault()
      e.stopPropagation()

      if (expandedNotificationId === notification.id) {
        setExpandedNotificationId(null)
      } else {
        setExpandedNotificationId(notification.id)
        // Mark as read when expanded
        if (!notification.read) {
          markAsRead(notification.id)
        }
      }
      return
    }

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

  // Handle "Ver mantenimiento" button click within expanded notification
  const handleViewMaintenance = (notification: Notification) => {
    deleteNotification(notification.id)
    if (notification.data?.maintenanceId) {
      if (isClientPortal) {
        router.push('/cliente/mantenimientos')
      } else {
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
                  notifications.map((notification) => {
                    const isTimeChange = isTimeChangeNotification(notification)
                    const isExpanded = expandedNotificationId === notification.id

                    return (
                      <div
                        key={notification.id}
                        className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                          !notification.read ? 'bg-blue-50' : 'bg-white'
                        } ${isTimeChange ? 'hover:bg-amber-50' : 'hover:bg-gray-50'}`}
                        onClick={(e) => handleNotificationClick(notification, e)}
                      >
                        <div className="flex items-start justify-between w-full gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{notification.title}</p>
                              {isTimeChange && (
                                <span className="flex items-center text-amber-600">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </p>

                            {/* Expanded content for time change notifications */}
                            {isTimeChange && isExpanded && (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="space-y-3">
                                  {/* Original Date */}
                                  <div className="flex items-start gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-700">Fecha solicitada:</p>
                                      <p className="text-xs text-gray-600">
                                        {formatScheduledDate(notification.data?.originalScheduledDate || notification.data?.oldScheduledDate)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* New Date */}
                                  <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-amber-700">Nueva fecha programada:</p>
                                      <p className="text-xs text-amber-600 font-medium">
                                        {formatScheduledDate(notification.data?.newScheduledDate)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Reason */}
                                  {notification.data?.rescheduleReason && (
                                    <div className="pt-2 border-t border-amber-200">
                                      <p className="text-xs font-medium text-gray-700 mb-1">Motivo del cambio:</p>
                                      <p className="text-xs text-gray-600 italic">
                                        "{notification.data.rescheduleReason}"
                                      </p>
                                    </div>
                                  )}

                                  {/* Action button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewMaintenance(notification)
                                    }}
                                    className="w-full mt-2 text-xs bg-primary text-white py-2 px-3 rounded-md hover:bg-primary/90 transition-colors"
                                  >
                                    Ver mantenimiento
                                  </button>
                                </div>
                              </div>
                            )}
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
                      </div>
                    )
                  })
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