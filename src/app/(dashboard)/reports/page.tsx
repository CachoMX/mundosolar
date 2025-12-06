'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Users,
  Sun,
  Wrench,
  ShoppingCart,
  Loader2,
  AlertTriangle,
  Zap,
  Leaf
} from 'lucide-react'

interface KPIs {
  totalSales: number
  yoyChange: number
  totalOrders: number
  avgOrderValue: number
  totalClients: number
  newClientsThisYear: number
  solarSystemsInstalled: number
  totalCapacityKw: number
  totalEnergyKwh: number
  totalCO2SavedKg: number
  maintenanceCompleted: number
}

interface OrderByStatus {
  status: string
  count: number
}

interface OrderByType {
  type: string
  count: number
  revenue: number
}

interface MonthlyData {
  month: string
  sales: number
  orders: number
}

interface TopClient {
  clientId: string
  name: string
  totalRevenue: number
  orderCount: number
}

export default function ReportsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [ordersByStatus, setOrdersByStatus] = useState<OrderByStatus[]>([])
  const [ordersByType, setOrdersByType] = useState<OrderByType[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports')
      const result = await response.json()

      if (result.success) {
        setKpis(result.data.kpis)
        setOrdersByStatus(result.data.ordersByStatus)
        setOrdersByType(result.data.ordersByType)
        setMonthlyTrend(result.data.monthlyTrend)
        setTopClients(result.data.topClients)
      } else {
        setError(result.error || 'Error al cargar reportes')
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-MX').format(value)
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': 'Borrador',
      'PENDING': 'Pendiente',
      'CONFIRMED': 'Confirmada',
      'IN_PROGRESS': 'En Proceso',
      'SHIPPED': 'Enviada',
      'DELIVERED': 'Entregada',
      'COMPLETED': 'Completada',
      'CANCELLED': 'Cancelada'
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SALE': 'Venta',
      'INSTALLATION': 'Instalación',
      'MAINTENANCE': 'Mantenimiento',
      'WARRANTY': 'Garantía'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar reportes</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchReports}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reportes y Análisis</h2>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Año</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalSales || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {(kpis?.yoyChange || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={(kpis?.yoyChange || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                {kpis?.yoyChange || 0}%
              </span>
              <span className="ml-1">vs año anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(kpis?.avgOrderValue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{kpis?.newClientsThisYear || 0} nuevos este año
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistemas Instalados</CardTitle>
            <Sun className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{kpis?.solarSystemsInstalled || 0}</div>
            <p className="text-xs text-muted-foreground">
              {kpis?.totalCapacityKw || 0} kW instalados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Energy and Environmental Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energía Generada</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatNumber(kpis?.totalEnergyKwh || 0)} kWh</div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO₂ Evitado</CardTitle>
            <Leaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-500">{formatNumber(kpis?.totalCO2SavedKg || 0)} kg</div>
            <p className="text-xs text-muted-foreground">Impacto ambiental</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimientos</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{kpis?.maintenanceCompleted || 0}</div>
            <p className="text-xs text-muted-foreground">Completados este año</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Ventas (12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-40 gap-1">
            {monthlyTrend.map((month, index) => {
              const maxSales = Math.max(...monthlyTrend.map(m => m.sales), 1)
              const height = (month.sales / maxSales) * 100
              return (
                <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 3)}%` }}
                    title={`${month.month}: ${formatCurrency(month.sales)}`}
                  />
                  <span className="text-[10px] mt-1 text-muted-foreground truncate w-full text-center">
                    {month.month}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Órdenes por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {ordersByStatus.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{getStatusLabel(item.status)}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Órdenes por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByType.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {ordersByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{getTypeLabel(item.type)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.count} órdenes)</span>
                    </div>
                    <span className="font-bold">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Top Clientes por Ingresos
          </CardTitle>
          <CardDescription>Clientes con mayor volumen de compras</CardDescription>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Sin datos de clientes</p>
          ) : (
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={client.clientId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.orderCount} órdenes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(client.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
