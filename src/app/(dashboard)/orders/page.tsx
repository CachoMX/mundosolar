'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle,
  Package,
  Loader2,
  Search,
  AlertTriangle,
  Eye,
  Edit
} from 'lucide-react'
import Link from 'next/link'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
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
  subtotal: number
  taxAmount: number
  total: number
  notes: string | null
  createdAt: string
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  orderItems: OrderItem[]
}

interface OrderStats {
  total: number
  active: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  totalValue: number
  activeValue: number
}

interface OrdersByStatus {
  draft: number
  confirmed: number
  inProgress: number
  shipped: number
  delivered: number
  completed: number
  cancelled: number
}

interface OrdersByType {
  sale: number
  installation: number
  maintenance: number
  warranty: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [byStatus, setByStatus] = useState<OrdersByStatus | null>(null)
  const [byType, setByType] = useState<OrdersByType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const result = await response.json()

      if (result.success) {
        setOrders(result.data.orders)
        setStats(result.data.stats)
        setByStatus(result.data.byStatus)
        setByType(result.data.byType)
      } else {
        setError(result.error || 'Error al cargar órdenes')
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase()
    const clientName = `${order.client.firstName} ${order.client.lastName}`.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      clientName.includes(query) ||
      order.client.email.toLowerCase().includes(query)
    )
  })

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      'DRAFT': { label: 'Borrador', variant: 'secondary' },
      'PENDING': { label: 'Pendiente', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'CONFIRMED': { label: 'Confirmada', variant: 'default', className: 'bg-blue-500' },
      'IN_PROGRESS': { label: 'En Proceso', variant: 'default', className: 'bg-purple-500' },
      'SHIPPED': { label: 'Enviada', variant: 'default', className: 'bg-indigo-500' },
      'DELIVERED': { label: 'Entregada', variant: 'default', className: 'bg-teal-500' },
      'COMPLETED': { label: 'Completada', variant: 'outline', className: 'text-green-600 border-green-600' },
      'CANCELLED': { label: 'Cancelada', variant: 'destructive' }
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' }
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getOrderTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
      'SALE': { label: 'Venta', className: 'bg-green-100 text-green-800' },
      'INSTALLATION': { label: 'Instalación', className: 'bg-blue-100 text-blue-800' },
      'MAINTENANCE': { label: 'Mantenimiento', className: 'bg-orange-100 text-orange-800' },
      'WARRANTY': { label: 'Garantía', className: 'bg-purple-100 text-purple-800' }
    }

    const config = typeConfig[type] || { label: type, className: '' }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  if (loading) {
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
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchOrders}>Reintentar</Button>
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
            <div className="text-2xl font-bold text-yellow-500">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Activo</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.activeValue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Órdenes activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por número de orden, cliente o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats by Status and Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Borrador</span>
                <span className="text-muted-foreground">{byStatus?.draft || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Confirmadas</span>
                <span className="text-muted-foreground">{byStatus?.confirmed || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">En Progreso</span>
                <span className="text-muted-foreground">{byStatus?.inProgress || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Enviadas</span>
                <span className="text-muted-foreground">{byStatus?.shipped || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Completadas</span>
                <span className="text-muted-foreground">{byStatus?.completed || 0} órdenes</span>
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
              <div className="flex items-center justify-between">
                <span className="font-medium">Ventas</span>
                <span className="text-muted-foreground">{byType?.sale || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Instalación</span>
                <span className="text-muted-foreground">{byType?.installation || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Mantenimiento</span>
                <span className="text-muted-foreground">{byType?.maintenance || 0} órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Garantía</span>
                <span className="text-muted-foreground">{byType?.warranty || 0} órdenes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Órdenes</CardTitle>
          <CardDescription>
            {filteredOrders.length} de {orders.length} órdenes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No hay órdenes registradas</h3>
              <p className="mb-4">Comience creando su primera orden</p>
              <Link href="/orders/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Orden
                </Button>
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron órdenes</h3>
              <p>Intente con diferentes términos de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">{order.orderNumber}</span>
                      {getStatusBadge(order.status)}
                      {getOrderTypeBadge(order.orderType)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.client.firstName} {order.client.lastName} - {order.client.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.orderItems.length} producto(s) - Creada: {new Date(order.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">Total con IVA</p>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/orders/${order.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
