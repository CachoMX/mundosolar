'use client'

import { useState } from 'react'
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
  ChevronRight
} from 'lucide-react'

interface NavigationItem {
  title: string
  href: string
  icon: any
  badge?: string | number
  description: string
}

const navigation: NavigationItem[] = [
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
    badge: '234',
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
    badge: '12',
    description: 'Gestión de pedidos y ventas'
  },
  {
    title: 'Mantenimiento',
    href: '/maintenance',
    icon: Wrench,
    badge: '8',
    description: 'Programación de mantenimientos'
  },
  {
    title: 'Sistemas Solares',
    href: '/solar-systems',
    icon: Zap,
    description: 'Monitoreo de sistemas instalados'
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

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

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
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
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
                          {item.badge && (
                            <Badge
                              variant={isActive ? 'default' : 'secondary'}
                              className="text-xs h-5"
                            >
                              {item.badge}
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