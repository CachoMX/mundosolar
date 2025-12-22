'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
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
  Phone,
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
    technicianId: string
    technician: {
      id: string
      name: string
      email: string
      phone: string | null
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

export default function MaintenanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approvalData, setApprovalData] = useState({
    scheduledDate: '',
    scheduledHour: '09',
    scheduledMinute: '00',
    scheduledPeriod: 'AM' as 'AM' | 'PM',
    technicianIds: [] as string[],
    notes: '',
    privateNotes: '',
    rescheduleReason: ''
  })
  // Track original requested date/time for comparison
  const [originalRequestedDateTime, setOriginalRequestedDateTime] = useState<{
    date: string
    hour: string
    minute: string
    period: 'AM' | 'PM'
  } | null>(null)

  // Availability state for approval modal
  interface HourAvailability {
    hour: number
    displayTime: string
    isAvailable: boolean
    availableTechnicians: Array<{
      technicianId: string
      technicianName: string
      isAvailable: boolean
    }>
    allBusy: boolean
  }
  const [hourlyAvailability, setHourlyAvailability] = useState<HourAvailability[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch maintenance detail
      const maintenanceResponse = await fetch(`/api/maintenance/${params.id}`)
      const maintenanceResult = await maintenanceResponse.json()
      if (!maintenanceResult.success) {
        throw new Error(maintenanceResult.error || 'Mantenimiento no encontrado')
      }
      setMaintenance(maintenanceResult.data)

      // Fetch technicians
      const techResponse = await fetch('/api/technicians')
      const techResult = await techResponse.json()
      if (techResult.success) {
        setTechnicians(techResult.data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (params.id) {
      fetchData()
    }
  }, [params.id, fetchData])

  // Fetch technician availability for a given date
  const fetchAvailability = useCallback(async (date: string) => {
    if (!date) return

    setLoadingAvailability(true)
    try {
      const response = await fetch(`/api/maintenance/availability?date=${date}&excludeMaintenanceId=${params.id}`)
      const result = await response.json()
      if (result.success) {
        setHourlyAvailability(result.data.hourlyAvailability || [])
      }
    } catch (err) {
      console.error('Error fetching availability:', err)
    } finally {
      setLoadingAvailability(false)
    }
  }, [params.id])

  // Fetch availability when date changes in approval modal
  useEffect(() => {
    if (showApprovalModal && approvalData.scheduledDate) {
      fetchAvailability(approvalData.scheduledDate)
    }
  }, [showApprovalModal, approvalData.scheduledDate, fetchAvailability])

  // Clear selected technicians if they become unavailable when changing hour
  useEffect(() => {
    if (hourlyAvailability.length === 0 || approvalData.technicianIds.length === 0) return

    // Calculate 24h hour from the selected time
    let hour24 = parseInt(approvalData.scheduledHour, 10)
    if (approvalData.scheduledPeriod === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (approvalData.scheduledPeriod === 'AM' && hour24 === 12) {
      hour24 = 0
    }

    // Find availability for this hour
    const hourAvail = hourlyAvailability.find((h) => h.hour === hour24)
    if (!hourAvail) return

    // Get available technician IDs
    const availableTechIds = hourAvail.availableTechnicians
      .filter((t) => t.isAvailable)
      .map((t) => t.technicianId)

    // Filter out selected technicians that are no longer available
    const validTechIds = approvalData.technicianIds.filter((id) =>
      availableTechIds.includes(id)
    )

    if (validTechIds.length !== approvalData.technicianIds.length) {
      setApprovalData((prev) => ({
        ...prev,
        technicianIds: validTechIds
      }))
    }
  }, [hourlyAvailability, approvalData.scheduledHour, approvalData.scheduledPeriod, approvalData.technicianIds])

  // Handle error - redirect if maintenance not found
  useEffect(() => {
    if (error) {
      alert('Mantenimiento no encontrado')
      router.push('/maintenance')
    }
  }, [error, router])

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
        fetchData()
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

  const openApprovalModal = () => {
    // Pre-fill with preferred date and time if available
    let preferredDate = new Date().toISOString().split('T')[0]
    let preferredHour = '09'
    let preferredMinute = '00'
    let preferredPeriod: 'AM' | 'PM' = 'AM'

    if (maintenance?.scheduledDate) {
      const scheduledDateObj = new Date(maintenance.scheduledDate)
      preferredDate = scheduledDateObj.toISOString().split('T')[0]

      // Extract hour, minute, and period from the client's proposed time
      const hour24 = scheduledDateObj.getHours()
      const minutes = scheduledDateObj.getMinutes()

      // Convert to 12h format
      let hour12 = hour24 % 12
      if (hour12 === 0) hour12 = 12
      preferredPeriod = hour24 < 12 ? 'AM' : 'PM'
      preferredHour = String(hour12).padStart(2, '0')
      preferredMinute = String(minutes).padStart(2, '0')

      // Store original requested date/time for comparison
      setOriginalRequestedDateTime({
        date: preferredDate,
        hour: preferredHour,
        minute: preferredMinute,
        period: preferredPeriod
      })
    } else {
      setOriginalRequestedDateTime(null)
    }

    setApprovalData({
      scheduledDate: preferredDate,
      scheduledHour: preferredHour,
      scheduledMinute: preferredMinute,
      scheduledPeriod: preferredPeriod,
      technicianIds: [],
      notes: '',
      privateNotes: '',
      rescheduleReason: ''
    })
    setHourlyAvailability([])
    setShowApprovalModal(true)
  }

  // Check if the scheduled time differs from the original request
  const isTimeChanged = () => {
    if (!originalRequestedDateTime) return false
    return (
      approvalData.scheduledDate !== originalRequestedDateTime.date ||
      approvalData.scheduledHour !== originalRequestedDateTime.hour ||
      approvalData.scheduledMinute !== originalRequestedDateTime.minute ||
      approvalData.scheduledPeriod !== originalRequestedDateTime.period
    )
  }

  const handleApprove = async () => {
    if (!approvalData.scheduledDate) {
      alert('Por favor selecciona una fecha')
      return
    }

    // Require reason if time was changed
    const timeChanged = isTimeChanged()
    if (timeChanged && !approvalData.rescheduleReason.trim()) {
      alert('Por favor ingresa el motivo del cambio de horario')
      return
    }

    setApproving(true)

    try {
      // Convert 12h format to 24h format
      let hour24 = parseInt(approvalData.scheduledHour, 10)
      if (approvalData.scheduledPeriod === 'PM' && hour24 !== 12) {
        hour24 += 12
      } else if (approvalData.scheduledPeriod === 'AM' && hour24 === 12) {
        hour24 = 0
      }
      const hour24Str = String(hour24).padStart(2, '0')
      const scheduledDateTimeStr = `${approvalData.scheduledDate}T${hour24Str}:${approvalData.scheduledMinute}:00`

      const response = await fetch(`/api/maintenance/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SCHEDULED',
          scheduledDate: scheduledDateTimeStr,
          technicianIds: approvalData.technicianIds,
          notes: approvalData.notes || 'Solicitud aprobada',
          privateNotes: approvalData.privateNotes || undefined,
          rescheduleReason: timeChanged ? approvalData.rescheduleReason : undefined
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowApprovalModal(false)
        fetchData()
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
        fetchData()
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
                    {tech.technician?.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" />
                        <span>{tech.technician.phone}</span>
                      </div>
                    )}
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
          fetchData()
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">{maintenance?.title}</h4>
              <p className="text-sm text-blue-700 mt-1">
                Cliente: {maintenance?.client.firstName} {maintenance?.client.lastName}
              </p>
              {maintenance?.description && (
                <p className="text-sm text-blue-600 mt-2">{maintenance.description}</p>
              )}
            </div>

            <div className="space-y-4">
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
                <Label>Hora *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={approvalData.scheduledHour}
                    onValueChange={(value) => setApprovalData({ ...approvalData, scheduledHour: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {(approvalData.scheduledPeriod === 'AM'
                        ? ['07', '08', '09', '10', '11']
                        : ['12', '01', '02', '03', '04', '05', '06']
                      ).map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={approvalData.scheduledMinute}
                    onValueChange={(value) => setApprovalData({ ...approvalData, scheduledMinute: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={approvalData.scheduledPeriod}
                    onValueChange={(value) => {
                      const newPeriod = value as 'AM' | 'PM'
                      const amHours = ['07', '08', '09', '10', '11']
                      const pmHours = ['12', '01', '02', '03', '04', '05', '06']
                      const validHours = newPeriod === 'AM' ? amHours : pmHours
                      // Reset hour if current hour is not valid for new period
                      const newHour = validHours.includes(approvalData.scheduledHour)
                        ? approvalData.scheduledHour
                        : validHours[0]
                      setApprovalData({ ...approvalData, scheduledPeriod: newPeriod, scheduledHour: newHour })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {loadingAvailability && (
                  <p className="text-xs text-muted-foreground">Cargando disponibilidad...</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Técnicos Disponibles</Label>
              {(() => {
                // Calculate 24h hour from the selected time
                let hour24 = parseInt(approvalData.scheduledHour, 10)
                if (approvalData.scheduledPeriod === 'PM' && hour24 !== 12) {
                  hour24 += 12
                } else if (approvalData.scheduledPeriod === 'AM' && hour24 === 12) {
                  hour24 = 0
                }

                // Find availability for this hour
                const hourAvail = hourlyAvailability.find((h) => h.hour === hour24)

                // Get available technicians based on availability data
                const availableTechIds = hourAvail
                  ? hourAvail.availableTechnicians
                      .filter((t) => t.isAvailable)
                      .map((t) => t.technicianId)
                  : technicians.map((t) => t.id) // If no availability data yet, show all

                // Filter technicians to only show available ones
                const availableTechnicians = technicians.filter((t) =>
                  availableTechIds.includes(t.id)
                )

                if (technicians.length === 0) {
                  return (
                    <div className="text-center py-4 text-muted-foreground border rounded-lg">
                      <p className="text-sm">No hay técnicos registrados.</p>
                    </div>
                  )
                }

                if (availableTechnicians.length === 0 && hourlyAvailability.length > 0) {
                  return (
                    <div className="text-center py-4 text-amber-600 border border-amber-200 bg-amber-50 rounded-lg">
                      <p className="text-sm font-medium">No hay técnicos disponibles a esta hora</p>
                      <p className="text-xs mt-1">Por favor selecciona otra hora o fecha</p>
                    </div>
                  )
                }

                return (
                  <>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {availableTechnicians.map((tech) => (
                        <div key={tech.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`approval-tech-${tech.id}`}
                            checked={approvalData.technicianIds.includes(tech.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setApprovalData({
                                  ...approvalData,
                                  technicianIds: [...approvalData.technicianIds, tech.id]
                                })
                              } else {
                                setApprovalData({
                                  ...approvalData,
                                  technicianIds: approvalData.technicianIds.filter(id => id !== tech.id)
                                })
                              }
                            }}
                          />
                          <label
                            htmlFor={`approval-tech-${tech.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {tech.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    {availableTechnicians.length < technicians.length && hourlyAvailability.length > 0 && (
                      <p className="text-xs text-amber-600">
                        {technicians.length - availableTechnicians.length} técnico(s) no disponible(s) a esta hora
                      </p>
                    )}
                  </>
                )
              })()}
              {approvalData.technicianIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {approvalData.technicianIds.length} técnico(s) seleccionado(s)
                </p>
              )}
            </div>

            {/* Show reschedule reason field when time is changed */}
            {isTimeChanged() && (
              <div className="space-y-2 border border-amber-300 bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Cambio de horario detectado</span>
                </div>
                <div className="text-xs text-amber-600 mb-2">
                  <p>Solicitado: {originalRequestedDateTime?.date} a las {originalRequestedDateTime?.hour}:{originalRequestedDateTime?.minute} {originalRequestedDateTime?.period}</p>
                  <p>Programado: {approvalData.scheduledDate} a las {approvalData.scheduledHour}:{approvalData.scheduledMinute} {approvalData.scheduledPeriod}</p>
                </div>
                <Label htmlFor="rescheduleReason" className="text-amber-800">Motivo del cambio de horario *</Label>
                <Textarea
                  id="rescheduleReason"
                  placeholder="Explica al cliente por qué se cambió el horario solicitado..."
                  value={approvalData.rescheduleReason}
                  onChange={(e) => setApprovalData({ ...approvalData, rescheduleReason: e.target.value })}
                  rows={2}
                  className="border-amber-300 focus:border-amber-500"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notas para el cliente (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Notas visibles para el cliente..."
                value={approvalData.notes}
                onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privateNotes">Notas privadas (opcional)</Label>
              <Textarea
                id="privateNotes"
                placeholder="Notas solo visibles para administradores y técnicos..."
                value={approvalData.privateNotes}
                onChange={(e) => setApprovalData({ ...approvalData, privateNotes: e.target.value })}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Estas notas no serán visibles para el cliente
              </p>
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
