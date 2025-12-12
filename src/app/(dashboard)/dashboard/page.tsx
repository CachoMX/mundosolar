'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  ClipboardList,
  DollarSign,
  Zap,
  Calendar,
  TrendingUp,
  Activity,
  Leaf,
  AlertTriangle,
  Loader2,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalClients: number
  activeOrders: number
  monthlyRevenue: number
  pendingMaintenance: number
  totalEnergyGenerated: number
  co2SavedThisMonth: number
}

interface RecentOrder {
  id: string
  orderNumber: string
  client: string
  total: number
  status: string
  createdAt: string
}

interface RecentMaintenance {
  id: string
  client: string
  maintenanceType: string
  scheduledDate: string
  status: string
}

interface DashboardData {
  stats: DashboardStats
  recentOrders: RecentOrder[]
  recentMaintenance: RecentMaintenance[]
  monthlyTrend: { month: string; revenue: number }[]
}

const fetchDashboardData = async (): Promise<DashboardData> => {
  const response = await fetch('/api/dashboard/stats')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al cargar datos')
  }
  return result.data
}

export default function DashboardPage() {
  const router = useRouter()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardData,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar dashboard</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      title: 'Total Clientes',
      value: data.stats.totalClients.toString(),
      icon: Users,
      description: 'Clientes activos',
      link: '/clients'
    },
    {
      title: 'Órdenes Activas',
      value: data.stats.activeOrders.toString(),
      icon: ClipboardList,
      description: 'En proceso',
      link: '/orders'
    },
    {
      title: 'Ingresos del Mes',
      value: `$${data.stats.monthlyRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: 'Mes actual',
      link: '/invoices'
    },
    {
      title: 'Energía Generada',
      value: `${data.stats.totalEnergyGenerated.toLocaleString('es-MX')} kWh`,
      icon: Zap,
      description: 'Este mes',
      link: '/solar-systems'
    },
    {
      title: 'CO₂ Ahorrado',
      value: `${data.stats.co2SavedThisMonth.toLocaleString('es-MX')} kg`,
      icon: Leaf,
      description: 'Este mes',
      link: '/solar-systems'
    },
    {
      title: 'Mantenimientos',
      value: data.stats.pendingMaintenance.toString(),
      icon: Calendar,
      description: 'Pendientes',
      link: '/maintenance'
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'PENDING': { label: 'Pendiente', variant: 'secondary' },
      'CONFIRMED': { label: 'Confirmada', variant: 'default' },
      'IN_PROGRESS': { label: 'En Proceso', variant: 'default' },
      'COMPLETED': { label: 'Completada', variant: 'outline' },
      'CANCELLED': { label: 'Cancelada', variant: 'destructive' },
      'SCHEDULED': { label: 'Programado', variant: 'default' }
    }

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen de tu sistema de gestión solar
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </Link>
          <Link href="/orders/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Link key={index} href={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Tabs for Recent Activity */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Órdenes Recientes</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimientos</TabsTrigger>
          <TabsTrigger value="revenue">Ingresos</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes Recientes</CardTitle>
              <CardDescription>
                Últimas órdenes registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay órdenes registradas</p>
                  <Link href="/orders/new">
                    <Button className="mt-4" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Primera Orden
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{order.orderNumber}</p>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{order.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${order.total.toLocaleString('es-MX')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mantenimientos Programados</CardTitle>
              <CardDescription>
                Próximos mantenimientos de sistemas solares
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentMaintenance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay mantenimientos programados</p>
                  <Link href="/maintenance/new">
                    <Button className="mt-4" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Programar Mantenimiento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentMaintenance
                    .filter((m) => m.status !== 'CANCELLED')
                    .map((maintenance) => (
                    <div
                      key={maintenance.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/maintenance/${maintenance.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{maintenance.client}</p>
                          {getStatusBadge(maintenance.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{maintenance.maintenanceType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(maintenance.scheduledDate).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ingresos</CardTitle>
              <CardDescription>
                Ingresos de los últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyTrend.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay datos de ingresos disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.monthlyTrend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium capitalize">{month.month}</span>
                      <span className="text-lg font-bold">
                        ${month.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
