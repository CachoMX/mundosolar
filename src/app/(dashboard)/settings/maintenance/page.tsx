import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Database, Settings, Bell, HardDrive, Trash2, Download, RefreshCw, Activity, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function MaintenancePage() {
  const systemStatus = [
    { service: 'Base de Datos', status: 'online', lastCheck: '2 min ago', uptime: '99.9%' },
    { service: 'API Growatt', status: 'online', lastCheck: '5 min ago', uptime: '98.7%' },
    { service: 'WhatsApp Business', status: 'offline', lastCheck: '1 hora ago', uptime: '95.2%' },
    { service: 'PAC Facturación', status: 'online', lastCheck: '3 min ago', uptime: '99.1%' },
    { service: 'Servidor Web', status: 'online', lastCheck: '1 min ago', uptime: '99.8%' }
  ]

  const backupHistory = [
    { date: '2024-08-28', time: '02:00 AM', size: '2.3 GB', status: 'success', type: 'Automático' },
    { date: '2024-08-27', time: '02:00 AM', size: '2.2 GB', status: 'success', type: 'Automático' },
    { date: '2024-08-26', time: '02:00 AM', size: '2.1 GB', status: 'success', type: 'Automático' },
    { date: '2024-08-25', time: '03:15 PM', size: '2.1 GB', status: 'success', type: 'Manual' },
    { date: '2024-08-25', time: '02:00 AM', size: '2.0 GB', status: 'failed', type: 'Automático' }
  ]

  const systemLogs = [
    { time: '14:23:15', level: 'INFO', message: 'Usuario admin@mundosolar.com inició sesión', module: 'AUTH' },
    { time: '14:20:32', level: 'WARN', message: 'API Growatt respondió lentamente (>5s)', module: 'INTEGRATIONS' },
    { time: '14:15:08', level: 'INFO', message: 'Backup automático completado exitosamente', module: 'BACKUP' },
    { time: '14:10:45', level: 'ERROR', message: 'Fallo en conexión WhatsApp Business', module: 'INTEGRATIONS' },
    { time: '14:05:12', level: 'INFO', message: 'Nueva orden creada #ORD-2024-0892', module: 'ORDERS' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'offline': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
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
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
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
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Operativo</div>
            <p className="text-xs text-muted-foreground">
              4/5 servicios activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Backup</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hoy</div>
            <p className="text-xs text-muted-foreground">
              02:00 AM - 2.3 GB
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacio en Disco</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              156 GB de 200 GB usados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errores Hoy</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">3</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
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
              {systemStatus.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{service.service}</div>
                    <div className="text-xs text-muted-foreground">
                      Último check: {service.lastCheck} • Uptime: {service.uptime}
                    </div>
                  </div>
                  <Badge className={service.status === 'online' ? 'bg-green-500' : 'bg-red-500'}>
                    {service.status === 'online' ? 'En Línea' : 'Fuera de Línea'}
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

      <Card>
        <CardHeader>
          <CardTitle>Historial de Backups</CardTitle>
          <CardDescription>
            Últimos respaldos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupHistory.map((backup, index) => (
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
          <div className="space-y-2">
            {systemLogs.map((log, index) => (
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