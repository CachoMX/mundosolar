'use client'

import { useEffect, useState } from 'react'
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
  Plus
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

export default function MantenimientosPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<'calendar' | 'table'>('calendar')
  const [loading, setLoading] = useState(true)
  const [dismissedRejections, setDismissedRejections] = useState<string[]>([])

  // Modal state
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [requestMessage, setRequestMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [selectedRejectedEvent, setSelectedRejectedEvent] = useState<CalendarEvent | null>(null)

  // Appointment details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarEvent | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    solarSystemId: '',
    preferredDate: ''
  })

  useEffect(() => {
    // Load dismissed rejections from localStorage
    const dismissed = localStorage.getItem('dismissedRejections')
    if (dismissed) {
      setDismissedRejections(JSON.parse(dismissed))
    }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load dashboard metrics
      const metricsRes = await fetch('/api/cliente/mantenimientos/dashboard')
      const metricsData = await metricsRes.json()

      if (metricsData.success) {
        setMetrics(metricsData.data)
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

      if (eventsData.success) {
        const formattedEvents = eventsData.data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }))
        setEvents(formattedEvents)
      }
    } catch (error) {
      console.error('Error loading maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleOpenRequestModal = () => {
    loadSolarSystems()
    setFormData({
      type: '',
      title: '',
      description: '',
      solarSystemId: '',
      preferredDate: ''
    })
    setRequestMessage(null)
    setShowRequestModal(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    // Only handle clicks on own events
    if (event.resource?.isOwn === false) return

    const status = event.resource?.status

    // If it's a cancelled event, show the rejection modal
    if (status === 'CANCELLED') {
      setSelectedRejectedEvent(event)
      setShowRejectionModal(true)
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
      const res = await fetch('/api/cliente/mantenimientos/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          solarSystemId: formData.solarSystemId || null,
          preferredDate: formData.preferredDate || null
        })
      })

      const data = await res.json()

      if (data.success) {
        setRequestMessage({ type: 'success', text: data.message })
        // Reload data after successful request
        setTimeout(() => {
          setShowRequestModal(false)
          loadData()
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
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING_APPROVAL: { label: 'Pendiente Aprobación', variant: 'outline' },
      SCHEDULED: { label: 'Programado', variant: 'default' },
      IN_PROGRESS: { label: 'En Progreso', variant: 'secondary' },
      COMPLETED: { label: 'Completado', variant: 'default' },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' },
      BUSY: { label: 'Día Ocupado', variant: 'secondary' }
    }

    const config = variants[status] || variants.SCHEDULED
    return <Badge variant={config.variant}>{config.label}</Badge>
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
                <Label htmlFor="solarSystem">Sistema Solar (opcional)</Label>
                <Select
                  value={formData.solarSystemId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, solarSystemId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General (todos los sistemas)</SelectItem>
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
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
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
                          {event.resource.technicians.map((t: any) => t.user.name).join(', ')}
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
                <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
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
                        {item.technicians.map((t: any) => t.user.name).join(', ')}
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

              {selectedAppointment?.resource?.technician && selectedAppointment.resource.technician !== 'Sin asignar' && (
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Técnico asignado</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.resource.technician}
                    </p>
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
