'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  User,
  Calendar,
  Package,
  MapPin,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  notes: string | null
  product: {
    id: string
    name: string
    brand: string | null
    model: string | null
    category: {
      id: string
      name: string
    }
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
    address: string | null
  }
  orderItems: OrderItem[]
  invoice: any | null
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [resolvedParams.id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      const result = await response.json()

      if (result.success) {
        setOrder(result.data)
      } else {
        setError(result.error || 'Error al cargar la orden')
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string) => {
    if (!order) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const result = await response.json()

      if (result.success) {
        setOrder({ ...order, status: newStatus })
      } else {
        alert(result.error || 'Error al actualizar estado')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Error al actualizar estado')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      DRAFT: { label: 'Borrador', variant: 'outline', icon: FileText },
      CONFIRMED: { label: 'Confirmada', variant: 'default', icon: CheckCircle },
      IN_PROGRESS: { label: 'En Proceso', variant: 'secondary', icon: Clock },
      SHIPPED: { label: 'Enviada', variant: 'default', icon: Truck },
      DELIVERED: { label: 'Entregada', variant: 'default', icon: Package },
      COMPLETED: { label: 'Completada', variant: 'outline', icon: CheckCircle },
      CANCELLED: { label: 'Cancelada', variant: 'destructive', icon: AlertTriangle }
    }
    const info = statusMap[status] || { label: status, variant: 'outline', icon: FileText }
    const Icon = info.icon
    return (
      <Badge variant={info.variant} className="text-sm">
        <Icon className="mr-1 h-3 w-3" />
        {info.label}
      </Badge>
    )
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando orden...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar orden</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchOrder}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h2>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">
              {getOrderTypeLabel(order.orderType)} - Creada el {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: es })}
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <Select
              value={order.status}
              onValueChange={updateStatus}
              disabled={updating}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                <SelectItem value="IN_PROGRESS">En Proceso</SelectItem>
                <SelectItem value="SHIPPED">Enviada</SelectItem>
                <SelectItem value="COMPLETED">Completada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{order.client.firstName} {order.client.lastName}</p>
            <p className="text-sm text-muted-foreground">{order.client.email}</p>
            {order.client.phone && (
              <p className="text-sm text-muted-foreground">{order.client.phone}</p>
            )}
            <Link href={`/clients/${order.client.id}`}>
              <Button variant="outline" size="sm" className="mt-2">
                Ver Cliente
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fechas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Creación:</span>
              <span>{format(new Date(order.orderDate), 'dd/MM/yyyy', { locale: es })}</span>
            </div>
            {order.requiredDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requerida:</span>
                <span>{format(new Date(order.requiredDate), 'dd/MM/yyyy', { locale: es })}</span>
              </div>
            )}
            {order.shippingDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío:</span>
                <span>{format(new Date(order.shippingDate), 'dd/MM/yyyy', { locale: es })}</span>
              </div>
            )}
            {order.completedDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completada:</span>
                <span>{format(new Date(order.completedDate), 'dd/MM/yyyy', { locale: es })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Envío
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.shippingAddress ? (
              <p className="text-sm">{order.shippingAddress}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin dirección de envío</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Productos
          </CardTitle>
          <CardDescription>
            {order.orderItems.length} producto(s) en esta orden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-[100px] text-center">Cantidad</TableHead>
                  <TableHead className="w-[150px] text-right">Precio Unit.</TableHead>
                  <TableHead className="w-[120px] text-right">Descuento</TableHead>
                  <TableHead className="w-[150px] text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.orderItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.product.brand} {item.product.model} - {item.product.category.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      ${item.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.discount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${order.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA ({(order.taxRate * 100).toFixed(0)}%):</span>
                <span>${order.taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
