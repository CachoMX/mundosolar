'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  User,
  Wrench,
  Package,
  Clock,
  CheckCircle2,
  Edit,
  Trash2,
} from 'lucide-react'
import { MaintenanceFormModal } from '@/components/maintenance-form-modal'

interface MaintenanceDetail {
  id: string
  title: string
  description: string
  privateNotes: string
  type: string
  priority: string
  status: string
  scheduledDate: string
  startedDate: string | null
  completedDate: string | null
  requestedDate: string
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  solarSystem: {
    id: string
    systemName: string
    capacity: string
  } | null
  technicians: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  parts: Array<{
    id: string
    quantity: number
    unitCost: number
    product: {
      id: string
      name: string
      brand: string
    }
  }>
  statusHistory: Array<{
    id: string
    status: string
    notes: string
    createdAt: string
    changedBy: {
      name: string
    }
  }>
}

export default function MaintenanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadMaintenance()
    }
  }, [params.id])

  const loadMaintenance = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/maintenance/${params.id}`)
      const data = await response.json()

      if (data.success) {
        setMaintenance(data.data)
      } else {
        alert('Mantenimiento no encontrado')
        router.push('/maintenance')
      }
    } catch (error) {
      console.error('Error loading maintenance:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    if (!confirm(`¿Cambiar estado a ${getStatusLabel(newStatus)}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/maintenance/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (data.success) {
        loadMaintenance()
      } else {
        alert(data.error || 'Error al actualizar estado')
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const deleteMaintenance = async () => {
    if (!confirm('¿Estás seguro de cancelar este mantenimiento?')) {
      return
    }

    try {
      const response = await fetch(`/api/maintenance/${params.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        router.push('/maintenance')
      } else {
        alert(data.error || 'Error al cancelar mantenimiento')
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING_APPROVAL: 'Pendiente Aprobación',
      SCHEDULED: 'Programado',
      IN_PROGRESS: 'En Progreso',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado',
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PREVENTIVE: 'Preventivo',
      CORRECTIVE: 'Correctivo',
      WARRANTY: 'Garantía',
      CLEANING: 'Limpieza',
    }
    return labels[type] || type
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      SCHEDULED: 'Programado',
      URGENT: 'Urgente',
    }
    return labels[priority] || priority
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      PENDING_APPROVAL: { variant: 'outline' },
      SCHEDULED: { variant: 'default' },
      IN_PROGRESS: { variant: 'secondary' },
      COMPLETED: { variant: 'default' },
      CANCELLED: { variant: 'destructive' },
    }

    const config = variants[status] || variants.SCHEDULED
    return (
      <Badge variant={config.variant}>{getStatusLabel(status)}</Badge>
    )
  }

  const getNextStatusAction = () => {
    if (!maintenance) return null

    const statusFlow: Record<string, { next: string; label: string; icon: any }> = {
      PENDING_APPROVAL: {
        next: 'SCHEDULED',
        label: 'Aprobar y Programar',
        icon: Calendar,
      },
      SCHEDULED: {
        next: 'IN_PROGRESS',
        label: 'Iniciar Mantenimiento',
        icon: Wrench,
      },
      IN_PROGRESS: {
        next: 'COMPLETED',
        label: 'Marcar como Completado',
        icon: CheckCircle2,
      },
    }

    const action = statusFlow[maintenance.status]
    if (!action) return null

    const Icon = action.icon

    return (
      <Button onClick={() => updateStatus(action.next)}>
        <Icon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    )
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

  if (!maintenance) {
    return null
  }

  const totalPartsCost = maintenance.parts.reduce(
    (sum, part) => sum + part.quantity * Number(part.unitCost),
    0
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/maintenance')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{maintenance.title}</h1>
            <p className="text-muted-foreground">
              {maintenance.client.firstName} {maintenance.client.lastName}
              {maintenance.solarSystem && ` - ${maintenance.solarSystem.systemName}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {getNextStatusAction()}
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          {maintenance.status !== 'CANCELLED' && (
            <Button variant="destructive" onClick={deleteMaintenance}>
              <Trash2 className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Status and Details */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(maintenance.status)}
              <div className="text-sm text-muted-foreground">
                <Badge variant="outline">{getTypeLabel(maintenance.type)}</Badge>
                {' · '}
                <Badge
                  variant={maintenance.priority === 'URGENT' ? 'destructive' : 'outline'}
                >
                  {getPriorityLabel(maintenance.priority)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fechas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Programado:</span>
              <span>
                {format(new Date(maintenance.scheduledDate), 'dd/MM/yyyy HH:mm', {
                  locale: es,
                })}
              </span>
            </div>
            {maintenance.startedDate && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Iniciado:</span>
                <span>
                  {format(new Date(maintenance.startedDate), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </span>
              </div>
            )}
            {maintenance.completedDate && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium">Completado:</span>
                <span>
                  {format(new Date(maintenance.completedDate), 'dd/MM/yyyy HH:mm', {
                    locale: es,
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {maintenance.client.firstName} {maintenance.client.lastName}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{maintenance.client.email}</div>
            <div className="text-sm text-muted-foreground">{maintenance.client.phone}</div>
          </CardContent>
        </Card>
      </div>

      {/* Description and Notes */}
      <div className="grid gap-6 md:grid-cols-2">
        {maintenance.description && (
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
              <CardDescription>Visible para el cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{maintenance.description}</p>
            </CardContent>
          </Card>
        )}

        {maintenance.privateNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas Privadas</CardTitle>
              <CardDescription>Solo visible para administradores y técnicos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{maintenance.privateNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Technicians */}
      <Card>
        <CardHeader>
          <CardTitle>Técnicos Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenance.technicians.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay técnicos asignados</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {maintenance.technicians.map((tech) => (
                <div key={tech.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{tech.user.name}</p>
                    <p className="text-sm text-muted-foreground">{tech.user.email}</p>
                    {tech.role && (
                      <Badge variant="outline" className="mt-1">
                        {tech.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parts Used */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Refacciones Utilizadas</CardTitle>
              <CardDescription>Total: ${totalPartsCost.toFixed(2)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {maintenance.parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se han registrado refacciones</p>
          ) : (
            <div className="space-y-2">
              {maintenance.parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{part.product.name}</p>
                      <p className="text-sm text-muted-foreground">{part.product.brand}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {part.quantity} x ${Number(part.unitCost).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${(part.quantity * Number(part.unitCost)).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {maintenance.statusHistory.map((history, index) => (
              <div key={history.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  {index < maintenance.statusHistory.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(history.status)}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(history.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Por {history.changedBy.name}
                  </p>
                  {history.notes && (
                    <p className="text-sm mt-2 bg-gray-50 p-2 rounded">{history.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <MaintenanceFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          loadMaintenance()
          setShowEditModal(false)
        }}
        editData={maintenance}
      />
    </div>
  )
}
