'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon, Loader2, Check, ChevronsUpDown, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface TechnicianAvailabilityInfo {
  technicianId: string
  technicianName: string
  isAvailable: boolean
  conflictingMaintenance?: {
    id: string
    title: string
    scheduledDate: string
  }
}

interface HourAvailability {
  hour: number
  hour12: string
  period: 'AM' | 'PM'
  displayTime: string
  isAvailable: boolean
  availableTechnicians: TechnicianAvailabilityInfo[]
  allBusy: boolean
}

const maintenanceSchema = z.object({
  clientId: z.string().min(1, 'Cliente es requerido'),
  solarSystemId: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'WARRANTY', 'CLEANING']),
  priority: z.enum(['SCHEDULED', 'URGENT']),
  scheduledDate: z.date({
    required_error: 'Fecha programada es requerida',
  }),
  scheduledHour: z.string().min(1, 'Hora es requerida'),
  scheduledMinute: z.string().min(1, 'Minuto es requerido'),
  scheduledPeriod: z.enum(['AM', 'PM']),
  title: z.string().min(3, 'Título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  privateNotes: z.string().optional(),
  technicianIds: z.array(z.string()).min(1, 'Al menos un técnico es requerido'),
})

type MaintenanceFormData = z.infer<typeof maintenanceSchema>

interface MaintenanceFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: any
}

interface Client {
  id: string
  firstName: string
  lastName: string
  solarSystems?: SolarSystem[]
}

interface SolarSystem {
  id: string
  systemName: string
  capacity: string
}

interface Technician {
  id: string
  name: string
  email: string
  employeeId: string
}

export function MaintenanceFormModal({
  open,
  onClose,
  onSuccess,
  editData,
}: MaintenanceFormModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [clientOpen, setClientOpen] = useState(false)
  const [hourlyAvailability, setHourlyAvailability] = useState<HourAvailability[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [rescheduleReason, setRescheduleReason] = useState('')
  // Track original date/time for detecting changes when editing scheduled maintenance
  const [originalScheduledDateTime, setOriginalScheduledDateTime] = useState<{
    date: string
    hour: string
    minute: string
    period: 'AM' | 'PM'
    status: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      type: 'PREVENTIVE',
      priority: 'SCHEDULED',
      scheduledHour: '09',
      scheduledMinute: '00',
      scheduledPeriod: 'AM',
      technicianIds: [],
    },
  })

  const selectedClientId = watch('clientId')
  const scheduledDate = watch('scheduledDate')
  const selectedTechnicianIds = watch('technicianIds') || []

  // Load initial data
  useEffect(() => {
    if (open) {
      loadInitialData()
    }
  }, [open])

  // Load solar systems when client changes
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId)
      setSolarSystems(client?.solarSystems || [])
      setValue('solarSystemId', '')
    } else {
      setSolarSystems([])
    }
  }, [selectedClientId, clients])

  // Load technician availability when date changes
  useEffect(() => {
    if (scheduledDate) {
      loadAvailability(scheduledDate)
    } else {
      setHourlyAvailability([])
    }
  }, [scheduledDate])

  // Clear selected technicians that are no longer available when hour/period changes
  const scheduledHour = watch('scheduledHour')
  const scheduledPeriod = watch('scheduledPeriod')

  useEffect(() => {
    if (hourlyAvailability.length === 0) return

    // Convert current hour to 24h format
    let hour24 = parseInt(scheduledHour)
    if (scheduledPeriod === 'PM' && hour24 !== 12) hour24 += 12
    if (scheduledPeriod === 'AM' && hour24 === 12) hour24 = 0

    const availability = hourlyAvailability.find(h => h.hour === hour24)
    if (!availability) return

    // Filter out technicians that are no longer available
    const currentTechIds = selectedTechnicianIds || []
    const stillAvailableTechIds = currentTechIds.filter(techId => {
      const techAvailability = availability.availableTechnicians.find(t => t.technicianId === techId)
      return !techAvailability || techAvailability.isAvailable
    })

    // Only update if some technicians were removed
    if (stillAvailableTechIds.length !== currentTechIds.length) {
      setValue('technicianIds', stillAvailableTechIds)
    }
  }, [scheduledHour, scheduledPeriod, hourlyAvailability])

  const loadAvailability = async (date: Date) => {
    try {
      setLoadingAvailability(true)
      const dateStr = format(date, 'yyyy-MM-dd')
      // Exclude current maintenance if editing
      const excludeParam = editData?.id ? `&excludeMaintenanceId=${editData.id}` : ''
      const response = await fetch(`/api/maintenance/availability?date=${dateStr}${excludeParam}`)
      const data = await response.json()

      // Debug: log availability response
      console.log('Availability API response:', {
        date: dateStr,
        maintenanceCount: data.data?.maintenanceCount,
        debug: data.data?.debug,
        hourlyAvailability: data.data?.hourlyAvailability?.map((h: HourAvailability) => ({
          hour: h.hour,
          displayTime: h.displayTime,
          allBusy: h.allBusy,
          availableTechnicians: h.availableTechnicians?.map(t => ({
            name: t.technicianName,
            isAvailable: t.isAvailable,
            conflictingMaintenance: t.conflictingMaintenance?.title
          }))
        }))
      })

      if (data.success) {
        setHourlyAvailability(data.data.hourlyAvailability)
      }
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  // Get available hours for the selected period (filter out hours where all technicians are busy)
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

  // Get availability info for current selected time
  const getCurrentTimeAvailability = () => {
    const hour = watch('scheduledHour')
    const period = watch('scheduledPeriod')

    if (!hour || !period || hourlyAvailability.length === 0) return null

    // Convert 12h to 24h for matching
    let hour24 = parseInt(hour)
    if (period === 'PM' && hour24 !== 12) hour24 += 12
    if (period === 'AM' && hour24 === 12) hour24 = 0

    return hourlyAvailability.find(h => h.hour === hour24)
  }

  // Check if editing a scheduled maintenance and date/time has changed
  const isEditingScheduledAndDateChanged = () => {
    if (!originalScheduledDateTime) return false
    // Only require reason for already scheduled or in-progress maintenances
    if (originalScheduledDateTime.status !== 'SCHEDULED' && originalScheduledDateTime.status !== 'IN_PROGRESS') {
      return false
    }

    const currentDate = scheduledDate
    if (!currentDate) return false

    const currentHour = watch('scheduledHour')
    const currentMinute = watch('scheduledMinute')
    const currentPeriod = watch('scheduledPeriod')

    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`

    return (
      formattedDate !== originalScheduledDateTime.date ||
      currentHour !== originalScheduledDateTime.hour ||
      currentMinute !== originalScheduledDateTime.minute ||
      currentPeriod !== originalScheduledDateTime.period
    )
  }

  // Load edit data
  useEffect(() => {
    if (editData && open) {
      setValue('clientId', editData.clientId)
      setValue('solarSystemId', editData.solarSystemId || '')
      setValue('type', editData.type)
      setValue('priority', editData.priority)
      const editDate = new Date(editData.scheduledDate)
      setValue('scheduledDate', editDate)
      // Extract time from the scheduled date and convert to 12h format
      let hours = editDate.getHours()
      const minutes = String(editDate.getMinutes()).padStart(2, '0')
      const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM'
      if (hours > 12) hours -= 12
      if (hours === 0) hours = 12
      const hourStr = String(hours).padStart(2, '0')
      setValue('scheduledHour', hourStr)
      setValue('scheduledMinute', minutes)
      setValue('scheduledPeriod', period)
      setValue('title', editData.title)
      setValue('description', editData.description || '')
      setValue('privateNotes', editData.privateNotes || '')

      // Get all technician IDs
      const techIds = editData.technicians?.map((t: any) => t.technicianId) || []
      setValue('technicianIds', techIds)

      // Store original date/time for scheduled maintenances
      const year = editDate.getFullYear()
      const month = String(editDate.getMonth() + 1).padStart(2, '0')
      const day = String(editDate.getDate()).padStart(2, '0')
      setOriginalScheduledDateTime({
        date: `${year}-${month}-${day}`,
        hour: hourStr,
        minute: minutes,
        period: period,
        status: editData.status
      })
      setRescheduleReason('')
    } else if (!editData && open) {
      // Reset when creating new
      setOriginalScheduledDateTime(null)
      setRescheduleReason('')
    }
  }, [editData, open])

  const loadInitialData = async () => {
    try {
      setLoadingData(true)

      // Load clients (solar systems are now included in the response)
      const clientsRes = await fetch('/api/clients')
      const clientsData = await clientsRes.json()

      if (clientsData.success) {
        setClients(clientsData.data)
      }

      // Load technicians
      const techRes = await fetch('/api/technicians')
      const techData = await techRes.json()

      if (techData.success) {
        setTechnicians(techData.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: MaintenanceFormData) => {
    // Validate reschedule reason if editing a scheduled maintenance with date change
    const dateChanged = isEditingScheduledAndDateChanged()
    if (dateChanged && !rescheduleReason.trim()) {
      alert('Por favor ingresa el motivo del cambio de horario')
      return
    }

    try {
      setLoading(true)

      // Convert 12h format to 24h format
      let hour24 = parseInt(data.scheduledHour)
      if (data.scheduledPeriod === 'PM' && hour24 !== 12) {
        hour24 += 12
      } else if (data.scheduledPeriod === 'AM' && hour24 === 12) {
        hour24 = 0
      }
      const timeString = `${hour24.toString().padStart(2, '0')}:${data.scheduledMinute}`

      // Format date with selected time (without Z to use local time)
      const year = data.scheduledDate.getFullYear()
      const month = String(data.scheduledDate.getMonth() + 1).padStart(2, '0')
      const day = String(data.scheduledDate.getDate()).padStart(2, '0')
      const scheduledDateStr = `${year}-${month}-${day}T${timeString}:00`

      const payload: any = {
        clientId: data.clientId,
        solarSystemId: data.solarSystemId || null,
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        privateNotes: data.privateNotes,
        scheduledDate: scheduledDateStr,
        technicianIds: data.technicianIds,
      }

      // Include reschedule reason if date changed on a scheduled maintenance
      if (dateChanged) {
        payload.rescheduleReason = rescheduleReason
      }

      // Debug: log payload being sent
      console.log('Creating/updating maintenance with payload:', {
        ...payload,
        scheduledDateParsed: new Date(scheduledDateStr).toISOString(),
        hour24Selected: hour24,
      })

      const url = editData
        ? `/api/maintenance/${editData.id}`
        : '/api/maintenance'

      const method = editData ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        reset()
        onSuccess()
        onClose()
      } else {
        alert(result.error || 'Error al guardar mantenimiento')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error al guardar mantenimiento')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setSolarSystems([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
          </DialogTitle>
          <DialogDescription>
            {editData
              ? 'Actualiza los detalles del mantenimiento'
              : 'Programa un nuevo mantenimiento para un sistema solar'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Selection - Searchable */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente *</Label>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedClientId
                      ? (() => {
                          const client = clients.find(c => c.id === selectedClientId)
                          return client ? `${client.firstName} ${client.lastName}` : 'Selecciona un cliente'
                        })()
                      : 'Selecciona un cliente'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.firstName} ${client.lastName}`}
                            onSelect={() => {
                              setValue('clientId', client.id)
                              setClientOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client.firstName} {client.lastName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.clientId && (
                <p className="text-sm text-red-500">{errors.clientId.message}</p>
              )}
            </div>

            {/* Solar System Selection */}
            {solarSystems.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="solarSystemId">Sistema Solar (Opcional)</Label>
                <Select
                  value={watch('solarSystemId')}
                  onValueChange={(value) => setValue('solarSystemId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="General (todos los sistemas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General (todos los sistemas)</SelectItem>
                    {solarSystems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.systemName} - {system.capacity}kW
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
                  value={watch('type')}
                  onValueChange={(value: any) => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                    <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                    <SelectItem value="WARRANTY">Garantía</SelectItem>
                    <SelectItem value="CLEANING">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad *</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value: any) => setValue('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Programado</SelectItem>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-red-500">{errors.priority.message}</p>
                )}
              </div>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label>Fecha Programada *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, 'PPP', { locale: es })
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => date && setValue('scheduledDate', date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {errors.scheduledDate && (
                <p className="text-sm text-red-500">{errors.scheduledDate.message}</p>
              )}
            </div>

            {/* Scheduled Time - 12h format like client page */}
            <div className="space-y-2">
              <Label>Hora Programada *</Label>
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
                      value={watch('scheduledHour')}
                      onValueChange={(value) => setValue('scheduledHour', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {(() => {
                          const period = watch('scheduledPeriod')
                          const availableHours = getAvailableHoursForPeriod(period)

                          if (availableHours.length === 0) {
                            return (
                              <SelectItem value="" disabled>
                                Sin horas disponibles
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
                      value={watch('scheduledMinute')}
                      onValueChange={(value) => setValue('scheduledMinute', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((minute) => (
                          <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* AM/PM selector - filtered by available hours */}
                    <Select
                      value={watch('scheduledPeriod')}
                      onValueChange={(value) => {
                        const newPeriod = value as 'AM' | 'PM'
                        setValue('scheduledPeriod', newPeriod)
                        // Reset hour when period changes to first available hour in new period
                        const availableHours = getAvailableHoursForPeriod(newPeriod)
                        const currentHour = watch('scheduledHour')
                        if (!availableHours.includes(currentHour)) {
                          setValue('scheduledHour', availableHours[0] || '09')
                        }
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {(() => {
                          // Check if there are available hours in AM or PM
                          // AM hours: 7, 8, 9, 10, 11 (7 AM to 11 AM)
                          // PM hours: 12, 13, 14, 15, 16, 17, 18 (12 PM to 6 PM)
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

                  {/* Show availability status for selected time */}
                  {scheduledDate && hourlyAvailability.length > 0 && (
                    <div className="mt-2">
                      {(() => {
                        const availability = getCurrentTimeAvailability()
                        if (!availability) return null

                        if (availability.allBusy) {
                          return (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                              <AlertCircle className="h-4 w-4" />
                              Todos los técnicos están ocupados a esta hora
                            </div>
                          )
                        }

                        const availableTechs = availability.availableTechnicians.filter(t => t.isAvailable)
                        const busyTechs = availability.availableTechnicians.filter(t => !t.isAvailable)

                        return (
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2 text-green-600">
                              <Clock className="h-4 w-4" />
                              {availableTechs.length} técnico(s) disponible(s) a las {availability.displayTime}
                            </div>
                            {busyTechs.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                No disponibles: {busyTechs.map(t => t.technicianName).join(', ')}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </>
              )}
              {errors.scheduledHour && (
                <p className="text-sm text-red-500">{errors.scheduledHour.message}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Mantenimiento preventivo trimestral"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del mantenimiento visible para el cliente"
                rows={3}
                {...register('description')}
              />
            </div>

            {/* Private Notes */}
            <div className="space-y-2">
              <Label htmlFor="privateNotes">Notas Privadas</Label>
              <Textarea
                id="privateNotes"
                placeholder="Notas internas (solo visible para administradores y técnicos)"
                rows={2}
                {...register('privateNotes')}
              />
            </div>

            {/* Reschedule Reason - Show when editing a scheduled maintenance and date/time changed */}
            {editData && isEditingScheduledAndDateChanged() && (
              <div className="space-y-2 border border-amber-300 bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Cambio de horario detectado</span>
                </div>
                <div className="text-xs text-amber-600 mb-2">
                  <p>Original: {originalScheduledDateTime?.date} a las {originalScheduledDateTime?.hour}:{originalScheduledDateTime?.minute} {originalScheduledDateTime?.period}</p>
                  <p>Nuevo: {scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : ''} a las {watch('scheduledHour')}:{watch('scheduledMinute')} {watch('scheduledPeriod')}</p>
                </div>
                <Label htmlFor="rescheduleReason" className="text-amber-800">Motivo del cambio de horario *</Label>
                <Textarea
                  id="rescheduleReason"
                  placeholder="Explica al cliente por qué se cambió el horario..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={2}
                  className="border-amber-300 focus:border-amber-500"
                />
              </div>
            )}

            {/* Technician Assignment - Multiple selection with availability */}
            <div className="space-y-2">
              <Label>Técnicos Asignados *</Label>
              {technicians.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  <p className="text-sm">No hay técnicos registrados.</p>
                  <p className="text-xs mt-1">
                    Para agregar técnicos, crea usuarios con rol TECHNICIAN en la configuración.
                  </p>
                </div>
              ) : !scheduledDate ? (
                <div className="text-center py-4 text-muted-foreground border rounded-lg bg-amber-50">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-amber-700">Selecciona una fecha para ver técnicos disponibles</p>
                  <p className="text-xs mt-1 text-amber-600">
                    La disponibilidad depende de la fecha y hora seleccionada
                  </p>
                </div>
              ) : (
                <>
                  {(() => {
                    const availability = getCurrentTimeAvailability()

                    // Filter technicians to only show available ones
                    const availableTechnicians = technicians.filter((tech) => {
                      if (!availability) return true // Show all if no availability data
                      const techAvailability = availability.availableTechnicians.find(
                        t => t.technicianId === tech.id
                      )
                      return !techAvailability || techAvailability.isAvailable
                    })

                    // Count busy technicians
                    const busyTechnicians = availability?.availableTechnicians.filter(t => !t.isAvailable) || []

                    return (
                      <>
                        {/* Show info about busy technicians */}
                        {busyTechnicians.length > 0 && (
                          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              {busyTechnicians.length} técnico(s) ocupado(s) a esta hora: {busyTechnicians.map(t => t.technicianName).join(', ')}
                            </span>
                          </div>
                        )}

                        {availableTechnicians.length === 0 ? (
                          <div className="text-center py-4 text-red-600 border border-red-200 rounded-lg bg-red-50">
                            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                            <p className="text-sm">No hay técnicos disponibles a esta hora</p>
                            <p className="text-xs mt-1">Selecciona otra hora para ver técnicos disponibles</p>
                          </div>
                        ) : (
                          <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                            {availableTechnicians.map((tech) => (
                              <div key={tech.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`tech-${tech.id}`}
                                  checked={selectedTechnicianIds.includes(tech.id)}
                                  onCheckedChange={(checked) => {
                                    const currentIds = selectedTechnicianIds || []
                                    if (checked) {
                                      setValue('technicianIds', [...currentIds, tech.id])
                                    } else {
                                      setValue('technicianIds', currentIds.filter(id => id !== tech.id))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`tech-${tech.id}`}
                                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                                >
                                  {tech.name} - {tech.employeeId}
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                    Disponible
                                  </Badge>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </>
              )}
              {selectedTechnicianIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedTechnicianIds.length} técnico(s) seleccionado(s)
                </p>
              )}
              {errors.technicianIds && (
                <p className="text-sm text-red-500">{errors.technicianIds.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editData ? 'Actualizar' : 'Crear Mantenimiento'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
