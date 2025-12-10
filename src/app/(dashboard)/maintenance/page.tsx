'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wrench
} from 'lucide-react'
import { MaintenanceFormModal } from '@/components/maintenance-form-modal'
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

export default function MaintenancePage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<'calendar' | 'table'>('calendar')
  const [loading, setLoading] = useState(true)
  const [showFormModal, setShowFormModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load dashboard metrics
      const metricsRes = await fetch('/api/maintenance/dashboard')
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
        `/api/maintenance/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      )
      const eventsData = await eventsRes.json()

      if (eventsData.success) {
        const formattedEvents = eventsData.data.map((event: any) => {
          // Parse dates and adjust for timezone to show correct day
          const startDate = new Date(event.start)
          const endDate = new Date(event.end)

          return {
            ...event,
            start: startDate,
            end: endDate
          }
        })
        setEvents(formattedEvents)
      }
    } catch (error) {
      console.error('Error loading maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING_APPROVAL: { label: 'Pendiente Aprobación', variant: 'outline' },
      SCHEDULED: { label: 'Programado', variant: 'default' },
      IN_PROGRESS: { label: 'En Progreso', variant: 'secondary' },
      COMPLETED: { label: 'Completado', variant: 'default' },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' }
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
      PENDING_APPROVAL: '#f59e0b',
      SCHEDULED: '#3b82f6',
      IN_PROGRESS: '#8b5cf6',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444'
    }

    const status = event.resource?.status || 'SCHEDULED'

    return {
      style: {
        backgroundColor: colors[status] || '#3b82f6',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando mantenimientos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mantenimientos</h1>
          <p className="text-muted-foreground">
            Gestiona y programa mantenimientos para sistemas solares
          </p>
        </div>
        <Button onClick={() => setShowFormModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Mantenimiento
        </Button>
      </div>

      {/* Form Modal */}
      <MaintenanceFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={loadData}
      />

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
              Hay {metrics.overdue} mantenimientos que requieren atención inmediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.overdueList.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">
                      {item.client?.firstName} {item.client?.lastName} - {item.solarSystem?.systemName || 'General'}
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
                Vista general de mantenimientos programados y en progreso
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
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => router.push(`/maintenance/${event.id}`)}
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
              {events.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay mantenimientos programados
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/maintenance/${event.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {event.resource.client?.firstName} {event.resource.client?.lastName}
                        {event.resource.solarSystem && ` - ${event.resource.solarSystem.systemName}`}
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
                <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">
                      {item.client?.firstName} {item.client?.lastName}
                      {item.solarSystem && ` - ${item.solarSystem.systemName}`}
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
    </div>
  )
}