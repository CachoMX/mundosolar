'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Wrench,
  Calendar,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

interface MaintenanceRecord {
  id: string
  clientId: string
  solarSystemId: string | null
  maintenanceType: string
  scheduledDate: string
  completedDate: string | null
  status: string
  description: string | null
  workPerformed: string | null
  cost: number | null
  laborHours: number | null
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  solarSystem: {
    id: string
    systemName: string
    capacity: number | null
  } | null
}

interface MaintenanceStats {
  scheduled: number
  urgent: number
  inProgress: number
  completedThisMonth: number
  total: number
}

interface ByTypePercentage {
  preventive: number
  corrective: number
  warranty: number
  inspection: number
  cleaning: number
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [stats, setStats] = useState<MaintenanceStats | null>(null)
  const [byTypePercentage, setByTypePercentage] = useState<ByTypePercentage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMaintenance()
  }, [])

  const fetchMaintenance = async () => {
    try {
      const response = await fetch('/api/maintenance')
      const result = await response.json()

      if (result.success) {
        setRecords(result.data.records)
        setStats(result.data.stats)
        setByTypePercentage(result.data.byTypePercentage)
      } else {
        setError(result.error || 'Error al cargar mantenimientos')
      }
    } catch (err) {
      console.error('Error fetching maintenance:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = records.filter(record => {
    const query = searchQuery.toLowerCase()
    const clientName = `${record.client.firstName} ${record.client.lastName}`.toLowerCase()
    return (
      clientName.includes(query) ||
      record.client.email.toLowerCase().includes(query) ||
      record.maintenanceType.toLowerCase().includes(query)
    )
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      'SCHEDULED': { label: 'Programado', variant: 'default', className: 'bg-blue-500' },
      'PENDING': { label: 'Pendiente', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      'IN_PROGRESS': { label: 'En Proceso', variant: 'default', className: 'bg-purple-500' },
      'COMPLETED': { label: 'Completado', variant: 'outline', className: 'text-green-600 border-green-600' },
      'CANCELLED': { label: 'Cancelado', variant: 'destructive' },
      'RESCHEDULED': { label: 'Reprogramado', variant: 'secondary' }
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' }
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
      'PREVENTIVE': { label: 'Preventivo', className: 'bg-green-100 text-green-800' },
      'CORRECTIVE': { label: 'Correctivo', className: 'bg-red-100 text-red-800' },
      'WARRANTY': { label: 'Garantía', className: 'bg-purple-100 text-purple-800' },
      'INSPECTION': { label: 'Inspección', className: 'bg-blue-100 text-blue-800' },
      'CLEANING': { label: 'Limpieza', className: 'bg-cyan-100 text-cyan-800' }
    }

    const config = typeConfig[type] || { label: type, className: '' }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando mantenimientos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar mantenimientos</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchMaintenance}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Mantenimiento</h2>
        <Link href="/maintenance/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Programar Mantenimiento
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.scheduled || 0}</div>
            <p className="text-xs text-muted-foreground">Próximos 30 días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.urgent || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats?.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Wrench className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.completedThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por cliente, email o tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Types Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Preventivo</span>
                <span className="text-muted-foreground">{byTypePercentage?.preventive || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Correctivo</span>
                <span className="text-muted-foreground">{byTypePercentage?.corrective || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Garantía</span>
                <span className="text-muted-foreground">{byTypePercentage?.warranty || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Inspección</span>
                <span className="text-muted-foreground">{byTypePercentage?.inspection || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Limpieza</span>
                <span className="text-muted-foreground">{byTypePercentage?.cleaning || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total de registros</span>
                <span className="text-2xl font-bold">{stats?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Activos</span>
                <span className="text-lg font-semibold text-blue-500">
                  {(stats?.scheduled || 0) + (stats?.inProgress || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Completados este mes</span>
                <span className="text-lg font-semibold text-green-500">{stats?.completedThisMonth || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Mantenimientos</CardTitle>
          <CardDescription>
            {filteredRecords.length} de {records.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No hay mantenimientos registrados</h3>
              <p className="mb-4">Comience programando el primer mantenimiento</p>
              <Link href="/maintenance/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Programar Mantenimiento
                </Button>
              </Link>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron registros</h3>
              <p>Intente con diferentes términos de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold">
                          {record.client.firstName} {record.client.lastName}
                        </span>
                        {getStatusBadge(record.status)}
                        {getTypeBadge(record.maintenanceType)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {record.solarSystem?.systemName || 'Sin sistema asignado'}
                        {record.description && ` - ${record.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {new Date(record.scheduledDate).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {record.cost && (
                      <p className="text-sm text-muted-foreground">
                        ${Number(record.cost).toLocaleString('es-MX')}
                      </p>
                    )}
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
