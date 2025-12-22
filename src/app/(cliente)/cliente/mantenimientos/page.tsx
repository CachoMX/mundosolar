'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Calendar as CalendarIcon,
  List,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wrench,
  Loader2,
  Plus,
  Trash2,
  MapPin,
  FileText,
  Cpu,
  Phone
} from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'es': es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface DashboardMetrics {
  scheduledToday: number
  scheduledThisWeek: number
  overdue: number
  completedThisMonth: number
  pendingApproval: number
  upcoming: any[]
  overdueList: any[]
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: any
}

interface SolarSystem {
  id: string
  name: string
  capacity: number | null
}

interface HourAvailability {
  hour: number
  hour12: string
  period: 'AM' | 'PM'
  displayTime: string
  isAvailable: boolean
  allBusy: boolean
}

interface MaintenanceData {
  metrics: DashboardMetrics
  events: CalendarEvent[]
}

const fetchMaintenanceData = async (): Promise<MaintenanceData> => {
  // Load dashboard metrics
  const metricsRes = await fetch('/api/cliente/mantenimientos/dashboard')
  const metricsData = await metricsRes.json()

  if (!metricsData.success) {
    throw new Error(metricsData.error || 'Error al cargar métricas')
  }

  // Load calendar events (30 days range)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 30)

  const eventsRes = await fetch(
    `/api/cliente/mantenimientos/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
  )
  const eventsData = await eventsRes.json()

  const formattedEvents = eventsData.success
    ? eventsData.data.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }))
    : []

  return {
    metrics: metricsData.data,
    events: formattedEvents
  }
}

export default function MantenimientosPage() {
  const searchParams = useSearchParams()
  const [view, setView] = useState<'calendar' | 'table'>('calendar')
  const [dismissedRejections, setDismissedRejections] = useState<string[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchMaintenanceData()
      setMetrics(data.metrics)
      setEvents(data.events)
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Modal state
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [requestMessage, setRequestMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [hourlyAvailability, setHourlyAvailability] = useState<HourAvailability[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [selectedRejectedEvent, setSelectedRejectedEvent] = useState<CalendarEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Appointment details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarEvent | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    solarSystemId: '', // Empty string means "General (all systems)"
    preferredDate: '',
    preferredHour: '09',
    preferredMinute: '00',
    preferredPeriod: 'AM' as 'AM' | 'PM'
  })

  // Helper function to refresh data
  const refreshData = () => {
    fetchData()
  }

  useEffect(() => {
    // Load dismissed rejections from localStorage
    const dismissed = localStorage.getItem('dismissedRejections')
    if (dismissed) {
      const dismissedIds = JSON.parse(dismissed)
      setDismissedRejections(dismissedIds)

      // Sync: mark notifications as read for previously dismissed items
      // This handles cases where localStorage has dismissals but notifications weren't marked as read
      if (dismissedIds.length > 0) {
        dismissedIds.forEach(async (id: string) => {
          try {
            await fetch('/api/cliente/notificaciones/marcar-leida', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ maintenanceId: id })
            })
          } catch (error) {
            // Silent fail for sync
          }
        })
        // Refresh sidebar counts after syncing
        window.dispatchEvent(new CustomEvent('refreshMaintenanceCounts'))
      }
    }
  }, [])

  // Sync cancelled notifications with visible calendar events
  // This ensures orphaned notifications (where maintenance was deleted) are also marked as read
  useEffect(() => {
    if (loading || events.length === 0) return

    const syncCancelledNotifications = async () => {
      // Get cancelled events that are visible (not dismissed)
      const visibleCancelledEvents = events.filter(
        event => event.resource?.status === 'CANCELLED' && !dismissedRejections.includes(event.id)
      )

      // If there are no visible cancelled events, mark ALL cancelled notifications as read
      // This handles orphaned notifications where the maintenance was deleted
      if (visibleCancelledEvents.length === 0) {
        try {
          await fetch('/api/cliente/notificaciones/marcar-leida', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAllCancelled: true })
          })
          // Refresh sidebar counts
          window.dispatchEvent(new CustomEvent('refreshMaintenanceCounts'))
        } catch (error) {
          // Silent fail
        }
      }
    }

    syncCancelledNotifications()
  }, [loading, events, dismissedRejections])

  // Handle selected maintenance from URL params
  useEffect(() => {
    const selectedId = searchParams.get('selected')
    if (selectedId && events.length > 0) {
      const selectedEvent = events.find(e => e.id === selectedId)
      if (selectedEvent && selectedEvent.resource?.status !== 'CANCELLED') {
        setSelectedAppointment(selectedEvent)
        setShowDetailsModal(true)
      }
    }
  }, [searchParams, events])

  const loadSolarSystems = async () => {
    try {
      const res = await fetch('/api/cliente/sistemas')
      const data = await res.json()
      if (data.success) {
        setSolarSystems(data.data)
      }
    } catch (error) {
      console.error('Error loading solar systems:', error)
    }
  }

  const loadAvailability = async (dateStr: string) => {
    if (!dateStr) {
      setHourlyAvailability([])
      return
    }
    try {
      setLoadingAvailability(true)
      // Use the client-specific availability endpoint
      const response = await fetch(`/api/cliente/mantenimientos/disponibilidad?date=${dateStr}`)
      const data = await response.json()
      if (data.success) {
        setHourlyAvailability(data.data.hourlyAvailability)
      }
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Get available hours for the selected period
  const getAvailableHoursForPeriod = (period: 'AM' | 'PM') => {
    if (hourlyAvailability.length === 0) {
      // Default hours if no availability data yet
      if (period === 'AM') {
        return ['07', '08', '09', '10', '11']
      } else {
        return ['12', '01', '02', '03', '04', '05', '06']
      }
    }

    return hourlyAvailability
      .filter(h => !h.allBusy && h.period === period)
      .map(h => h.hour12.padStart(2, '0'))
  }

  const handleOpenRequestModal = () => {
    loadSolarSystems()
    setFormData({
      type: '',
      title: '',
      description: '',
      solarSystemId: '',
      preferredDate: '',
      preferredHour: '09',
      preferredMinute: '00',
      preferredPeriod: 'AM'
    })
    setHourlyAvailability([])
    setRequestMessage(null)
    setShowRequestModal(true)
  }

  const handleEventClick = async (event: CalendarEvent) => {
    // Only handle clicks on own events
    if (event.resource?.isOwn === false) return

    const status = event.resource?.status

    // If it's a cancelled event, show the rejection modal
    if (status === 'CANCELLED') {
      setSelectedRejectedEvent(event)
      setShowRejectionModal(true)

      // Mark the notification as read so the red badge disappears
      try {
        await fetch('/api/cliente/notificaciones/marcar-leida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maintenanceId: event.id })
        })
        // Dispatch event to refresh sidebar counts
        window.dispatchEvent(new CustomEvent('refreshMaintenanceCounts'))
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }
    // If it's an approved/scheduled event, show details modal
    else if (status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'COMPLETED') {
      setSelectedAppointment(event)
      setShowDetailsModal(true)
    }
  }

  const handleDismissRejection = () => {
    if (selectedRejectedEvent) {
      // Add to dismissed list
      const newDismissed = [...dismissedRejections, selectedRejectedEvent.id]
      setDismissedRejections(newDismissed)
      // Save to localStorage
      localStorage.setItem('dismissedRejections', JSON.stringify(newDismissed))
    }
    setShowRejectionModal(false)
    setSelectedRejectedEvent(null)
  }

  const handleDeleteCancelledMaintenance = async () => {
    if (!selectedRejectedEvent) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/cliente/mantenimientos/${selectedRejectedEvent.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.success) {
        // Also dismiss it from local storage
        const newDismissed = [...dismissedRejections, selectedRejectedEvent.id]
        setDismissedRejections(newDismissed)
        localStorage.setItem('dismissedRejections', JSON.stringify(newDismissed))
        setShowRejectionModal(false)
        setSelectedRejectedEvent(null)
        refreshData()
      } else {
        alert(result.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting maintenance:', error)
      alert('Error al eliminar el mantenimiento')
    } finally {
      setDeleting(false)
    }
  }

  // Filter out dismissed cancelled events
  const filteredEvents = events.filter(event => {
    // Keep all non-cancelled events
    if (event.resource?.status !== 'CANCELLED') return true
    // Filter out dismissed cancelled events
    return !dismissedRejections.includes(event.id)
  })

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestMessage(null)

    if (!formData.type || !formData.title) {
      setRequestMessage({ type: 'error', text: 'El tipo y título son requeridos' })
      return
    }

    setSubmitting(true)

    try {
      // Convert 12h format to 24h format
      let hour24 = parseInt(formData.preferredHour)
      if (formData.preferredPeriod === 'PM' && hour24 !== 12) {
        hour24 += 12
      } else if (formData.preferredPeriod === 'AM' && hour24 === 12) {
        hour24 = 0
      }
      const timeString = `${hour24.toString().padStart(2, '0')}:${formData.preferredMinute}`

      // Combine date and time if date is provided
      // Don't add Z suffix - let the server interpret it as local time (same as admin form)
      let preferredDateTime = null
      if (formData.preferredDate) {
        preferredDateTime = `${formData.preferredDate}T${timeString}:00`
      }

      // Find the plant name for the selected system
      const solarSystemId = formData.solarSystemId || null
      const system = solarSystems.find(s => s.id === solarSystemId)
      const plantName = system?.name || null

      const res = await fetch('/api/cliente/mantenimientos/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          solarSystemId: solarSystemId,
          plantName: plantName,
          preferredDate: preferredDateTime
        })
      })

      const data = await res.json()

      if (data.success) {
        setRequestMessage({ type: 'success', text: 'Solicitud de mantenimiento enviada correctamente. Un administrador la revisará pronto.' })
        // Invalidate cache and close modal after successful request
        setTimeout(() => {
          setShowRequestModal(false)
          refreshData()
        }, 2000)
      } else {
        setRequestMessage({ type: 'error', text: data.error || 'Error al enviar solicitud' })
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      setRequestMessage({ type: 'error', text: 'Error al enviar solicitud' })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      PENDING_APPROVAL: { label: 'Pendiente Aprobación', className: 'bg-amber-500 text-white hover:bg-amber-600' },
      SCHEDULED: { label: 'Programado', className: 'bg-emerald-500 text-white hover:bg-emerald-600' },
      IN_PROGRESS: { label: 'En Progreso', className: 'bg-violet-500 text-white hover:bg-violet-600' },
      COMPLETED: { label: 'Completado', className: 'bg-gray-500 text-white hover:bg-gray-600' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-500 text-white hover:bg-red-600' },
      BUSY: { label: 'Día Ocupado', className: 'bg-gray-400 text-white hover:bg-gray-500' }
    }

    const statusConfig = config[status] || config.SCHEDULED
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      PREVENTIVE: 'Preventivo',
      CORRECTIVE: 'Correctivo',
      WARRANTY: 'Garantía',
      CLEANING: 'Limpieza'
    }
    return <Badge variant="outline">{labels[type] || type}</Badge>
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const colors: Record<string, string> = {
      PENDING_APPROVAL: '#f59e0b', // Orange - waiting for approval
      SCHEDULED: '#10b981',        // Green - approved and scheduled
      IN_PROGRESS: '#8b5cf6',      // Purple - in progress
      COMPLETED: '#6b7280',        // Gray - completed
      CANCELLED: '#ef4444',        // Red - cancelled/rejected
      BUSY: '#9ca3af'              // Light gray - other clients' appointments
    }

    const status = event.resource?.status || 'SCHEDULED'
    const isOwn = event.resource?.isOwn !== false

    return {
      style: {
        backgroundColor: colors[status] || '#3b82f6',
        borderRadius: '4px',
        opacity: isOwn ? 0.9 : 0.5,
        color: 'white',
        border: '0px',
        display: 'block',
        cursor: isOwn ? 'pointer' : 'default'
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mantenimientos</h1>
          <p className="text-muted-foreground">
            Historial y programación de mantenimientos de tu sistema
          </p>
        </div>
        <Button onClick={handleOpenRequestModal}>
          <Plus className="mr-2 h-4 w-4" />
          Solicitar Mantenimiento
        </Button>
      </div>

      {/* Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Solicitar Mantenimiento</DialogTitle>
            <DialogDescription>
              Envía una solicitud de mantenimiento. Un administrador la revisará y te contactará para programar la visita.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest}>
            <div className="space-y-4 py-4">
              {requestMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                  requestMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {requestMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{requestMessage.text}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Mantenimiento *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                    <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                    <SelectItem value="WARRANTY">Garantía</SelectItem>
                    <SelectItem value="CLEANING">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título / Motivo *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Revisión de paneles, Falla en inversor..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Sistema Solar (opcional)</Label>
                <Select
                  value={formData.solarSystemId}
                  onValueChange={(value) => setFormData({ ...formData, solarSystemId: value === 'general' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (todos los sistemas)</SelectItem>
                    {solarSystems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.name} {system.capacity ? `(${system.capacity} kW)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredDate">Fecha preferida (opcional)</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => {
                    setFormData({ ...formData, preferredDate: e.target.value })
                    loadAvailability(e.target.value)
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Hora preferida</Label>
                {loadingAvailability ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando disponibilidad...
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {/* Hour selector - filtered by availability */}
                      <Select
                        value={formData.preferredHour}
                        onValueChange={(value) => setFormData({ ...formData, preferredHour: value })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4}>
                          {(() => {
                            const availableHours = getAvailableHoursForPeriod(formData.preferredPeriod)

                            if (availableHours.length === 0) {
                              return (
                                <SelectItem value="" disabled>
                                  Sin horas
                                </SelectItem>
                              )
                            }

                            return availableHours.map((hour) => (
                              <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                            ))
                          })()}
                        </SelectContent>
                      </Select>

                      <span className="flex items-center text-lg">:</span>

                      {/* Minute selector (00, 05, 10, ..., 55) */}
                      <Select
                        value={formData.preferredMinute}
                        onValueChange={(value) => setFormData({ ...formData, preferredMinute: value })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4}>
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((minute) => (
                            <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* AM/PM selector - filtered by available hours */}
                      <Select
                        value={formData.preferredPeriod}
                        onValueChange={(value) => {
                          const newPeriod = value as 'AM' | 'PM'
                          const availableHours = getAvailableHoursForPeriod(newPeriod)
                          const newHour = availableHours.includes(formData.preferredHour)
                            ? formData.preferredHour
                            : availableHours[0] || '09'
                          setFormData({ ...formData, preferredPeriod: newPeriod, preferredHour: newHour })
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4}>
                          {(() => {
                            const hasAMAvailable = hourlyAvailability.some(h => h.period === 'AM' && !h.allBusy) || hourlyAvailability.length === 0
                            const hasPMAvailable = hourlyAvailability.some(h => h.period === 'PM' && !h.allBusy) || hourlyAvailability.length === 0

                            return (
                              <>
                                {hasAMAvailable && <SelectItem value="AM">AM</SelectItem>}
                                {hasPMAvailable && <SelectItem value="PM">PM</SelectItem>}
                              </>
                            )
                          })()}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Show availability info */}
                    {formData.preferredDate && hourlyAvailability.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const availableInAM = hourlyAvailability.filter(h => h.period === 'AM' && !h.allBusy).length
                          const availableInPM = hourlyAvailability.filter(h => h.period === 'PM' && !h.allBusy).length
                          const total = availableInAM + availableInPM

                          if (total === 0) {
                            return (
                              <span className="text-amber-600">
                                No hay horarios disponibles para esta fecha
                              </span>
                            )
                          }

                          return (
                            <span className="text-green-600">
                              {total} horario(s) disponible(s) para esta fecha
                            </span>
                          )
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción del problema (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el problema o los síntomas que has notado..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRequestModal(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitud'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.scheduledToday}</div>
              <p className="text-xs text-muted-foreground">
                Programados para hoy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.scheduledThisWeek}</div>
              <p className="text-xs text-muted-foreground">
                Próximos 7 días
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{metrics.overdue}</div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completedThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Wrench className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendingApproval}</div>
              <p className="text-xs text-muted-foreground">
                Esperando aprobación
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Alerts */}
      {metrics && metrics.overdue > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Mantenimientos Vencidos
            </CardTitle>
            <CardDescription className="text-red-600">
              Hay {metrics.overdue} mantenimientos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.overdueList.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">
                      {item.solarSystem?.systemName || 'General'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">
                      {format(new Date(item.scheduledDate), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    {getTypeBadge(item.type)}
                  </div>
                </div>
              ))}
              {metrics.overdueList.length > 3 && (
                <p className="text-sm text-center text-gray-600 pt-2">
                  +{metrics.overdueList.length - 3} más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar/Table View */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Calendario de Mantenimientos</CardTitle>
              <CardDescription>
                Vista de mantenimientos programados y en progreso
              </CardDescription>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'table')}>
              <TabsList>
                <TabsTrigger value="calendar">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Calendario
                </TabsTrigger>
                <TabsTrigger value="table">
                  <List className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'calendar' ? (
            <div className="h-[600px]">
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleEventClick}
                culture="es"
                messages={{
                  next: "Siguiente",
                  previous: "Anterior",
                  today: "Hoy",
                  month: "Mes",
                  week: "Semana",
                  day: "Día",
                  agenda: "Agenda",
                  date: "Fecha",
                  time: "Hora",
                  event: "Evento",
                  noEventsInRange: "No hay mantenimientos en este rango de fechas",
                  showMore: (total) => `+ Ver más (${total})`
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.filter(e => e.resource?.isOwn !== false).length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Sin mantenimientos programados</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No tienes mantenimientos programados en este período
                  </p>
                </div>
              ) : (
                filteredEvents
                  .filter(e => e.resource?.isOwn !== false)
                  .map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {event.resource.solarSystem?.systemName || 'General'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {getTypeBadge(event.resource.type)}
                        {getStatusBadge(event.resource.status)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(event.start, 'dd/MM/yyyy', { locale: es })}
                      </p>
                      {event.resource.technicians && event.resource.technicians.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {event.resource.technicians.map((t: any) => t.technician?.name || 'Sin nombre').join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Maintenance */}
      {metrics && metrics.upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Próximos Mantenimientos</CardTitle>
            <CardDescription>
              Mantenimientos programados en los próximos 14 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.upcoming.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    // Find the event in the events array to get full details
                    const event = events.find(e => e.id === item.id)
                    if (event) {
                      setSelectedAppointment(event)
                      setShowDetailsModal(true)
                    }
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">
                      {item.solarSystem?.systemName || 'General'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {getTypeBadge(item.type)}
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(item.scheduledDate), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    {item.technicians && item.technicians.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.technicians.map((t: any) => t.technician?.name || 'Sin nombre').join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason Modal */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Solicitud No Aprobada
            </DialogTitle>
            <DialogDescription>
              Tu solicitud de mantenimiento no fue aprobada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Request Info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900">{selectedRejectedEvent?.title}</h4>
              <p className="text-sm text-red-700 mt-1">
                Fecha solicitada: {selectedRejectedEvent && format(selectedRejectedEvent.start, 'dd/MM/yyyy', { locale: es })}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Motivo del rechazo:</Label>
              <div className="bg-gray-50 border rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  {selectedRejectedEvent?.resource?.rejectionReason || 'No se proporcionó un motivo específico.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Si tienes dudas sobre este rechazo, por favor contacta con nosotros para más información.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={handleDismissRejection}
              className="w-full"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Cita de Mantenimiento
            </DialogTitle>
            <DialogDescription>
              Detalles de tu cita de mantenimiento programada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Appointment Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900">{selectedAppointment?.title}</h4>
              <div className="flex gap-2 mt-2">
                {selectedAppointment?.resource?.type && getTypeBadge(selectedAppointment.resource.type)}
                {selectedAppointment?.resource?.status && getStatusBadge(selectedAppointment.resource.status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fecha programada</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment && format(selectedAppointment.start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hora</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment && format(selectedAppointment.start, 'HH:mm', { locale: es })} hrs
                  </p>
                </div>
              </div>

              {selectedAppointment?.resource?.technicians && selectedAppointment.resource.technicians.length > 0 && (
                <div className="flex items-start gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Técnico{selectedAppointment.resource.technicians.length > 1 ? 's' : ''} asignado{selectedAppointment.resource.technicians.length > 1 ? 's' : ''}</p>
                    <div className="space-y-2 mt-1">
                      {selectedAppointment.resource.technicians.map((t: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-md p-2">
                          <p className="text-sm text-muted-foreground font-medium">
                            {t.technician?.name || 'Sin nombre'}
                          </p>
                          {t.technician?.phone && (
                            <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${t.technician.phone}`} className="hover:underline">
                                {t.technician.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedAppointment?.resource?.solarSystem?.systemName && (
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Sistema</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.resource.solarSystem.systemName}
                    </p>
                  </div>
                </div>
              )}

              {/* Client Address */}
              {selectedAppointment?.resource?.clientAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Ubicación del servicio</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.resource.clientAddress}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedAppointment?.resource?.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Descripción</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedAppointment.resource.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Serial Numbers of Components */}
              {selectedAppointment?.resource?.components && selectedAppointment.resource.components.length > 0 && (
                <div className="flex items-start gap-3">
                  <Cpu className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Equipos del sistema</p>
                    <div className="mt-2 space-y-2">
                      {selectedAppointment.resource.components
                        .filter((c: any) => c.serialNumber)
                        .map((component: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-md p-2 text-sm">
                            <p className="font-medium text-gray-700">
                              {component.productName}
                              {component.productBrand && ` - ${component.productBrand}`}
                              {component.productModel && ` ${component.productModel}`}
                            </p>
                            <p className="text-xs text-blue-600 font-mono mt-1">
                              S/N: {component.serialNumber}
                            </p>
                          </div>
                        ))}
                      {selectedAppointment.resource.components.filter((c: any) => c.serialNumber).length === 0 && (
                        <p className="text-sm text-muted-foreground">Sin números de serie registrados</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowDetailsModal(false)}
              className="w-full"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
