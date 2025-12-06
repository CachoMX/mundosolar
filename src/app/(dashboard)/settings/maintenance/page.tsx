'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Database, Settings, Bell, HardDrive, Trash2, Download, RefreshCw, Activity, AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface SystemService {
  service: string
  status: string
  lastCheck: string
  uptime: string
  details: string
}

interface BackupRecord {
  date: string
  time: string
  size: string
  status: string
  type: string
}

interface SystemLog {
  time: string
  level: string
  message: string
  module: string
}

interface MaintenanceData {
  stats: {
    generalStatus: string
    activeServices: number
    totalServices: number
    lastBackup: BackupRecord
    diskUsage: {
      used: number
      total: number
      percentage: number
    }
    errorsToday: number
  }
  systemStatus: SystemService[]
  backupHistory: BackupRecord[]
  systemLogs: SystemLog[]
  databaseStats: {
    clients: number
    orders: number
    products: number
    invoices: number
    maintenance: number
    solarSystems: number
    users: number
    total: number
  }
}

export default function MaintenancePage() {
  const [data, setData] = useState<MaintenanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchMaintenanceData()
  }, [])

  const fetchMaintenanceData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const response = await fetch('/api/settings/maintenance')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Error al cargar información del sistema')
      }
    } catch (err) {
      console.error('Error fetching maintenance data:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatLastCheck = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} ago`
    return date.toLocaleDateString('es-MX')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-500'
      case 'WARN': return 'text-yellow-500'
      case 'INFO': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando información del sistema...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar información</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchMaintenanceData()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Mantenimiento del Sistema</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => fetchMaintenanceData(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar Estado
          </Button>
          <Button>
            <Database className="mr-2 h-4 w-4" />
            Backup Manual
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado General</CardTitle>
            <Activity className={`h-4 w-4 ${data?.stats.generalStatus === 'Operativo' ? 'text-green-500' : 'text-yellow-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data?.stats.generalStatus === 'Operativo' ? 'text-green-500' : 'text-yellow-500'}`}>
              {data?.stats.generalStatus}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.stats.activeServices}/{data?.stats.totalServices} servicios activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Backup</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.stats.lastBackup.date === new Date().toISOString().split('T')[0] ? 'Hoy' : data?.stats.lastBackup.date}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.stats.lastBackup.time} - {data?.stats.lastBackup.size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacio en Disco</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.diskUsage.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {data?.stats.diskUsage.used} GB de {data?.stats.diskUsage.total} GB usados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errores Hoy</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(data?.stats.errorsToday || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(data?.stats.errorsToday || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {data?.stats.errorsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(data?.stats.errorsToday || 0) > 0 ? 'Requieren atención' : 'Sin errores'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Servicios</CardTitle>
            <CardDescription>Monitoreo en tiempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.systemStatus.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{service.service}</div>
                    <div className="text-xs text-muted-foreground">
                      Último check: {formatLastCheck(service.lastCheck)} • Uptime: {service.uptime}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{service.details}</div>
                  </div>
                  <Badge className={service.status === 'online' ? 'bg-green-500' : service.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}>
                    {service.status === 'online' ? 'En Línea' : service.status === 'pending' ? 'Pendiente' : 'Fuera de Línea'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Herramientas de Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                Ejecutar Backup Manual
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar Cache del Sistema
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reiniciar Servicios
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Optimizar Base de Datos
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Descargar Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Base de Datos</CardTitle>
          <CardDescription>Registros almacenados por módulo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.clients || 0}</div>
              <div className="text-xs text-muted-foreground">Clientes</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.orders || 0}</div>
              <div className="text-xs text-muted-foreground">Órdenes</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.products || 0}</div>
              <div className="text-xs text-muted-foreground">Productos</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.invoices || 0}</div>
              <div className="text-xs text-muted-foreground">Facturas</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.maintenance || 0}</div>
              <div className="text-xs text-muted-foreground">Mantenimientos</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.solarSystems || 0}</div>
              <div className="text-xs text-muted-foreground">Sistemas Solares</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{data?.databaseStats.users || 0}</div>
              <div className="text-xs text-muted-foreground">Usuarios</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Backups</CardTitle>
          <CardDescription>
            Últimos respaldos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.backupHistory.map((backup, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{backup.date} - {backup.time}</div>
                  <div className="text-sm text-muted-foreground">
                    Tamaño: {backup.size} • Tipo: {backup.type}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusBadge(backup.status)}>
                    {backup.status === 'success' ? 'Exitoso' : 'Fallido'}
                  </Badge>
                  {backup.status === 'success' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs del Sistema</CardTitle>
          <CardDescription>
            Actividad reciente del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.systemLogs && data.systemLogs.length > 0 ? (
            <div className="space-y-2">
              {data.systemLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 text-sm">
                  <span className="text-muted-foreground font-mono">{log.time}</span>
                  <Badge variant="outline" className={`text-xs ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </Badge>
                  <span className="flex-1">{log.message}</span>
                  <Badge variant="outline" className="text-xs">
                    {log.module}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No hay actividad reciente registrada
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Button variant="outline">
              <Bell className="mr-2 h-4 w-4" />
              Ver Todos los Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
