'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle,
  Package,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  product: {
    id: string
    name: string
    brand: string | null
    model: string | null
  }
}

interface Order {
  id: string
  orderNumber: string
  clientId: string
  status: string
  orderType: string
  orderDate: string
  requiredDate: string | null
  shippingDate: string | null
  completedDate: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  shippingAddress: string | null
  notes: string | null
  createdAt: string
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  orderItems: OrderItem[]
}

interface OrderStats {
  active: number
  draft: number
  confirmed: number
  inProgress: number
  shipped: number
  completed: number
  cancelled: number
  monthlyCompleted: number
  totalValue: number
}

interface TypeDistribution {
  type: string
  count: number
  percentage: number
}

interface OrdersData {
  orders: Order[]
  stats: OrderStats
  typeDistribution: TypeDistribution[]
}

const fetchOrdersData = async (): Promise<OrdersData> => {
  const response = await fetch('/api/orders')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al cargar órdenes')
  }
  return result.data
}

export default function OrdersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrdersData,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        setDeleteDialogOpen(false)
        setOrderToDelete(null)
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } else {
        alert(result.error || 'Error al eliminar orden')
      }
    } catch (err) {
      console.error('Error deleting order:', err)
      alert('Error al eliminar orden')
    } finally {
      setDeleting(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const result = await response.json()

      if (result.success) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } else {
        alert(result.error || 'Error al actualizar estado')
      }
    } catch (err) {
      console.error('Error updating order status:', err)
      alert('Error al actualizar estado')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Borrador', variant: 'outline' },
      CONFIRMED: { label: 'Confirmada', variant: 'default' },
      IN_PROGRESS: { label: 'En Proceso', variant: 'secondary' },
      SHIPPED: { label: 'Enviada', variant: 'default' },
      DELIVERED: { label: 'Entregada', variant: 'default' },
      COMPLETED: { label: 'Completada', variant: 'outline' },
      CANCELLED: { label: 'Cancelada', variant: 'destructive' }
    }
    const info = statusMap[status] || { label: status, variant: 'outline' }
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  const getOrderTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      SALE: 'Venta',
      INSTALLATION: 'Instalación',
      MAINTENANCE: 'Mantenimiento',
      WARRANTY: 'Garantía'
    }
    return types[type] || type
  }

  // Extract data
  const orders = data?.orders || []
  const stats = data?.stats
  const typeDistribution = data?.typeDistribution || []

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.client.firstName} ${order.client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesType = typeFilter === 'all' || order.orderType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando órdenes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar órdenes</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Órdenes</h2>
        <Link href="/orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Activas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats?.draft || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.monthlyCompleted || 0}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalValue?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Órdenes activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Status & Type Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Borrador</span>
                <span className="text-muted-foreground">{stats?.draft || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Confirmadas</span>
                <span className="text-muted-foreground">{stats?.confirmed || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">En Progreso</span>
                <span className="text-muted-foreground">{stats?.inProgress || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Enviadas</span>
                <span className="text-muted-foreground">{stats?.shipped || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Completadas</span>
                <span className="text-muted-foreground">{stats?.completed || 0} órdenes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeDistribution.length > 0 ? (
                typeDistribution.map((type) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <span className="font-medium">{getOrderTypeLabel(type.type)}</span>
                    <span className="text-muted-foreground">{type.percentage}%</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Ventas</span>
                    <span className="text-muted-foreground">0%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Instalación</span>
                    <span className="text-muted-foreground">0%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Mantenimiento</span>
                    <span className="text-muted-foreground">0%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Garantía</span>
                    <span className="text-muted-foreground">0%</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Órdenes</CardTitle>
          <CardDescription>Lista completa de órdenes con seguimiento de estado</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                <SelectItem value="IN_PROGRESS">En Proceso</SelectItem>
                <SelectItem value="SHIPPED">Enviada</SelectItem>
                <SelectItem value="COMPLETED">Completada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="SALE">Venta</SelectItem>
                <SelectItem value="INSTALLATION">Instalación</SelectItem>
                <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                <SelectItem value="WARRANTY">Garantía</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay órdenes</h3>
              <p className="mb-4">
                {orders.length === 0
                  ? 'Crea tu primera orden para empezar'
                  : 'No se encontraron órdenes con los filtros seleccionados'}
              </p>
              {orders.length === 0 && (
                <Link href="/orders/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Orden
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.client.firstName} {order.client.lastName}</p>
                          <p className="text-sm text-muted-foreground">{order.client.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getOrderTypeLabel(order.orderType)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            {order.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirmar
                              </DropdownMenuItem>
                            )}
                            {order.status === 'CONFIRMED' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')}>
                                <Package className="mr-2 h-4 w-4" />
                                Iniciar proceso
                              </DropdownMenuItem>
                            )}
                            {order.status === 'IN_PROGRESS' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'SHIPPED')}>
                                <Package className="mr-2 h-4 w-4" />
                                Marcar como enviada
                              </DropdownMenuItem>
                            )}
                            {order.status === 'SHIPPED' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'COMPLETED')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Completar
                              </DropdownMenuItem>
                            )}
                            {(order.status === 'DRAFT' || order.status === 'CANCELLED') && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setOrderToDelete(order)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Orden</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la orden {orderToDelete?.orderNumber}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrder} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
