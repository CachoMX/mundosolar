'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  Calendar,
  MapPin,
  User,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  FileCheck,
  Settings,
  Pause,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Installation {
  id: string
  systemName: string
  capacity: number | null
  client: {
    id: string
    name: string
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
  }
  order: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    total: number
    amountPaid: number
  } | null
  installation: {
    status: string
    annexDate: string | null
    scheduledInstallationDate: string | null
    installationCompletedDate: string | null
    cfeSubmissionDate: string | null
    cfeApprovalDate: string | null
    interconnectionDate: string | null
    installationNotes: string | null
    installedBy: {
      id: string
      name: string | null
      email: string
    } | null
  }
}

const INSTALLATION_STATUSES = [
  { value: 'PENDING_SCHEDULING', label: 'Pendiente', color: 'bg-gray-500', icon: Clock },
  { value: 'SCHEDULED', label: 'Programada', color: 'bg-blue-500', icon: Calendar },
  { value: 'IN_PROGRESS', label: 'En Instalación', color: 'bg-yellow-500', icon: Settings },
  { value: 'INSTALLED', label: 'Instalado', color: 'bg-purple-500', icon: CheckCircle2 },
  { value: 'CFE_SUBMITTED', label: 'Trámite CFE', color: 'bg-orange-500', icon: FileCheck },
  { value: 'CFE_APPROVED', label: 'CFE Aprobado', color: 'bg-teal-500', icon: Building2 },
  { value: 'INTERCONNECTED', label: 'Interconectado', color: 'bg-green-500', icon: Zap },
  { value: 'ON_HOLD', label: 'En Espera', color: 'bg-red-500', icon: Pause }
]

const getStatusInfo = (status: string) => {
  return INSTALLATION_STATUSES.find(s => s.value === status) || INSTALLATION_STATUSES[0]
}

const getStatusBadge = (status: string) => {
  const info = getStatusInfo(status)
  const Icon = info.icon
  return (
    <Badge className={`${info.color} text-white`}>
      <Icon className="h-3 w-3 mr-1" />
      {info.label}
    </Badge>
  )
}

export default function InstallationsPage() {
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    installationStatus: '',
    annexDate: '',
    scheduledInstallationDate: '',
    installationCompletedDate: '',
    cfeSubmissionDate: '',
    cfeApprovalDate: '',
    interconnectionDate: '',
    installationNotes: ''
  })

  // Fetch installations
  const { data, isLoading, error } = useQuery({
    queryKey: ['installations', selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }
      params.append('limit', '100')
      const response = await fetch(`/api/installations?${params}`)
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  })

  // Update installation mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const response = await fetch(`/api/solar-systems/${data.id}/installation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates)
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installations'] })
      setEditDialogOpen(false)
      setSelectedInstallation(null)
    }
  })

  const handleEditClick = (installation: Installation) => {
    setSelectedInstallation(installation)
    setEditForm({
      installationStatus: installation.installation.status,
      annexDate: installation.installation.annexDate?.split('T')[0] || '',
      scheduledInstallationDate: installation.installation.scheduledInstallationDate?.split('T')[0] || '',
      installationCompletedDate: installation.installation.installationCompletedDate?.split('T')[0] || '',
      cfeSubmissionDate: installation.installation.cfeSubmissionDate?.split('T')[0] || '',
      cfeApprovalDate: installation.installation.cfeApprovalDate?.split('T')[0] || '',
      interconnectionDate: installation.installation.interconnectionDate?.split('T')[0] || '',
      installationNotes: installation.installation.installationNotes || ''
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedInstallation) return

    updateMutation.mutate({
      id: selectedInstallation.id,
      updates: {
        installationStatus: editForm.installationStatus,
        annexDate: editForm.annexDate || null,
        scheduledInstallationDate: editForm.scheduledInstallationDate || null,
        installationCompletedDate: editForm.installationCompletedDate || null,
        cfeSubmissionDate: editForm.cfeSubmissionDate || null,
        cfeApprovalDate: editForm.cfeApprovalDate || null,
        interconnectionDate: editForm.interconnectionDate || null,
        installationNotes: editForm.installationNotes || null
      }
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">Error al cargar instalaciones</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tracking de Instalaciones</h2>
          <p className="text-muted-foreground">
            Seguimiento del proceso de instalación de sistemas solares
          </p>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        {INSTALLATION_STATUSES.map((status) => {
          const count = data?.statusCounts?.[status.value] || 0
          const Icon = status.icon
          return (
            <Card
              key={status.value}
              className={`cursor-pointer transition-all ${selectedStatus === status.value ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedStatus(selectedStatus === status.value ? 'all' : status.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${status.color.replace('bg-', 'text-')}`} />
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{status.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {INSTALLATION_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedStatus !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setSelectedStatus('all')}>
            Limpiar filtro
          </Button>
        )}
      </div>

      {/* Installations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instalaciones</CardTitle>
          <CardDescription>
            {data?.installations?.length || 0} instalación(es) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.installations?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay instalaciones con este estado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / Sistema</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Programada</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.installations?.map((inst: Installation) => (
                    <TableRow key={inst.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inst.client.name}</p>
                          <p className="text-sm text-muted-foreground">{inst.systemName}</p>
                          {inst.capacity && (
                            <p className="text-xs text-muted-foreground">{inst.capacity} kW</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm">{inst.client.city || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{inst.client.state || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(inst.installation.status)}
                      </TableCell>
                      <TableCell>
                        {inst.installation.scheduledInstallationDate
                          ? formatDate(inst.installation.scheduledInstallationDate)
                          : <span className="text-muted-foreground">Sin programar</span>
                        }
                      </TableCell>
                      <TableCell>
                        {inst.order ? (
                          <div>
                            <Link href={`/orders/${inst.order.id}`} className="text-sm text-blue-600 hover:underline">
                              {inst.order.orderNumber}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {inst.order.paymentStatus === 'PAID' ? (
                                <span className="text-green-600">Pagado</span>
                              ) : inst.order.paymentStatus === 'PARTIAL' ? (
                                <span className="text-orange-600">Parcial</span>
                              ) : (
                                <span className="text-red-600">Pendiente</span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(inst)}
                        >
                          Editar
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Actualizar Instalación</DialogTitle>
            <DialogDescription>
              {selectedInstallation?.client.name} - {selectedInstallation?.systemName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Estado de Instalación</Label>
              <Select
                value={editForm.installationStatus}
                onValueChange={(value) => setEditForm({ ...editForm, installationStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTALLATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Anexo</Label>
                <Input
                  type="date"
                  value={editForm.annexDate}
                  onChange={(e) => setEditForm({ ...editForm, annexDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Programada</Label>
                <Input
                  type="date"
                  value={editForm.scheduledInstallationDate}
                  onChange={(e) => setEditForm({ ...editForm, scheduledInstallationDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Instalación</Label>
                <Input
                  type="date"
                  value={editForm.installationCompletedDate}
                  onChange={(e) => setEditForm({ ...editForm, installationCompletedDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Envío Trámite CFE</Label>
                <Input
                  type="date"
                  value={editForm.cfeSubmissionDate}
                  onChange={(e) => setEditForm({ ...editForm, cfeSubmissionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aprobación CFE</Label>
                <Input
                  type="date"
                  value={editForm.cfeApprovalDate}
                  onChange={(e) => setEditForm({ ...editForm, cfeApprovalDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Interconexión</Label>
                <Input
                  type="date"
                  value={editForm.interconnectionDate}
                  onChange={(e) => setEditForm({ ...editForm, interconnectionDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editForm.installationNotes}
                onChange={(e) => setEditForm({ ...editForm, installationNotes: e.target.value })}
                placeholder="Notas sobre la instalación..."
                rows={3}
              />
            </div>

            {/* Timeline Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium mb-3">Timeline de la Instalación</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${editForm.annexDate ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-muted-foreground">Anexo:</span>
                  <span>{editForm.annexDate || 'Pendiente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${editForm.scheduledInstallationDate ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-muted-foreground">Programado:</span>
                  <span>{editForm.scheduledInstallationDate || 'Pendiente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${editForm.installationCompletedDate ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-muted-foreground">Instalado:</span>
                  <span>{editForm.installationCompletedDate || 'Pendiente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${editForm.cfeSubmissionDate ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-muted-foreground">Trámite CFE:</span>
                  <span>{editForm.cfeSubmissionDate || 'Pendiente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${editForm.cfeApprovalDate ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-muted-foreground">CFE Aprobado:</span>
                  <span>{editForm.cfeApprovalDate || 'Pendiente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${editForm.interconnectionDate ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-muted-foreground">Interconectado:</span>
                  <span>{editForm.interconnectionDate || 'Pendiente'}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
