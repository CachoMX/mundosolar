'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Truck,
  DollarSign,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  Building2,
  Receipt,
  Upload,
  ExternalLink,
  X,
  Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Payment {
  id: string
  amount: number
  paymentType: string
  paymentMethod: string | null
  paymentDate: string
  referenceNumber: string | null
  notes: string | null
  receiptUrl: string | null
  receivedBy: {
    id: string
    name: string | null
    email: string
  } | null
  createdAt: string
}

interface OrderItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  notes: string | null
  serialNumbers: string[]
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
  amountPaid: number
  balanceDue: number
  paymentStatus: string
  depositRequired: boolean
  depositPercentage: number | null
  depositAmount: number | null
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

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Payment states
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentType: 'PARTIAL',
    paymentMethod: 'TRANSFER',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: ''
  })

  useEffect(() => {
    fetchOrder()
    fetchPayments()
  }, [params.id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${params.id}`)
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
        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true)
      const response = await fetch(`/api/orders/${params.id}/payments`)
      const result = await response.json()

      if (result.success) {
        setPayments(result.data.payments)
        // Update order payment info
        if (order) {
          setOrder({
            ...order,
            amountPaid: result.data.order.amountPaid,
            balanceDue: result.data.order.balanceDue,
            paymentStatus: result.data.order.paymentStatus
          })
        }
      }
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setPaymentsLoading(false)
    }
  }

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es muy grande. Máximo 10MB')
        return
      }
      setReceiptFile(file)
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setReceiptPreview(null)
      }
    }
  }

  const clearReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
  }

  const handleAddPayment = async () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    setSavingPayment(true)
    try {
      let receiptUrl = null

      // Upload receipt first if there is one
      if (receiptFile) {
        setUploadingReceipt(true)
        const formData = new FormData()
        formData.append('receipt', receiptFile)

        const uploadResponse = await fetch('/api/payments/upload-receipt', {
          method: 'POST',
          body: formData
        })
        const uploadResult = await uploadResponse.json()

        if (uploadResult.success) {
          receiptUrl = uploadResult.data.receiptUrl
        } else {
          alert(uploadResult.error || 'Error al subir el recibo')
          setSavingPayment(false)
          setUploadingReceipt(false)
          return
        }
        setUploadingReceipt(false)
      }

      const response = await fetch(`/api/orders/${params.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          paymentType: newPayment.paymentType,
          paymentMethod: newPayment.paymentMethod,
          paymentDate: newPayment.paymentDate,
          referenceNumber: newPayment.referenceNumber || null,
          notes: newPayment.notes || null,
          receiptUrl
        })
      })
      const result = await response.json()

      if (result.success) {
        setPayments([result.data.payment, ...payments])
        if (order) {
          setOrder({
            ...order,
            amountPaid: result.data.orderSummary.amountPaid,
            balanceDue: result.data.orderSummary.balanceDue,
            paymentStatus: result.data.orderSummary.paymentStatus
          })
        }
        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        setPaymentDialogOpen(false)
        setNewPayment({
          amount: '',
          paymentType: 'PARTIAL',
          paymentMethod: 'TRANSFER',
          paymentDate: new Date().toISOString().split('T')[0],
          referenceNumber: '',
          notes: ''
        })
        clearReceipt()
      } else {
        alert(result.error || 'Error al registrar pago')
      }
    } catch (err) {
      console.error('Error adding payment:', err)
      alert('Error al registrar pago')
    } finally {
      setSavingPayment(false)
      setUploadingReceipt(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este pago?')) return

    try {
      const response = await fetch(`/api/orders/${params.id}/payments/${paymentId}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        setPayments(payments.filter(p => p.id !== paymentId))
        if (order) {
          setOrder({
            ...order,
            amountPaid: result.data.orderSummary.amountPaid,
            balanceDue: result.data.orderSummary.balanceDue,
            paymentStatus: result.data.orderSummary.paymentStatus
          })
        }
        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      } else {
        alert(result.error || 'Error al eliminar pago')
      }
    } catch (err) {
      console.error('Error deleting payment:', err)
      alert('Error al eliminar pago')
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: 'Pendiente', variant: 'outline' },
      PARTIAL: { label: 'Parcial', variant: 'secondary' },
      PAID: { label: 'Pagado', variant: 'default' },
      REFUNDED: { label: 'Reembolsado', variant: 'destructive' }
    }
    const info = statusMap[status] || { label: status, variant: 'outline' }
    return <Badge variant={info.variant}>{info.label}</Badge>
  }

  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      DEPOSIT: 'Anticipo',
      PARTIAL: 'Abono',
      FINAL: 'Liquidación',
      REFUND: 'Reembolso'
    }
    return types[type] || type
  }

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case 'CASH': return <Banknote className="h-4 w-4" />
      case 'TRANSFER': return <Building2 className="h-4 w-4" />
      case 'CARD': return <CreditCard className="h-4 w-4" />
      case 'CHECK': return <Receipt className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = (method: string | null) => {
    const methods: Record<string, string> = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      CARD: 'Tarjeta',
      CHECK: 'Cheque'
    }
    return method ? methods[method] || method : 'No especificado'
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
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground font-medium">Números de Serie:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.serialNumbers.map((serial, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono"
                                >
                                  {serial}
                                </span>
                              ))}
                            </div>
                          </div>
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

      {/* Payments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pagos
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                Estado: {getPaymentStatusBadge(order.paymentStatus || 'PENDING')}
              </div>
            </div>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar Pago
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                  <DialogDescription>
                    Orden {order.orderNumber} - Saldo pendiente: ${((order.balanceDue ?? order.total) - (order.amountPaid || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentDate">Fecha</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        value={newPayment.paymentDate}
                        onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentType">Tipo de Pago</Label>
                      <Select
                        value={newPayment.paymentType}
                        onValueChange={(value) => setNewPayment({ ...newPayment, paymentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEPOSIT">Anticipo</SelectItem>
                          <SelectItem value="PARTIAL">Abono</SelectItem>
                          <SelectItem value="FINAL">Liquidación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Método de Pago</Label>
                      <Select
                        value={newPayment.paymentMethod}
                        onValueChange={(value) => setNewPayment({ ...newPayment, paymentMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Efectivo</SelectItem>
                          <SelectItem value="TRANSFER">Transferencia</SelectItem>
                          <SelectItem value="CARD">Tarjeta</SelectItem>
                          <SelectItem value="CHECK">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referenceNumber">Referencia / Folio</Label>
                    <Input
                      id="referenceNumber"
                      placeholder="Número de referencia o folio"
                      value={newPayment.referenceNumber}
                      onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      placeholder="Notas adicionales..."
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt">Comprobante de Pago</Label>
                    {!receiptFile ? (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer"
                        onClick={() => document.getElementById('receipt-input')?.click()}
                      >
                        <input
                          id="receipt-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={handleReceiptChange}
                        />
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Clic para subir comprobante
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, WEBP o PDF (máx. 10MB)
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-3 flex items-center justify-between bg-muted/50">
                        <div className="flex items-center gap-3">
                          {receiptPreview ? (
                            <img
                              src={receiptPreview}
                              alt="Preview"
                              className="h-12 w-12 object-cover rounded"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {receiptFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(receiptFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearReceipt}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPayment} disabled={savingPayment || uploadingReceipt}>
                    {(savingPayment || uploadingReceipt) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {uploadingReceipt ? 'Subiendo recibo...' : 'Registrar Pago'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total de la Orden</p>
              <p className="text-xl font-bold">${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pagado</p>
              <p className="text-xl font-bold text-green-600">${(order.amountPaid || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
              <p className="text-xl font-bold text-orange-600">
                ${((order.balanceDue ?? order.total) - (order.amountPaid || 0) > 0 ? (order.balanceDue ?? order.total) - (order.amountPaid || 0) : order.total - (order.amountPaid || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Payments List */}
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay pagos registrados</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPaymentTypeLabel(payment.paymentType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.referenceNumber || '-'}
                      </TableCell>
                      <TableCell>
                        {payment.receiptUrl ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Ver
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  )
}
