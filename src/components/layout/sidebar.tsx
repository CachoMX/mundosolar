'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home,
  Users,
  Package,
  Calendar,
  FileText,
  Zap,
  BarChart3,
  Settings,
  Wrench,
  ClipboardList,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  HardHat
} from 'lucide-react'

interface NavigationItem {
  title: string
  href: string
  icon: any
  badgeKey?: 'clients' | 'orders' | 'maintenance'
  description: string
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Resumen general y métricas'
  },
  {
    title: 'Clientes',
    href: '/clients',
    icon: Users,
    badgeKey: 'clients',
    description: 'Gestión de clientes y datos fiscales'
  },
  {
    title: 'Inventario',
    href: '/inventory',
    icon: Package,
    description: 'Control de productos y almacén'
  },
  {
    title: 'Órdenes',
    href: '/orders',
    icon: ClipboardList,
    badgeKey: 'orders',
    description: 'Gestión de pedidos y ventas'
  },
  {
    title: 'Mantenimiento',
    href: '/maintenance',
    icon: Wrench,
    badgeKey: 'maintenance',
    description: 'Programación de mantenimientos'
  },
  {
    title: 'Sistemas Solares',
    href: '/solar-systems',
    icon: Zap,
    description: 'Monitoreo de sistemas instalados'
  },
  {
    title: 'Instalaciones',
    href: '/installations',
    icon: HardHat,
    description: 'Tracking de instalaciones y CFE'
  },
  {
    title: 'Facturación',
    href: '/invoicing',
    icon: FileText,
    description: 'Generación de facturas SAT'
  },
  {
    title: 'Reportes',
    href: '/reports',
    icon: BarChart3,
    description: 'Análisis y reportes financieros'
  },
  {
    title: 'Finanzas',
    href: '/finances',
    icon: DollarSign,
    description: 'Control financiero y flujo de caja'
  },
  {
    title: 'Configuración',
    href: '/settings',
    icon: Settings,
    description: 'Configuración del sistema'
  }
]

interface SidebarCounts {
  clients: number
  orders: number
  maintenance: number
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts>({ clients: 0, orders: 0, maintenance: 0 })
  const pathname = usePathname()

  useEffect(() => {
    loadCounts()
    // Refresh counts every 60 seconds
    const interval = setInterval(loadCounts, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadCounts = async () => {
    try {
      const response = await fetch('/api/sidebar-counts')
      const data = await response.json()
      if (data.success) {
        setCounts(data.data)
      }
    } catch (error) {
      console.error('Error loading sidebar counts:', error)
    }
  }

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
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const badgeValue = item.badgeKey ? counts[item.badgeKey] : null

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-12',
                    isCollapsed && 'px-2',
                    isActive && 'bg-primary/10 text-primary font-medium'
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className={cn('h-5 w-5', isCollapsed ? 'mx-auto' : 'mr-3')} />
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{item.title}</span>
                          {badgeValue !== null && badgeValue > 0 && (
                            <Badge
                              variant={isActive ? 'default' : 'secondary'}
                              className="text-xs h-5"
                            >
                              {badgeValue}
                            </Badge>
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
            <p>Sistema de Gestión Solar</p>
          </div>
        </div>
      )}
    </div>
  )
}