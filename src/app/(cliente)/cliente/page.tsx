'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  Calendar,
  TrendingUp,
  Activity,
  Leaf,
  AlertTriangle,
  Loader2,
  Sun,
  Wrench,
  Bell,
  CreditCard,
  AlertCircle
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface PaymentAlert {
  id: string
  amount: number
  dueDate: string
  installmentNumber: number | null
  totalInstallments: number | null
  orderNumber: string
  daysUntilDue?: number | null
  daysOverdue?: number | null
}

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
  paymentAlerts?: {
    upcoming: PaymentAlert[]
    overdue: PaymentAlert[]
    hasAlerts: boolean
  }
}

interface HistoryData {
  date: string
  dailyGeneration: number
}

interface HistoryMetrics {
  totalGeneration: number
  avgGeneration: number
  bestDay: {
    value: number
    date: string
  }
  co2Saved: number
}

const fetchDashboardData = async (): Promise<ClientDashboardData> => {
  const response = await fetch('/api/cliente/dashboard')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al cargar datos')
  }
  return result.data
}

export default function ClienteDashboardPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'7' | '14' | '30' | '90'>('30')
  const [historyData, setHistoryData] = useState<HistoryData[]>([])
  const [historyMetrics, setHistoryMetrics] = useState<HistoryMetrics | null>(null)
  const [expectedDaily, setExpectedDaily] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['cliente-dashboard'],
    queryFn: fetchDashboardData,
  })

  // Fetch history data
  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true)
      try {
        const response = await fetch(`/api/cliente/history?days=${period}`)
        const result = await response.json()

        if (result.success) {
          const expected = result.data.client.expectedDailyGeneration
          setExpectedDaily(expected)

          // Format data for chart
          const chartData = result.data.history.map((day: any) => ({
            date: new Date(day.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            dailyGeneration: day.dailyGeneration,
          }))

          setHistoryData(chartData)
          setHistoryMetrics(result.data.metrics)
        }
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [period])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.date}</p>
          <p className="text-sm text-green-600">
            Generado: <span className="font-bold">{data.dailyGeneration.toFixed(2)} kWh</span>
          </p>
          {expectedDaily > 0 && (
            <p className="text-sm text-gray-500">
              Esperado: <span className="font-bold">{expectedDaily.toFixed(2)} kWh</span>
            </p>
          )}
          {expectedDaily > 0 && (
            <p className={`text-xs mt-1 ${data.dailyGeneration >= expectedDaily ? 'text-green-600' : 'text-orange-600'}`}>
              {data.dailyGeneration >= expectedDaily ? '✓ Sobre objetivo' : '⚠ Bajo objetivo'}
              {' '}({((data.dailyGeneration / expectedDaily) * 100).toFixed(0)}%)
            </p>
          )}
        </div>
      )
    }
    return null
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
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Format total energy (convert to MWh if >= 1000 kWh)
  const formatTotalEnergy = (kwh: number) => {
    if (kwh >= 1000) {
      return `${(kwh / 1000).toLocaleString('es-MX', { maximumFractionDigits: 2 })} MWh`
    }
    return `${kwh.toLocaleString('es-MX', { maximumFractionDigits: 0 })} kWh`
  }

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
      value: formatTotalEnergy(data.stats.totalEnergyGenerated),
      icon: Sun,
      description: 'Desde instalación'
    },
    {
      title: 'CO₂ Ahorrado',
      value: `${data.stats.co2Saved.toLocaleString('es-MX', { maximumFractionDigits: 1 })} ton`,
      icon: Leaf,
      description: 'Total acumulado'
    },
    {
      title: 'Estado del Sistema',
      value: data.stats.systemStatus === 'online' ? 'En Línea' : 'Fuera de Línea',
      icon: data.stats.systemStatus === 'online' ? Sun : AlertTriangle,
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
    const config: Record<string, { label: string; className: string }> = {
      PENDING_APPROVAL: { label: 'Pendiente Aprobación', className: 'bg-amber-500 text-white hover:bg-amber-600' },
      SCHEDULED: { label: 'Programado', className: 'bg-emerald-500 text-white hover:bg-emerald-600' },
      IN_PROGRESS: { label: 'En Progreso', className: 'bg-violet-500 text-white hover:bg-violet-600' },
      COMPLETED: { label: 'Completado', className: 'bg-gray-500 text-white hover:bg-gray-600' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-500 text-white hover:bg-red-600' }
    }
    const statusConfig = config[status] || config.SCHEDULED
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
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

      {/* Payment Alerts */}
      {data.paymentAlerts?.hasAlerts && (
        <div className="space-y-3">
          {/* Overdue payments - Red alert */}
          {data.paymentAlerts.overdue.length > 0 && (
            <Card className="border-red-500 bg-red-50 dark:bg-red-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2 text-base">
                  <AlertCircle className="h-5 w-5" />
                  Pagos Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.paymentAlerts.overdue.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-300">
                            Cuota {payment.installmentNumber} de {payment.totalInstallments}
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Orden {payment.orderNumber} • Venció hace {payment.daysOverdue} día{payment.daysOverdue !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-700 dark:text-red-300">
                          ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {new Date(payment.dueDate).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming payments - Yellow/Orange alert */}
          {data.paymentAlerts.upcoming.length > 0 && (
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-700 dark:text-amber-300 flex items-center gap-2 text-base">
                  <Bell className="h-5 w-5" />
                  Pagos Próximos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.paymentAlerts.upcoming.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-amber-900 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="font-medium text-amber-700 dark:text-amber-300">
                            Cuota {payment.installmentNumber} de {payment.totalInstallments}
                          </p>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Orden {payment.orderNumber} • {payment.daysUntilDue === 0 ? 'Vence hoy' : `Vence en ${payment.daysUntilDue} día${payment.daysUntilDue !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700 dark:text-amber-300">
                          ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {new Date(payment.dueDate).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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

      {/* Generation History Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Historial de Generación</CardTitle>
              <CardDescription>Generación diaria de energía</CardDescription>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="7">7 días</TabsTrigger>
                <TabsTrigger value="14">14 días</TabsTrigger>
                <TabsTrigger value="30">30 días</TabsTrigger>
                <TabsTrigger value="90">90 días</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center h-80">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Metrics Cards */}
              {historyMetrics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Generado</CardTitle>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {historyMetrics.totalGeneration.toFixed(1)} kWh
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Últimos {period} días
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {historyMetrics.avgGeneration.toFixed(1)} kWh
                      </div>
                      {expectedDaily > 0 && (
                        <p className={`text-xs mt-1 ${historyMetrics.avgGeneration >= expectedDaily ? 'text-green-600' : 'text-orange-600'}`}>
                          {historyMetrics.avgGeneration >= expectedDaily ? '✓' : '⚠'} Esperado: {expectedDaily.toFixed(1)} kWh
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Mejor Día</CardTitle>
                      <Calendar className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {historyMetrics.bestDay.value.toFixed(1)} kWh
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(historyMetrics.bestDay.date).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">CO₂ Evitado</CardTitle>
                      <Leaf className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {historyMetrics.co2Saved.toFixed(1)} ton
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Acumulado total
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Chart */}
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart
                    data={historyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorGeneration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Expected line */}
                    {expectedDaily > 0 && (
                      <ReferenceLine
                        y={expectedDaily}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{ value: 'Esperado', position: 'right', fill: '#f59e0b', fontSize: 12 }}
                      />
                    )}

                    {/* Main area */}
                    <Area
                      type="monotone"
                      dataKey="dailyGeneration"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorGeneration)"
                      name="Generación Diaria (kWh)"
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-500">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay datos históricos disponibles</p>
                    <p className="text-sm mt-2">El historial se generará después de la sincronización</p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Mantenimientos Activos</CardTitle>
          <CardDescription>Mantenimientos pendientes, programados y en progreso</CardDescription>
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
                <div
                  key={maintenance.id}
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/cliente/mantenimientos?selected=${maintenance.id}`)}
                >
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
    </div>
  )
}
