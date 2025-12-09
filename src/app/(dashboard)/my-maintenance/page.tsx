'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Wrench, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MaintenanceRequest {
  id: string
  title: string
  description: string
  type: string
  priority: string
  status: string
  requestedDate: string
  scheduledDate: string | null
  solarSystem: {
    systemName: string
  } | null
}

export default function MyMaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [solarSystems, setSolarSystems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [formData, setFormData] = useState({
    solarSystemId: '',
    type: 'CORRECTIVE',
    priority: 'SCHEDULED',
    title: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load my maintenance requests
      const maintenanceRes = await fetch('/api/maintenance?clientId=me')
      const maintenanceData = await maintenanceRes.json()

      if (maintenanceData.success) {
        setRequests(maintenanceData.data)
      }

      // Load my solar systems
      const systemsRes = await fetch('/api/admin/solar-systems?clientId=me')
      const systemsData = await systemsRes.json()

      if (systemsData.success) {
        setSolarSystems(systemsData.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          solarSystemId: formData.solarSystemId || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowRequestModal(false)
        setFormData({
          solarSystemId: '',
          type: 'CORRECTIVE',
          priority: 'SCHEDULED',
          title: '',
          description: '',
        })
        loadData()
      } else {
        alert(data.error || 'Error al crear solicitud')
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Error al crear solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      PENDING_APPROVAL: { label: 'Pendiente Aprobación', variant: 'outline' },
      SCHEDULED: { label: 'Programado', variant: 'default' },
      IN_PROGRESS: { label: 'En Progreso', variant: 'secondary' },
      COMPLETED: { label: 'Completado', variant: 'default' },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' },
    }

    const config = variants[status] || variants.PENDING_APPROVAL
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      PREVENTIVE: 'Preventivo',
      CORRECTIVE: 'Correctivo',
      WARRANTY: 'Garantía',
      CLEANING: 'Limpieza',
    }
    return <Badge variant="outline">{labels[type] || type}</Badge>
  }

  const getPendingCount = () => {
    return requests.filter((r) => r.status === 'PENDING_APPROVAL').length
  }

  const getScheduledCount = () => {
    return requests.filter((r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Mantenimientos</h1>
          <p className="text-muted-foreground">
            Solicita y visualiza el estado de tus mantenimientos
          </p>
        </div>
        <Button onClick={() => setShowRequestModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Solicitar Mantenimiento
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPendingCount()}</div>
            <p className="text-xs text-muted-foreground">Esperando aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programados</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getScheduledCount()}</div>
            <p className="text-xs text-muted-foreground">En agenda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Wrench className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">Solicitudes totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
          <CardDescription>Todas tus solicitudes de mantenimiento</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">No hay solicitudes</h3>
              <p className="text-muted-foreground mt-2">
                Solicita un mantenimiento para comenzar
              </p>
              <Button className="mt-4" onClick={() => setShowRequestModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Mantenimiento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-gray-600">
                      {request.solarSystem?.systemName || 'General'}
                    </p>
                    {request.description && (
                      <p className="text-sm text-gray-500 mt-1">{request.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {getTypeBadge(request.type)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    {request.scheduledDate ? (
                      <>
                        <p className="text-sm font-medium">Programado</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(request.scheduledDate), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Solicitado</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(request.requestedDate), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Mantenimiento</DialogTitle>
            <DialogDescription>
              Completa el formulario y nuestro equipo revisará tu solicitud
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Solar System */}
            {solarSystems.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="solarSystemId">Sistema Solar (Opcional)</Label>
                <Select
                  value={formData.solarSystemId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, solarSystemId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="General (todos los sistemas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General (todos los sistemas)</SelectItem>
                    {solarSystems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.systemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                    <SelectItem value="WARRANTY">Garantía</SelectItem>
                    <SelectItem value="CLEANING">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Urgencia *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Normal</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Asunto *</Label>
              <Input
                id="title"
                placeholder="Ej: Panel solar no funciona"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción del Problema *</Label>
              <Textarea
                id="description"
                placeholder="Describe el problema en detalle..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRequestModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
