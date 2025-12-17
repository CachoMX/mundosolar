'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Loader2,
  AlertCircle,
  MapPin,
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
    address: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    postalCode: string | null
  }
  solarSystem: {
    id: string
    systemName: string
    capacity: string
  } | null
  technicians: Array<{
    id: string
    role: string
    technician: {
      id: string
      name: string
      email: string
      image: string | null
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
    changedAt: string
    changedBy: {
      name: string
    }
  }>
}

interface Technician {
  id: string
  name: string
  email: string
}

// Fetch functions for React Query
const fetchMaintenance = async (id: string): Promise<MaintenanceDetail> => {
  const response = await fetch(`/api/maintenance/${id}`)
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Mantenimiento no encontrado')
  }
  return data.data
}

const fetchTechnicians = async (): Promise<Technician[]> => {
  const response = await fetch('/api/technicians')
  const data = await response.json()
  if (data.success) {
    return data.data
  }
  return []
}

export default function MaintenanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showEditModal, setShowEditModal] = useState(false)

  // React Query for maintenance detail
  const { data: maintenance, isLoading: loading, error } = useQuery({
    queryKey: ['maintenance', params.id],
    queryFn: () => fetchMaintenance(params.id as string),
    enabled: !!params.id,
  })

  // React Query for technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: fetchTechnicians,
  })

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approvalData, setApprovalData] = useState({
    scheduledDate: '',
    scheduledTime: '09:00',
    technicianId: '',
    notes: ''
  })

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Handle error - redirect if maintenance not found
  useEffect(() => {
    if (error) {
      alert('Mantenimiento no encontrado')
      router.push('/maintenance')
    }
  }, [error, router])

  // Invalidate all related caches
  const invalidateCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance', params.id] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-events'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
        invalidateCaches()
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
        // Invalidate caches before navigating
        queryClient.invalidateQueries({ queryKey: ['maintenance-metrics'] })
        queryClient.invalidateQueries({ queryKey: ['maintenance-events'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        router.push('/maintenance')
      } else {
        alert(data.error || 'Error al cancelar mantenimiento')
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error)
    }
  }

  const openApprovalModal = () => {
    // Pre-fill with preferred date if available
    const preferredDate = maintenance?.scheduledDate
      ? new Date(maintenance.scheduledDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    setApprovalData({
      scheduledDate: preferredDate,
      scheduledTime: '09:00',
      technicianId: '',
      notes: ''
    })
    setShowApprovalModal(true)
  }

  const handleApprove = async () => {
    if (!approvalData.scheduledDate) {
      alert('Por favor selecciona una fecha')
      return
    }

    setApproving(true)

    try {
      // Create date string with explicit timezone to avoid UTC conversion issues
      // We send the date as-is without timezone conversion so it displays correctly
      const scheduledDateTimeStr = `${approvalData.scheduledDate}T${approvalData.scheduledTime}:00.000Z`

      const response = await fetch(`/api/maintenance/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SCHEDULED',
          scheduledDate: scheduledDateTimeStr,
          technicianIds: approvalData.technicianId ? [approvalData.technicianId] : [],
          notes: approvalData.notes || 'Solicitud aprobada'
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowApprovalModal(false)
        invalidateCaches()
      } else {
        alert(data.error || 'Error al aprobar solicitud')
      }
    } catch (error) {
      console.error('Error approving maintenance:', error)
      alert('Error al aprobar solicitud')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Por favor ingresa un motivo para rechazar la solicitud')
      return
    }

    setRejecting(true)

    try {
      const response = await fetch(`/api/maintenance/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: `Solicitud rechazada: ${rejectReason}`
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowRejectModal(false)
        setRejectReason('')
        invalidateCaches()
      } else {
        alert(data.error || 'Error al rechazar solicitud')
      }
    } catch (error) {
      console.error('Error rejecting maintenance:', error)
      alert('Error al rechazar solicitud')
    } finally {
      setRejecting(false)
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      LEAD: 'Principal',
      Lead: 'Principal',
      ASSISTANT: 'Asistente',
      Assistant: 'Asistente',
    }
    return labels[role] || role
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

    // For PENDING_APPROVAL, show both approve and reject buttons
    if (maintenance.status === 'PENDING_APPROVAL') {
      return (
        <>
          <Button onClick={openApprovalModal} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Aprobar y Programar
          </Button>
          <Button variant="destructive" onClick={() => setShowRejectModal(true)}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Rechazar Solicitud
          </Button>
        </>
      )
    }

    const statusFlow: Record<string, { next: string; label: string; icon: any }> = {
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
          {/* Only show Edit and Cancel buttons when NOT in PENDING_APPROVAL status */}
          {maintenance.status !== 'PENDING_APPROVAL' && (
            <>
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
            </>
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
                {format(new Date(maintenance.scheduledDate), 'dd/MM/yyyy hh:mm a', {
                  locale: es,
                })}
              </span>
            </div>
            {maintenance.startedDate && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Iniciado:</span>
                <span>
                  {format(new Date(maintenance.startedDate), 'dd/MM/yyyy hh:mm a', {
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
                  {format(new Date(maintenance.completedDate), 'dd/MM/yyyy hh:mm a', {
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
          <CardContent className="space-y-4">
            {/* Client Name & Contact */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {maintenance.client.firstName} {maintenance.client.lastName}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-6">{maintenance.client.email}</div>
              {maintenance.client.phone && (
                <div className="text-sm text-muted-foreground pl-6">+52 {maintenance.client.phone}</div>
              )}
            </div>

            {/* Client Address */}
            {(maintenance.client.address || maintenance.client.city) && (
              <div className="space-y-1.5 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Ubicación del servicio</span>
                </div>
                <div className="text-sm text-muted-foreground pl-6 leading-relaxed">
                  {maintenance.client.address && <p>{maintenance.client.address}</p>}
                  {maintenance.client.neighborhood && <p>Col. {maintenance.client.neighborhood}</p>}
                  <p>
                    {[maintenance.client.city, maintenance.client.state].filter(Boolean).join(', ')}
                  </p>
                  {maintenance.client.postalCode && <p>C.P. {maintenance.client.postalCode}</p>}
                </div>
              </div>
            )}
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
          {!maintenance.technicians || maintenance.technicians.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay técnicos asignados</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {maintenance.technicians.map((tech) => (
                <div key={tech.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{tech.technician?.name || 'Sin nombre'}</p>
                    <p className="text-sm text-muted-foreground">{tech.technician?.email || ''}</p>
                    {tech.role && (
                      <Badge variant="outline" className="mt-1">
                        {getRoleLabel(tech.role)}
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
                      {format(new Date(history.changedAt), 'dd/MM/yyyy hh:mm a', { locale: es })}
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
          invalidateCaches()
          setShowEditModal(false)
        }}
        editData={maintenance}
      />

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aprobar Solicitud de Mantenimiento</DialogTitle>
            <DialogDescription>
              Programa la fecha y asigna un técnico para este mantenimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Request Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">{maintenance?.title}</h4>
              <p className="text-sm text-blue-700 mt-1">
                Cliente: {maintenance?.client.firstName} {maintenance?.client.lastName}
              </p>
              {maintenance?.description && (
                <p className="text-sm text-blue-600 mt-2">{maintenance.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Fecha *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={approvalData.scheduledDate}
                  onChange={(e) => setApprovalData({ ...approvalData, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Hora *</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={approvalData.scheduledTime}
                  onChange={(e) => setApprovalData({ ...approvalData, scheduledTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="technicianId">Técnico Asignado</Label>
              <Select
                value={approvalData.technicianId || "none"}
                onValueChange={(value) => setApprovalData({ ...approvalData, technicianId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un técnico (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar por ahora</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales para el técnico o el cliente..."
                value={approvalData.notes}
                onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
              disabled={approving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprobar y Programar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud de Mantenimiento</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la solicitud del cliente. Por favor ingresa un motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Request Info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900">{maintenance?.title}</h4>
              <p className="text-sm text-red-700 mt-1">
                Cliente: {maintenance?.client.firstName} {maintenance?.client.lastName}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejectReason">Motivo del rechazo *</Label>
              <Textarea
                id="rejectReason"
                placeholder="Explica por qué se rechaza esta solicitud..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
              }}
              disabled={rejecting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting}
              variant="destructive"
            >
              {rejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Rechazar Solicitud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
