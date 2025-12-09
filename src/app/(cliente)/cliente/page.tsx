'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  Calendar,
  TrendingUp,
  Activity,
  Leaf,
  AlertTriangle,
  Loader2,
  Sun,
  Wrench
} from 'lucide-react'

interface ClientDashboardData {
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  stats: {
    totalEnergyGenerated: number
    monthlyEnergy: number
    dailyEnergy: number
    co2Saved: number
    systemStatus: string
    pendingMaintenance: number
  }
  recentMaintenance: {
    id: string
    title: string
    type: string
    status: string
    scheduledDate: string
  }[]
  monthlyTrend: {
    month: string
    energy: number
  }[]
}

export default function ClienteDashboardPage() {
  const [data, setData] = useState<ClientDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/cliente/dashboard')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Error al cargar datos')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      title: 'Energía Hoy',
      value: `${data.stats.dailyEnergy.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kWh`,
      icon: Zap,
      description: 'Generada hoy'
    },
    {
      title: 'Energía del Mes',
      value: `${data.stats.monthlyEnergy.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kWh`,
      icon: TrendingUp,
      description: 'Este mes'
    },
    {
      title: 'Energía Total',
      value: `${data.stats.totalEnergyGenerated.toLocaleString('es-MX', { maximumFractionDigits: 0 })} kWh`,
      icon: Sun,
      description: 'Desde instalación'
    },
    {
      title: 'CO₂ Ahorrado',
      value: `${data.stats.co2Saved.toLocaleString('es-MX', { maximumFractionDigits: 0 })} kg`,
      icon: Leaf,
      description: 'Total acumulado'
    },
    {
      title: 'Estado del Sistema',
      value: data.stats.systemStatus === 'online' ? 'En Línea' : 'Fuera de Línea',
      icon: Activity,
      description: data.stats.systemStatus === 'online' ? 'Funcionando correctamente' : 'Verificar sistema'
    },
    {
      title: 'Mantenimientos',
      value: data.stats.pendingMaintenance.toString(),
      icon: Wrench,
      description: 'Pendientes'
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'PENDING_APPROVAL': { label: 'Pendiente', variant: 'secondary' },
      'SCHEDULED': { label: 'Programado', variant: 'default' },
      'IN_PROGRESS': { label: 'En Proceso', variant: 'default' },
      'COMPLETED': { label: 'Completado', variant: 'outline' },
      'CANCELLED': { label: 'Cancelado', variant: 'destructive' }
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Resumen de tu sistema solar - {data.client.firstName} {data.client.lastName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="maintenance">Mis Mantenimientos</TabsTrigger>
          <TabsTrigger value="energy">Generación</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Mantenimientos</CardTitle>
              <CardDescription>Mantenimientos programados y realizados</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentMaintenance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay mantenimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentMaintenance.map((maintenance) => (
                    <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{maintenance.title}</p>
                          {getStatusBadge(maintenance.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{maintenance.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {maintenance.scheduledDate ? new Date(maintenance.scheduledDate).toLocaleDateString('es-MX') : 'Sin fecha'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generación Mensual</CardTitle>
              <CardDescription>Energía generada por mes</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyTrend.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay datos de generación disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.monthlyTrend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium capitalize">{month.month}</span>
                      <span className="text-lg font-bold">
                        {month.energy.toLocaleString('es-MX', { maximumFractionDigits: 2 })} kWh
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
