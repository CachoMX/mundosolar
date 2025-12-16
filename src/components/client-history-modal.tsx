'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, Calendar, Zap, Leaf } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

interface ClientHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
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

export function ClientHistoryModal({ open, onOpenChange, clientId, clientName }: ClientHistoryModalProps) {
  const [period, setPeriod] = useState<'7' | '14' | '30' | '90'>('7')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<HistoryData[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [expectedDaily, setExpectedDaily] = useState(0)

  // Reset to 7 days when modal opens
  useEffect(() => {
    if (open) {
      setPeriod('7')
    }
  }, [open])

  useEffect(() => {
    if (open && clientId) {
      fetchHistory()
    }
  }, [open, period, clientId])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/history?days=${period}`)
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

        setData(chartData)
        setMetrics(result.data.metrics)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
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
              {data.dailyGeneration >= expectedDaily ? '✓ Sobre objetivo' : '⚠ Bajo objetivo'}
              {' '}({((data.dailyGeneration / expectedDaily) * 100).toFixed(0)}%)
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Historial de Generación - {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Tabs */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="7">7 días</TabsTrigger>
              <TabsTrigger value="14">14 días</TabsTrigger>
              <TabsTrigger value="30">30 días</TabsTrigger>
              <TabsTrigger value="90">90 días</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Metrics Cards */}
              {metrics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Generado</CardTitle>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {metrics.totalGeneration.toFixed(1)} kWh
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Últimos {period} días
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
                        {metrics.avgGeneration.toFixed(1)} kWh
                      </div>
                      {expectedDaily > 0 && (
                        <p className={`text-xs mt-1 ${metrics.avgGeneration >= expectedDaily ? 'text-green-600' : 'text-orange-600'}`}>
                          {metrics.avgGeneration >= expectedDaily ? '✓' : '⚠'} Esperado: {expectedDaily.toFixed(1)} kWh
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
                        {metrics.bestDay.value.toFixed(1)} kWh
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(metrics.bestDay.date).toLocaleDateString('es-MX', {
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
                        {metrics.co2Saved.toFixed(1)} ton
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
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart
                        data={data}
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
  )
}
