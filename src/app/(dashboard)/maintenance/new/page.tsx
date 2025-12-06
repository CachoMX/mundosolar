'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, AlertCircle, Wrench, User, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  solarSystems?: {
    id: string
    systemName: string
  }[]
}

interface SolarSystem {
  id: string
  systemName: string
  clientId: string
}

export default function NewMaintenancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingSystems, setLoadingSystems] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([])

  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedSystem, setSelectedSystem] = useState<string>('')
  const [maintenanceType, setMaintenanceType] = useState<string>('PREVENTIVE')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [cost, setCost] = useState<string>('')
  const [laborHours, setLaborHours] = useState<string>('')
  const [nextScheduledDate, setNextScheduledDate] = useState<string>('')

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchSolarSystems(selectedClient)
    } else {
      setSolarSystems([])
      setSelectedSystem('')
    }
  }, [selectedClient])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()
      if (result.success) {
        setClients(result.data.filter((c: any) => c.isActive))
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoadingClients(false)
    }
  }

  const fetchSolarSystems = async (clientId: string) => {
    setLoadingSystems(true)
    try {
      const response = await fetch(`/api/solar-systems?clientId=${clientId}`)
      const result = await response.json()
      if (result.success) {
        setSolarSystems(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching solar systems:', err)
      setSolarSystems([])
    } finally {
      setLoadingSystems(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!selectedClient) {
        throw new Error('Seleccione un cliente')
      }

      if (!scheduledDate) {
        throw new Error('Seleccione una fecha programada')
      }

      const maintenanceData = {
        clientId: selectedClient,
        solarSystemId: selectedSystem || null,
        maintenanceType,
        scheduledDate,
        description: description || null,
        cost: cost ? parseFloat(cost) : null,
        laborHours: laborHours ? parseFloat(laborHours) : null,
        nextScheduledDate: nextScheduledDate || null
      }

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maintenanceData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al programar mantenimiento')
      }

      router.push('/maintenance')

    } catch (err) {
      console.error('Error creating maintenance:', err)
      setError(err instanceof Error ? err.message : 'Error al programar mantenimiento')
    } finally {
      setLoading(false)
    }
  }

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/maintenance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Programar Mantenimiento</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Cliente
              </CardTitle>
              <CardDescription>
                Seleccione el cliente para el mantenimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sistema Solar (opcional)</Label>
                <Select
                  value={selectedSystem}
                  onValueChange={setSelectedSystem}
                  disabled={!selectedClient || loadingSystems}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSystems ? 'Cargando...' : 'Seleccionar sistema'} />
                  </SelectTrigger>
                  <SelectContent>
                    {solarSystems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.systemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="mr-2 h-5 w-5" />
                Detalles del Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo de Mantenimiento</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVE">Preventivo</SelectItem>
                    <SelectItem value="CORRECTIVE">Correctivo</SelectItem>
                    <SelectItem value="WARRANTY">Garantía</SelectItem>
                    <SelectItem value="INSPECTION">Inspección</SelectItem>
                    <SelectItem value="CLEANING">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describa el trabajo a realizar..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Programación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Fecha Programada *</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Próximo Mantenimiento (opcional)</Label>
                <Input
                  type="date"
                  value={nextScheduledDate}
                  onChange={(e) => setNextScheduledDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Costos Estimados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Costo Estimado (MXN)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Horas de Trabajo Estimadas</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/maintenance">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Guardando...' : 'Programar Mantenimiento'}
          </Button>
        </div>
      </form>
    </div>
  )
}
