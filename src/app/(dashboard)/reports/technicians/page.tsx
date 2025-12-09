'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Download, TrendingUp, TrendingDown, Award, Clock } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface TechnicianPerformance {
  technician: {
    id: string
    name: string
    email: string
    employeeId: string
  }
  metrics: {
    totalAssigned: number
    completed: number
    inProgress: number
    averageCompletionTime: number // in hours
    completionRate: number // percentage
    onTimeRate: number // percentage
    clientSatisfaction: number // 1-5 stars
  }
  recentMaintenances: Array<{
    id: string
    title: string
    status: string
    scheduledDate: string
    completedDate: string | null
    client: {
      firstName: string
      lastName: string
    }
  }>
}

export default function TechnicianReportsPage() {
  const [performances, setPerformances] = useState<TechnicianPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [sortBy, setSortBy] = useState('completionRate')

  useEffect(() => {
    loadPerformanceData()
  }, [dateRange])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)

      const startDate = dateRange === 'month'
        ? startOfMonth(new Date())
        : subDays(new Date(), parseInt(dateRange))

      const response = await fetch(
        `/api/reports/technician-performance?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`
      )
      const data = await response.json()

      if (data.success) {
        setPerformances(data.data)
      }
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSortedPerformances = () => {
    return [...performances].sort((a, b) => {
      switch (sortBy) {
        case 'completionRate':
          return b.metrics.completionRate - a.metrics.completionRate
        case 'totalCompleted':
          return b.metrics.completed - a.metrics.completed
        case 'averageTime':
          return a.metrics.averageCompletionTime - b.metrics.averageCompletionTime
        case 'onTimeRate':
          return b.metrics.onTimeRate - a.metrics.onTimeRate
        default:
          return 0
      }
    })
  }

  const exportToCSV = () => {
    const csv = [
      ['Técnico', 'Email', 'Asignados', 'Completados', 'Tasa Completado', 'Tasa a Tiempo', 'Tiempo Promedio (hrs)'].join(','),
      ...performances.map(p => [
        p.technician.name,
        p.technician.email,
        p.metrics.totalAssigned,
        p.metrics.completed,
        `${p.metrics.completionRate}%`,
        `${p.metrics.onTimeRate}%`,
        p.metrics.averageCompletionTime.toFixed(1)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `technician-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rendimiento de Técnicos</h1>
          <p className="text-muted-foreground">
            Métricas y estadísticas de desempeño por técnico
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Ordenar por</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completionRate">Tasa de Completado</SelectItem>
                  <SelectItem value="totalCompleted">Total Completados</SelectItem>
                  <SelectItem value="averageTime">Tiempo Promedio</SelectItem>
                  <SelectItem value="onTimeRate">Tasa a Tiempo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Cards */}
      <div className="grid gap-6">
        {getSortedPerformances().map((perf, index) => (
          <Card key={perf.technician.id} className={index === 0 ? 'border-yellow-500 border-2' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {index === 0 && <Award className="h-6 w-6 text-yellow-500" />}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {perf.technician.name}
                      {index === 0 && <Badge className="bg-yellow-500">Top Performer</Badge>}
                    </CardTitle>
                    <CardDescription>
                      {perf.technician.employeeId} • {perf.technician.email}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {perf.metrics.completionRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Tasa de Completado</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{perf.metrics.totalAssigned}</div>
                  <div className="text-xs text-muted-foreground">Asignados</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{perf.metrics.completed}</div>
                  <div className="text-xs text-muted-foreground">Completados</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{perf.metrics.inProgress}</div>
                  <div className="text-xs text-muted-foreground">En Progreso</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-purple-600">
                    <Clock className="h-5 w-5" />
                    {perf.metrics.averageCompletionTime.toFixed(1)}h
                  </div>
                  <div className="text-xs text-muted-foreground">Tiempo Promedio</div>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Entrega a Tiempo</p>
                    <p className="text-xs text-muted-foreground">
                      Mantenimientos completados en fecha
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {perf.metrics.onTimeRate >= 80 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-lg font-bold">{perf.metrics.onTimeRate.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Satisfacción Cliente</p>
                    <p className="text-xs text-muted-foreground">Calificación promedio</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.round(perf.metrics.clientSatisfaction) ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                    <span className="ml-2 text-lg font-bold">
                      {perf.metrics.clientSatisfaction.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Maintenances */}
              {perf.recentMaintenances.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Últimos Mantenimientos</p>
                  <div className="space-y-2">
                    {perf.recentMaintenances.slice(0, 3).map((maintenance) => (
                      <div key={maintenance.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium">{maintenance.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {maintenance.client.firstName} {maintenance.client.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              maintenance.status === 'COMPLETED'
                                ? 'default'
                                : maintenance.status === 'IN_PROGRESS'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {maintenance.status === 'COMPLETED'
                              ? 'Completado'
                              : maintenance.status === 'IN_PROGRESS'
                              ? 'En Progreso'
                              : 'Programado'}
                          </Badge>
                          {maintenance.completedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(maintenance.completedDate), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {performances.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay datos disponibles</h3>
            <p className="text-muted-foreground">
              No se encontraron datos de rendimiento para el período seleccionado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
