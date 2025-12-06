'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  User,
  ClipboardList,
  Loader2,
  Search,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
}

interface Product {
  id: string
  name: string
  brand: string | null
  model: string | null
  capacity: string | null
  unitPrice: number | null
  totalStock: number
  category: {
    id: string
    name: string
  }
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
}

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [selectedClient, setSelectedClient] = useState<string>('')
  const [orderType, setOrderType] = useState<string>('SALE')
  const [status, setStatus] = useState<string>('DRAFT')
  const [requiredDate, setRequiredDate] = useState<string>('')
  const [shippingAddress, setShippingAddress] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<OrderItem[]>([])

  const [searchProduct, setSearchProduct] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)

  useEffect(() => {
    fetchClients()
    fetchProducts()
  }, [])

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

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const result = await response.json()
      if (result.success) {
        setProducts(result.data)
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId)
    const product = products.find(p => p.id === productId)
    if (product) {
      setUnitPrice(Number(product.unitPrice) || 0)
    }
  }

  const addItem = () => {
    if (!selectedProduct || quantity <= 0) {
      setError('Seleccione un producto y cantidad válida')
      return
    }

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const totalPrice = (quantity * unitPrice) - discount

    const newItem: OrderItem = {
      productId: product.id,
      productName: `${product.name} ${product.brand || ''} ${product.model || ''}`.trim(),
      quantity,
      unitPrice,
      discount,
      totalPrice
    }

    setItems([...items, newItem])

    // Reset form
    setSelectedProduct('')
    setQuantity(1)
    setUnitPrice(0)
    setDiscount(0)
    setError(null)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.16
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!selectedClient) {
        throw new Error('Seleccione un cliente')
      }

      if (items.length === 0) {
        throw new Error('Agregue al menos un producto')
      }

      const orderData = {
        clientId: selectedClient,
        orderType,
        status,
        requiredDate: requiredDate || null,
        shippingAddress: shippingAddress || null,
        notes: notes || null,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          notes: null
        }))
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la orden')
      }

      router.push('/orders')

    } catch (err) {
      console.error('Error creating order:', err)
      setError(err instanceof Error ? err.message : 'Error al crear la orden')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const search = searchProduct.toLowerCase()
    return (
      product.name.toLowerCase().includes(search) ||
      (product.brand && product.brand.toLowerCase().includes(search)) ||
      (product.model && product.model.toLowerCase().includes(search))
    )
  })

  if (loadingClients || loadingProducts) {
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
          <Link href="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Órdenes
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Orden</h2>
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
                Seleccione el cliente para esta orden
              </CardDescription>
            </CardHeader>
            <CardContent>
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
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No hay clientes registrados.{' '}
                  <Link href="/clients/new" className="text-blue-500 hover:underline">
                    Crear cliente
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                Detalles de la Orden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderType">Tipo de Orden</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALE">Venta</SelectItem>
                      <SelectItem value="INSTALLATION">Instalación</SelectItem>
                      <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                      <SelectItem value="WARRANTY">Garantía</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="requiredDate">Fecha Requerida (opcional)</Label>
                <Input
                  id="requiredDate"
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Product */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Agregar Productos
              </CardTitle>
              <CardDescription>
                Busque y agregue productos a la orden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label>Buscar Producto</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Producto</Label>
                  <Select value={selectedProduct} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.brand || ''} {product.model || ''}
                          {product.unitPrice && ` - $${Number(product.unitPrice).toLocaleString('es-MX')}`}
                          {` (Stock: ${product.totalStock})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>Precio Unit.</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div className="w-32">
                  <Label>Descuento</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Button type="button" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay productos en el inventario.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Productos en la Orden</CardTitle>
              <CardDescription>
                {items.length} producto(s) agregado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay productos agregados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-5">Producto</div>
                    <div className="col-span-2 text-right">Cantidad</div>
                    <div className="col-span-2 text-right">Precio Unit.</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center py-2 border-b">
                      <div className="col-span-5 text-sm">{item.productName}</div>
                      <div className="col-span-2 text-right">{item.quantity}</div>
                      <div className="col-span-2 text-right">
                        ${item.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        ${item.totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateSubtotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA (16%):</span>
                      <span>${calculateTax().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>${calculateTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Dirección de Envío</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Dirección de entrega (opcional)"
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales (opcional)"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/orders">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading || items.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Guardando...' : 'Crear Orden'}
          </Button>
        </div>
      </form>
    </div>
  )
}
