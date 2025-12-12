'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ArrowLeft, Save, Plus, Trash2, Loader2, Check, ChevronsUpDown, Search } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  address: string | null
}

interface Product {
  id: string
  name: string
  brand: string | null
  model: string | null
  capacity: string | null
  unitPrice: number | null
  category: {
    id: string
    name: string
  }
}

interface OrderItem {
  productId: string
  product: Product | null
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  notes: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Data
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [orderType, setOrderType] = useState<string>('SALE')
  const [status, setStatus] = useState<string>('DRAFT')
  const [requiredDate, setRequiredDate] = useState<string>('')
  const [shippingAddress, setShippingAddress] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<OrderItem[]>([])

  // UI state
  const [clientOpen, setClientOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [clientsRes, productsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/products')
      ])

      const clientsData = await clientsRes.json()
      const productsData = await productsRes.json()

      if (clientsData.success) {
        setClients(clientsData.data)
      }
      if (productsData.success) {
        setProducts(productsData.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    if (!selectedProductId) return

    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    // Check if product already exists in items
    if (items.some(item => item.productId === selectedProductId)) {
      alert('Este producto ya está en la orden')
      return
    }

    const unitPrice = product.unitPrice || 0
    const newItem: OrderItem = {
      productId: product.id,
      product,
      quantity: 1,
      unitPrice,
      discount: 0,
      totalPrice: unitPrice,
      notes: ''
    }

    setItems([...items, newItem])
    setSelectedProductId('')
    setProductOpen(false)
  }

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate total
    const quantity = field === 'quantity' ? value : newItems[index].quantity
    const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice
    const discount = field === 'discount' ? value : newItems[index].discount
    newItems[index].totalPrice = (quantity * unitPrice) - discount

    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const taxRate = 0.16
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClientId) {
      alert('Selecciona un cliente')
      return
    }

    if (items.length === 0) {
      alert('Agrega al menos un producto')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          orderType,
          status,
          requiredDate: requiredDate || null,
          shippingAddress: shippingAddress || null,
          notes: notes || null,
          taxRate,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            notes: item.notes || null
          }))
        })
      })

      const result = await response.json()

      if (result.success) {
        router.push('/orders')
      } else {
        alert(result.error || 'Error al crear la orden')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error al crear la orden')
    } finally {
      setSaving(false)
    }
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Orden</h2>
          <p className="text-muted-foreground">Crea una nueva orden de venta o servicio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
              <CardDescription>Selecciona el cliente para esta orden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="w-full justify-between"
                  >
                    {selectedClient
                      ? `${selectedClient.firstName} ${selectedClient.lastName}`
                      : "Seleccionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.firstName} ${client.lastName} ${client.email}`}
                            onSelect={() => {
                              setSelectedClientId(client.id)
                              setClientOpen(false)
                              // Auto-fill shipping address if client has one
                              if (client.address && !shippingAddress) {
                                setShippingAddress(client.address)
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div>
                              <p className="font-medium">{client.firstName} {client.lastName}</p>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedClient && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p><strong>Email:</strong> {selectedClient.email}</p>
                  {selectedClient.phone && <p><strong>Teléfono:</strong> {selectedClient.phone}</p>}
                  {selectedClient.address && <p><strong>Dirección:</strong> {selectedClient.address}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Orden</CardTitle>
              <CardDescription>Información general de la orden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Orden</Label>
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
                <div className="space-y-2">
                  <Label>Estado Inicial</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha Requerida (opcional)</Label>
                <Input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Dirección de Envío</Label>
                <Textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Dirección de envío o instalación..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Agrega los productos o servicios para esta orden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Product */}
            <div className="flex gap-4">
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productOpen}
                    className="flex-1 justify-between"
                  >
                    {selectedProductId
                      ? products.find(p => p.id === selectedProductId)?.name
                      : "Buscar producto..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre, marca o modelo..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron productos.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.name} ${product.brand || ''} ${product.model || ''}`}
                            onSelect={() => {
                              setSelectedProductId(product.id)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.brand} {product.model} - {product.category.name}
                              </p>
                            </div>
                            {product.unitPrice && (
                              <span className="text-sm font-medium">
                                ${product.unitPrice.toLocaleString('es-MX')}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button type="button" onClick={addItem} disabled={!selectedProductId}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>

            {/* Items Table */}
            {items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Producto</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="w-[150px]">Precio Unit.</TableHead>
                      <TableHead className="w-[120px]">Descuento</TableHead>
                      <TableHead className="w-[150px] text-right">Total</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.product?.brand} {item.product?.model}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <p>No hay productos agregados</p>
                <p className="text-sm">Busca y agrega productos para crear la orden</p>
              </div>
            )}

            {/* Totals */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span>${taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
            <CardDescription>Notas adicionales para esta orden</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales, instrucciones especiales, etc..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/orders">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving || items.length === 0 || !selectedClientId}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Crear Orden
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
