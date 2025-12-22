'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Zap,
  Wrench,
  User,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react'

interface NavigationItem {
  title: string
  href: string
  icon: any
  description: string
  badgeKey?: string
}

const navigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/cliente',
    icon: Home,
    description: 'Resumen general y métricas'
  },
  {
    title: 'Sistemas Solares',
    href: '/cliente/sistema',
    icon: Zap,
    description: 'Monitoreo de sistemas instalados'
  },
  {
    title: 'Mantenimiento',
    href: '/cliente/mantenimientos',
    icon: Wrench,
    description: 'Programación de mantenimientos',
    badgeKey: 'maintenance'
  },
  {
    title: 'Mis Pagos',
    href: '/cliente/pagos',
    icon: CreditCard,
    description: 'Historial de pagos y saldos'
  },
  {
    title: 'Mi Perfil',
    href: '/cliente/perfil',
    icon: User,
    description: 'Mis datos personales'
  }
]

interface MaintenanceCounts {
  scheduled: number
  pendingApproval: number
  cancelled: number
}

interface ClientSidebarProps {
  className?: string
}

export function ClientSidebar({ className }: ClientSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [maintenanceCounts, setMaintenanceCounts] = useState<MaintenanceCounts>({ scheduled: 0, pendingApproval: 0, cancelled: 0 })
  const pathname = usePathname()

  // Fetch maintenance counts
  useEffect(() => {
    const fetchMaintenanceCounts = async () => {
      try {
        const response = await fetch('/api/cliente/mantenimientos/dashboard')
        const result = await response.json()
        if (result.success) {
          setMaintenanceCounts({
            scheduled: result.data.scheduledThisWeek || 0,
            pendingApproval: result.data.pendingApproval || 0,
            cancelled: result.data.cancelledUnread || 0
          })
        }
      } catch (error) {
        console.error('Error fetching maintenance counts:', error)
      }
    }

    fetchMaintenanceCounts()
    // Refresh every 5 minutes
    const interval = setInterval(fetchMaintenanceCounts, 5 * 60 * 1000)

    // Listen for custom event to refresh counts immediately
    const handleRefresh = () => {
      fetchMaintenanceCounts()
    }
    window.addEventListener('refreshMaintenanceCounts', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('refreshMaintenanceCounts', handleRefresh)
    }
  }, [])

  const totalMaintenanceAlerts = maintenanceCounts.scheduled + maintenanceCounts.pendingApproval + maintenanceCounts.cancelled

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-white transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Toggle Button */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">Navegación</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {navigation.map((item) => {
            const Icon = item.icon
            // For dashboard (/cliente), only match exact path
            // For other routes, match exact or child paths
            const isActive = item.href === '/cliente'
              ? pathname === '/cliente'
              : pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-12 relative',
                    isCollapsed && 'px-2',
                    isActive && 'bg-primary/10 text-primary font-medium'
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <div className="relative">
                    <Icon className={cn('h-5 w-5', isCollapsed ? 'mx-auto' : 'mr-3')} />
                    {/* Badge for collapsed sidebar */}
                    {isCollapsed && item.badgeKey === 'maintenance' && totalMaintenanceAlerts > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {totalMaintenanceAlerts > 9 ? '9+' : totalMaintenanceAlerts}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{item.title}</span>
                          {/* Badges for maintenance */}
                          {item.badgeKey === 'maintenance' && (
                            <div className="flex items-center gap-1">
                              {maintenanceCounts.scheduled > 0 && (
                                <Badge
                                  variant="default"
                                  className="h-5 px-1.5 text-[10px] bg-green-600 hover:bg-green-700"
                                  title="Mantenimientos confirmados"
                                >
                                  {maintenanceCounts.scheduled}
                                </Badge>
                              )}
                              {maintenanceCounts.pendingApproval > 0 && (
                                <Badge
                                  variant="default"
                                  className="h-5 px-1.5 text-[10px] bg-orange-500 hover:bg-orange-600"
                                  title="Pendientes de aprobación"
                                >
                                  {maintenanceCounts.pendingApproval}
                                </Badge>
                              )}
                              {maintenanceCounts.cancelled > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="h-5 px-1.5 text-[10px]"
                                  title="Solicitudes rechazadas"
                                >
                                  {maintenanceCounts.cancelled}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </div>
                      </div>
                    </>
                  )}
                </Button>
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">MundoSolar v1.0</p>
            <p>Portal del Cliente</p>
          </div>
        </div>
      )}
    </div>
  )
}
