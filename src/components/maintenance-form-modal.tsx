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
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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
      const period = hours >= 12 ? 'PM' : 'AM'
      if (hours > 12) hours -= 12
      if (hours === 0) hours = 12
      setValue('scheduledHour', String(hours).padStart(2, '0'))
      setValue('scheduledMinute', minutes)
      setValue('scheduledPeriod', period)
      setValue('title', editData.title)
      setValue('description', editData.description || '')
      setValue('privateNotes', editData.privateNotes || '')

      // Get all technician IDs
      const techIds = editData.technicians?.map((t: any) => t.technicianId) || []
      setValue('technicianIds', techIds)
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

      const payload = {
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
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente *</Label>
              <Select
                value={watch('clientId')}
                onValueChange={(value) => setValue('clientId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="flex gap-2">
                {/* Hour selector (01-12) */}
                <Select
                  value={watch('scheduledHour')}
                  onValueChange={(value) => setValue('scheduledHour', value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((hour) => (
                      <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                    ))}
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

                {/* AM/PM selector */}
                <Select
                  value={watch('scheduledPeriod')}
                  onValueChange={(value) => setValue('scheduledPeriod', value as 'AM' | 'PM')}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            {/* Technician Assignment - Multiple selection */}
            <div className="space-y-2">
              <Label>Técnicos Asignados *</Label>
              {technicians.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  <p className="text-sm">No hay técnicos registrados.</p>
                  <p className="text-xs mt-1">
                    Para agregar técnicos, crea usuarios con rol TECHNICIAN en la configuración.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {technicians.map((tech) => (
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
                        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {tech.name} - {tech.employeeId}
                      </label>
                    </div>
                  ))}
                </div>
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
