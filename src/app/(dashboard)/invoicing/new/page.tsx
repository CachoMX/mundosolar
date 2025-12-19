'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, Trash2, FileText, User, Search, Package, CheckCircle, Loader2, ShoppingCart, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  rfc?: string
  regimenFiscal?: string
  postalCode?: string
}

interface OrderItem {
  id: string
  productId: string
  productName: string
  productBrand?: string
  productModel?: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  notes?: string
}

interface Order {
  id: string
  orderNumber: string
  orderType: string
  status: string
  orderDate: string
  subtotal: number
  taxAmount: number
  total: number
  paymentStatus: string
  isInvoiced: boolean
  invoice: {
    id: string
    invoiceNumber: string
    status: string
    uuid?: string
    createdAt: string
  } | null
  items: OrderItem[]
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface InvoiceFormData {
  clientId: string
  orderId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  metodoPago: string
  formaPago: string
  usoCFDI: string
  items: InvoiceItem[]
  subtotal: number
  iva: number
  total: number
  notes: string
}

const METODO_PAGO = [
  { value: 'PUE', label: 'PUE - Pago en una Sola Exhibición' },
  { value: 'PPD', label: 'PPD - Pago en Parcialidades o Diferido' }
]

const FORMA_PAGO = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque Nominativo' },
  { value: '03', label: '03 - Transferencia Electrónica' },
  { value: '04', label: '04 - Tarjeta de Crédito' },
  { value: '05', label: '05 - Monedero Electrónico' },
  { value: '28', label: '28 - Tarjeta de Débito' },
  { value: '29', label: '29 - Tarjeta de Servicios' }
]

const USO_CFDI = [
  { value: 'G01', label: 'G01 - Adquisición de Mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, Descuentos o Bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en General' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobilario y Equipo de Oficina' },
  { value: 'I03', label: 'I03 - Equipo de Transporte' },
  { value: 'I04', label: 'I04 - Equipo de Computo y Accesorios' },
  { value: 'I08', label: 'I08 - Otra Maquinaria y Equipo' },
  { value: 'D01', label: 'D01 - Honorarios Médicos, Dentales' },
  { value: 'P01', label: 'P01 - Por Definir' },
  { value: 'S01', label: 'S01 - Sin Efectos Fiscales' }
]

const ORDER_TYPE_LABELS: Record<string, string> = {
  'SALE': 'Venta',
  'INSTALLATION': 'Instalación',
  'MAINTENANCE': 'Mantenimiento',
  'WARRANTY': 'Garantía'
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  'DRAFT': 'Borrador',
  'CONFIRMED': 'Confirmada',
  'IN_PROGRESS': 'En Proceso',
  'SHIPPED': 'Enviada',
  'DELIVERED': 'Entregada',
  'COMPLETED': 'Completada',
  'CANCELLED': 'Cancelada'
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [clientOrders, setClientOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    orderId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metodoPago: 'PUE',
    formaPago: '03',
    usoCFDI: 'G01',
    items: [],
    subtotal: 0,
    iva: 0,
    total: 0,
    notes: ''
  })

  useEffect(() => {
    fetchClients()
    generateInvoiceNumber()
  }, [])

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients
    const search = clientSearch.toLowerCase()
    return clients.filter(client =>
      client.firstName.toLowerCase().includes(search) ||
      client.lastName.toLowerCase().includes(search) ||
      client.email.toLowerCase().includes(search) ||
      (client.rfc && client.rfc.toLowerCase().includes(search)) ||
      (client.phone && client.phone.includes(search))
    )
  }, [clients, clientSearch])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()

      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchClientOrders = async (clientId: string) => {
    setLoadingOrders(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/orders`)
      const result = await response.json()

      if (result.success) {
        setClientOrders(result.data)
      }
    } catch (error) {
      console.error('Error fetching client orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const generateInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

    setFormData(prev => ({
      ...prev,
      invoiceNumber: `FAC-${year}${month}${day}-${random}`
    }))
  }

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(`${client.firstName} ${client.lastName}`)
    setShowClientDropdown(false)
    setFormData(prev => ({ ...prev, clientId: client.id }))
    setSelectedOrder(null)
    setClientOrders([])
    fetchClientOrders(client.id)
  }

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    setFormData(prev => ({
      ...prev,
      orderId: order.id,
      items: order.items.map(item => ({
        id: item.id,
        description: `${item.productName}${item.productBrand ? ` - ${item.productBrand}` : ''}${item.productModel ? ` ${item.productModel}` : ''}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.totalPrice
      })),
      subtotal: order.subtotal,
      iva: order.taxAmount,
      total: order.total
    }))
  }

  const handleInputChange = (field: keyof InvoiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }

          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice
          }

          return updatedItem
        }
        return item
      })

      // Recalculate totals
      const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
      const iva = subtotal * 0.16
      const total = subtotal + iva

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        iva,
        total
      }
    })
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItem = (itemId: string) => {
    setFormData(prev => {
      const updatedItems = prev.items.filter(item => item.id !== itemId)

      const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
      const iva = subtotal * 0.16
      const total = subtotal + iva

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        iva,
        total
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate required fields
      if (!formData.clientId || !formData.invoiceNumber || formData.items.length === 0) {
        throw new Error('Cliente, número de factura y al menos un producto son requeridos')
      }

      // Validate items
      const invalidItems = formData.items.filter(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)
      if (invalidItems.length > 0) {
        throw new Error('Todos los productos deben tener descripción, cantidad y precio válidos')
      }

      // Create invoice via API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear factura')
      }

      router.push('/invoicing')

    } catch (error) {
      console.error('Error creating invoice:', error)
      alert(error instanceof Error ? error.message : 'Error al crear factura')
    } finally {
      setSaving(false)
    }
  }

  const availableOrders = clientOrders.filter(order => !order.isInvoiced)
  const invoicedOrders = clientOrders.filter(order => order.isInvoiced)

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/invoicing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Facturación
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Factura</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Selection */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Seleccionar Cliente
              </CardTitle>
              <CardDescription>
                Busca y selecciona el cliente para la factura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nombre, email, RFC o teléfono..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="pl-10"
                  />
                </div>

                {/* Client dropdown */}
                {showClientDropdown && clientSearch && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No se encontraron clientes
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSelectClient(client)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{client.firstName} {client.lastName}</p>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            {client.rfc ? (
                              <Badge variant="outline">{client.rfc}</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Sin RFC</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected client info */}
              {selectedClient && (
                <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{selectedClient.firstName} {selectedClient.lastName}</p>
                        <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedClient.rfc ? (
                        <div>
                          <Badge variant="default" className="mb-1">{selectedClient.rfc}</Badge>
                          {selectedClient.postalCode && (
                            <p className="text-xs text-muted-foreground">C.P. {selectedClient.postalCode}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Cliente sin RFC</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSelectedClient(null)
                      setClientSearch('')
                      setClientOrders([])
                      setSelectedOrder(null)
                      setFormData(prev => ({ ...prev, clientId: '', orderId: '', items: [], subtotal: 0, iva: 0, total: 0 }))
                    }}
                  >
                    Cambiar cliente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Orders */}
          {selectedClient && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Órdenes del Cliente
                </CardTitle>
                <CardDescription>
                  Selecciona una orden para facturar o agrega productos manualmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Cargando órdenes...</span>
                  </div>
                ) : clientOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                    <p>Este cliente no tiene órdenes registradas</p>
                    <p className="text-sm mt-1">Puedes agregar productos manualmente abajo</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Available orders (not invoiced) */}
                    {availableOrders.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center text-green-700">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Órdenes disponibles para facturar ({availableOrders.length})
                        </h4>
                        <div className="grid gap-3">
                          {availableOrders.map((order) => (
                            <div
                              key={order.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedOrder?.id === order.id
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                                  : 'hover:border-gray-400 hover:bg-gray-50'
                              }`}
                              onClick={() => handleSelectOrder(order)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold">{order.orderNumber}</span>
                                    <Badge variant="outline">{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</Badge>
                                    <Badge variant="secondary">{ORDER_STATUS_LABELS[order.status] || order.status}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(order.orderDate).toLocaleDateString('es-MX')} • {order.items.length} productos
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">${order.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
                                  <p className="text-xs text-muted-foreground">IVA incluido</p>
                                </div>
                              </div>
                              {selectedOrder?.id === order.id && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-sm font-medium mb-2">Productos:</p>
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.quantity}x {item.productName}</span>
                                        <span>${item.totalPrice.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Already invoiced orders */}
                    {invoicedOrders.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-2 flex items-center text-gray-500">
                          <FileText className="h-4 w-4 mr-2" />
                          Órdenes ya facturadas ({invoicedOrders.length})
                        </h4>
                        <div className="grid gap-2">
                          {invoicedOrders.map((order) => (
                            <div
                              key={order.id}
                              className="p-3 border rounded-lg bg-gray-50 opacity-60"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{order.orderNumber}</span>
                                  <Badge variant="secondary">{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="default" className="bg-green-600">
                                    {order.invoice?.invoiceNumber}
                                  </Badge>
                                  <span className="text-sm">${order.total.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invoice Header */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Información de la Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="invoiceNumber">Número de Factura *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  placeholder="FAC-20240101-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="issueDate">Fecha de Emisión *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleInputChange('issueDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* SAT Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información SAT</CardTitle>
              <CardDescription>
                Datos requeridos para cumplimiento fiscal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metodoPago">Método de Pago</Label>
                <Select value={formData.metodoPago} onValueChange={(value) => handleInputChange('metodoPago', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODO_PAGO.map((metodo) => (
                      <SelectItem key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="formaPago">Forma de Pago</Label>
                <Select value={formData.formaPago} onValueChange={(value) => handleInputChange('formaPago', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMA_PAGO.map((forma) => (
                      <SelectItem key={forma.value} value={forma.value}>
                        {forma.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="usoCFDI">Uso CFDI</Label>
                <Select value={formData.usoCFDI} onValueChange={(value) => handleInputChange('usoCFDI', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USO_CFDI.map((uso) => (
                      <SelectItem key={uso.value} value={uso.value}>
                        {uso.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">${formData.subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span className="font-medium">${formData.iva.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${formData.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Productos/Servicios</CardTitle>
                <CardDescription>
                  {selectedOrder ? 'Productos de la orden seleccionada' : 'Agrega los productos o servicios a facturar'}
                </CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </CardHeader>
            <CardContent>
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay productos agregados</p>
                  <p className="text-sm mt-1">Selecciona una orden arriba o agrega productos manualmente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                      <div className="col-span-5">
                        <Label htmlFor={`description-${item.id}`}>Descripción *</Label>
                        <Input
                          id={`description-${item.id}`}
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Descripción del producto/servicio"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`quantity-${item.id}`}>Cantidad *</Label>
                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`unitPrice-${item.id}`}>Precio Unitario *</Label>
                        <Input
                          id={`unitPrice-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Importe</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm">
                          ${item.amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notas y Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales para la factura..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/invoicing">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || !formData.clientId || formData.items.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Creando...' : 'Crear Factura'}
          </Button>
        </div>
      </form>
    </div>
  )
}
