'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Zap, Sun, TrendingUp, Activity, Loader2, Leaf, RefreshCw, LineChart, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

interface PlantData {
  name: string
  todayEnergy: number
  totalEnergy: number
  status: string
}

interface SystemData {
  status: string
  currentPower: number
  dailyGeneration: number
  monthlyGeneration: number
  totalGeneration: number
  co2Saved?: number
  plantCount?: number
  plants?: PlantData[]
  lastUpdate: string | null
  error?: string
}

interface HistoryData {
  date: string
  dailyGeneration: number
  expected?: number
}

interface Metrics {
  totalGeneration: number
  avgGeneration: number
  bestDay: {
    value: number
    date: string
  }
  co2Saved: number
}

const fetchSystemData = async (): Promise<SystemData> => {
  const response = await fetch('/api/cliente/sistema')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al cargar datos del sistema')
  }
  return result.data
}

export default function SistemaPage() {
  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyPeriod, setHistoryPeriod] = useState<'7' | '14' | '30' | '90'>('30')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyData, setHistoryData] = useState<HistoryData[]>([])
  const [historyMetrics, setHistoryMetrics] = useState<Metrics | null>(null)
  const [expectedDaily, setExpectedDaily] = useState(0)

  const {
    data: systemData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['cliente-sistema'],
    queryFn: fetchSystemData,
  })

  useEffect(() => {
    if (historyModalOpen) {
      loadHistory()
    }
  }, [historyModalOpen, historyPeriod])

  const handleRefresh = () => {
    refetch()
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/cliente/sistema/history?days=${historyPeriod}`)
      const result = await response.json()

      if (result.success) {
        const expected = result.data.client.expectedDailyGeneration
        setExpectedDaily(expected)

        // Format data for chart
        const chartData = result.data.history.map((day: any) => ({
          date: new Date(day.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          dailyGeneration: day.dailyGeneration,
          expected: expected || undefined,
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
              {data.dailyGeneration >= expectedDaily ? 'Sobre objetivo' : 'Bajo objetivo'}
              {' '}({((data.dailyGeneration / expectedDaily) * 100).toFixed(0)}%)
            </p>
          )}
        </div>
      )
    }
    return null
  }

  // Format total energy (convert to MWh if > 1000 kWh)
  const formatTotalEnergy = (kwh: number) => {
    if (kwh >= 1000) {
      return `${(kwh / 1000).toFixed(2)} MWh`
    }
    return `${kwh.toFixed(2)} kWh`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">En línea</Badge>
      case 'offline':
        return <Badge variant="secondary">Sin conexión</Badge>
      case 'warning':
        return <Badge className="bg-yellow-500">Advertencia</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistemas Solares</h1>
          <p className="text-muted-foreground">Monitoreo de tu sistema de energía solar</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistemas Solares</h1>
          <p className="text-muted-foreground">Monitoreo de tu sistema de energía solar</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(true)}>
            <LineChart className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {systemData && getStatusBadge(systemData.status)}
        </div>
      </div>

      {systemData?.error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-800">{systemData.error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potencia Actual</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemData?.currentPower?.toFixed(2) || '0.00'} kW
            </div>
            <p className="text-xs text-muted-foreground">
              Generación en tiempo real
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energía Hoy</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {systemData?.dailyGeneration?.toFixed(1) || '0.0'} kWh
            </div>
            <p className="text-xs text-muted-foreground">
              Generación del día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energía Total</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatTotalEnergy(systemData?.totalGeneration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Generación histórica
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO2 Evitado</CardTitle>
            <Leaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemData?.co2Saved?.toFixed(1) || '0.0'} ton
            </div>
            <p className="text-xs text-muted-foreground">
              Impacto ambiental
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plants list */}
      {systemData?.plants && systemData.plants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plantas ({systemData.plantCount || systemData.plants.length})</CardTitle>
            <CardDescription>Detalle por planta de tu sistema solar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemData.plants.map((plant, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${plant.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">{plant.name}</p>
                      <p className="text-xs text-muted-foreground">Capacidad: N/A</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Hoy: {plant.todayEnergy?.toFixed(1) || '0.0'} kWh</p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatTotalEnergy(plant.totalEnergy || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
          <CardDescription>Información detallada de tu instalación solar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Estado de conexión</span>
              <span className="font-medium">
                {systemData?.status === 'online' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Número de plantas</span>
              <span className="font-medium">
                {systemData?.plantCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Última actualización</span>
              <span className="font-medium">
                {systemData?.lastUpdate
                  ? new Date(systemData.lastUpdate).toLocaleString('es-MX')
                  : 'Sin datos'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Historial de Generación</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Period Tabs */}
            <Tabs value={historyPeriod} onValueChange={(v) => setHistoryPeriod(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="7">7 días</TabsTrigger>
                <TabsTrigger value="14">14 días</TabsTrigger>
                <TabsTrigger value="30">30 días</TabsTrigger>
                <TabsTrigger value="90">90 días</TabsTrigger>
              </TabsList>
            </Tabs>

            {historyLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Metrics Cards */}
                {historyMetrics && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Generado</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {historyMetrics.totalGeneration.toFixed(1)} kWh
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Últimos {historyPeriod} días
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
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

                    <Card>
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

                    <Card>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Generación Diaria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {historyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
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
                          <Legend />

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
                      <div className="flex items-center justify-center h-96 text-gray-500">
                        <div className="text-center">
                          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No hay datos históricos disponibles</p>
                          <p className="text-sm mt-2">El historial se generará después del primer cron job</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
