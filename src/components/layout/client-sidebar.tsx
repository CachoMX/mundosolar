'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
    description: 'Programación de mantenimientos'
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

interface ClientSidebarProps {
  className?: string
}

export function ClientSidebar({ className }: ClientSidebarProps) {
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
