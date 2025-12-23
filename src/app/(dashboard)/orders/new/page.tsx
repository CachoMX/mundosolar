'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
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
import { ArrowLeft, Save, Plus, Trash2, Loader2, Check, ChevronsUpDown, Search, ScanBarcode, Zap, CreditCard, DollarSign, MapPin, Percent, Calendar } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ClientAddress {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  neighborhood: string | null
  isDefault: boolean
}

interface CfeReceipt {
  id: string
  name: string | null
  addressId: string | null
  rpu: string | null
  serviceNumber: string | null
  meterNumber: string | null
  rmu: string | null
  accountNumber: string | null
  meterType: string | null
  tariff: string | null
  phases: number | null
  wires: number | null
  installedLoad: number | null
  contractedDemand: number | null
  voltageLevel: number | null
  mediumVoltage: boolean
  cfeBranch: string | null
  cfeFolio: string | null
  address?: {
    id: string
    name: string
  } | null
}

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  addresses: ClientAddress[]
  cfeReceipts: CfeReceipt[]
}

interface Product {
  id: string
  name: string
  brand: string | null
  model: string | null
  capacity: string | null
  unitPrice: number | null
  barcode: string | null
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
  serialNumbers: string[] // Números de serie escaneados
}

export default function NewOrderPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Data
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [selectedCfeReceiptId, setSelectedCfeReceiptId] = useState<string>('')
  const [orderType, setOrderType] = useState<string>('SALE')
  const [status, setStatus] = useState<string>('DRAFT')
  const [requiredDate, setRequiredDate] = useState<string>('')
  const [shippingAddress, setShippingAddress] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [items, setItems] = useState<OrderItem[]>([])

  // Payment/Deposit state
  const [depositRequired, setDepositRequired] = useState<boolean>(false)
  const [depositPercentage, setDepositPercentage] = useState<number>(50)
  const [registerPaymentNow, setRegisterPaymentNow] = useState<boolean>(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFER')
  const [paymentReference, setPaymentReference] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('')
  const [paymentType, setPaymentType] = useState<string>('PARTIAL')

  // Card details state (when payment method is CARD)
  const [cardNumber, setCardNumber] = useState<string>('')
  const [cardHolderName, setCardHolderName] = useState<string>('')
  const [cardExpiry, setCardExpiry] = useState<string>('')
  const [cardCvv, setCardCvv] = useState<string>('')

  // Card helper functions
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2)
    }
    return digits
  }

  const validateLuhn = (cardNum: string) => {
    const digits = cardNum.replace(/\D/g, '')
    if (digits.length !== 16) return false

    let sum = 0
    for (let i = 0; i < digits.length; i++) {
      let digit = parseInt(digits[i])
      if ((digits.length - i) % 2 === 0) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
    }
    return sum % 10 === 0
  }

  const getCardBrand = (cardNum: string) => {
    const digits = cardNum.replace(/\D/g, '')
    if (digits.startsWith('4')) return 'VISA'
    if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'MASTERCARD'
    if (/^3[47]/.test(digits)) return 'AMEX'
    return 'OTHER'
  }

  const getMaskedCardNumber = () => {
    const digits = cardNumber.replace(/\D/g, '')
    if (digits.length >= 4) {
      return `****${digits.slice(-4)}`
    }
    return '****'
  }

  // Financing state
  const [financingEnabled, setFinancingEnabled] = useState<boolean>(false)
  const [financingMonths, setFinancingMonths] = useState<number>(12)
  const [interestRate, setInterestRate] = useState<number>(0)

  // UI state
  const [clientOpen, setClientOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [barcodeInput, setBarcodeInput] = useState<string>('')
  const [barcodeSearching, setBarcodeSearching] = useState(false)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)

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

  // Search product by serialNumber (barcode) in inventory entries
  const searchByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return

    setBarcodeSearching(true)
    setBarcodeError(null)

    try {
      // Search by serialNumber in inventory entries
      const response = await fetch(`/api/inventory/entries?serialNumber=${encodeURIComponent(barcode)}`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const inventoryItem = result.data[0]
        // Create a product-like object from inventory item data
        const productFromInventory = {
          id: inventoryItem.product.id,
          name: inventoryItem.product.name,
          brand: inventoryItem.product.brand,
          model: inventoryItem.product.model,
          capacity: inventoryItem.product.capacity || null,
          unitPrice: inventoryItem.unitCost,
          barcode: barcode || null,
          category: inventoryItem.product.category,
          totalStock: inventoryItem.quantity
        }
        addProductToOrder(productFromInventory as Product, barcode)
        setBarcodeInput('')
      } else {
        setBarcodeError('No se encontró un item de inventario con ese código de barras')
      }
    } catch (error) {
      setBarcodeError('Error al buscar producto')
    } finally {
      setBarcodeSearching(false)
    }
  }

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchByBarcode(barcodeInput)
    }
  }

  const addProductToOrder = (product: Product, scannedBarcode?: string) => {
    // Check if product already exists in items
    const existingIndex = items.findIndex(item => item.productId === product.id)

    if (existingIndex !== -1) {
      // Increment quantity and add serial number if provided
      const newItems = [...items]
      newItems[existingIndex].quantity += 1
      newItems[existingIndex].totalPrice =
        (newItems[existingIndex].quantity * newItems[existingIndex].unitPrice) - newItems[existingIndex].discount

      // Add serial number if it was scanned and not already in the list
      if (scannedBarcode && !newItems[existingIndex].serialNumbers.includes(scannedBarcode)) {
        newItems[existingIndex].serialNumbers = [...newItems[existingIndex].serialNumbers, scannedBarcode]
      }
      setItems(newItems)
    } else {
      // Add new item
      const unitPrice = product.unitPrice || 0
      const newItem: OrderItem = {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice,
        discount: 0,
        totalPrice: unitPrice,
        notes: '',
        serialNumbers: scannedBarcode ? [scannedBarcode] : []
      }
      setItems([...items, newItem])
    }
  }

  const addItem = () => {
    if (!selectedProductId) return

    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    addProductToOrder(product)
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
  const depositAmount = depositRequired ? (total * depositPercentage / 100) : 0

  // Calculate financing
  const amountToFinance = depositRequired ? (total - depositAmount) : total
  const interestAmount = financingEnabled ? (amountToFinance * interestRate / 100) : 0
  const totalWithInterest = amountToFinance + interestAmount
  const monthlyPayment = financingEnabled && financingMonths > 0 ? (totalWithInterest / financingMonths) : 0

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
          addressId: selectedAddressId === 'main-address' ? null : (selectedAddressId || null),
          cfeReceiptId: selectedCfeReceiptId || null,
          orderType,
          status,
          requiredDate: requiredDate || null,
          shippingAddress: shippingAddress || null,
          notes: notes || null,
          taxRate,
          // Payment/deposit info
          depositRequired,
          depositPercentage: depositRequired ? depositPercentage : null,
          depositAmount: depositRequired ? depositAmount : null,
          // Financing info
          financingEnabled,
          financingMonths: financingEnabled ? financingMonths : null,
          interestRate: financingEnabled ? interestRate : null,
          interestAmount: financingEnabled ? interestAmount : null,
          monthlyPayment: financingEnabled ? monthlyPayment : null,
          // Initial payment if registering now
          initialPayment: registerPaymentNow ? {
            amount: depositRequired ? depositAmount : parseFloat(initialPaymentAmount) || 0,
            paymentType: depositRequired ? 'DEPOSIT' : paymentType,
            paymentMethod,
            referenceNumber: paymentReference || null,
            notes: paymentMethod === 'CARD'
              ? `${paymentNotes ? paymentNotes + ' | ' : ''}Tarjeta: ${getCardBrand(cardNumber)} ${getMaskedCardNumber()} - ${cardHolderName || 'N/A'} - Exp: ${cardExpiry}`
              : (paymentNotes || null),
            // Card details for reference (only store masked/safe data)
            cardDetails: paymentMethod === 'CARD' ? {
              holderName: cardHolderName || null,
              lastFour: cardNumber.replace(/\D/g, '').slice(-4) || null,
              brand: getCardBrand(cardNumber) || null,
              expiry: cardExpiry || null,
            } : null,
          } : null,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            notes: item.notes || null,
            serialNumbers: item.serialNumbers
          }))
        })
      })

      const result = await response.json()

      if (result.success) {
        // Invalidar cache de órdenes para que se actualice la lista
        await queryClient.invalidateQueries({ queryKey: ['orders'] })
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
                              // Auto-fill shipping address from main address in clients table
                              if ((client.address || client.city) && !shippingAddress) {
                                const addressParts = [
                                  client.address,
                                  client.neighborhood && `Col. ${client.neighborhood}`,
                                  client.city,
                                  client.state,
                                  client.postalCode && `C.P. ${client.postalCode}`,
                                  'México'
                                ].filter(Boolean)
                                setShippingAddress(addressParts.join(', '))
                                // Auto-select the main address
                                setSelectedAddressId('main-address')
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
                <div className="bg-muted p-3 rounded-lg text-sm space-y-3">
                  <p><strong>Email:</strong> {selectedClient.email}</p>
                  {selectedClient.phone && <p><strong>Teléfono:</strong> {selectedClient.phone}</p>}

                  {/* Address Selection Section */}
                  {((selectedClient.address || selectedClient.city) || (selectedClient.addresses && selectedClient.addresses.length > 0)) && (
                    <div className="pt-2 border-t border-border mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <strong>Dirección de Entrega:</strong>
                      </div>
                      <Select
                        value={selectedAddressId || undefined}
                        onValueChange={(value) => {
                          setSelectedAddressId(value)
                          // Auto-fill shipping address based on selection
                          if (value === 'main-address') {
                            const addressParts = [
                              selectedClient.address,
                              selectedClient.neighborhood && `Col. ${selectedClient.neighborhood}`,
                              selectedClient.city,
                              selectedClient.state,
                              selectedClient.postalCode && `C.P. ${selectedClient.postalCode}`,
                              'México'
                            ].filter(Boolean)
                            setShippingAddress(addressParts.join(', '))
                          } else {
                            const addr = selectedClient.addresses?.find(a => a.id === value)
                            if (addr) {
                              const addressParts = [
                                addr.address,
                                addr.neighborhood && `Col. ${addr.neighborhood}`,
                                addr.city,
                                addr.state,
                                addr.postalCode && `C.P. ${addr.postalCode}`,
                                'México'
                              ].filter(Boolean)
                              setShippingAddress(addressParts.join(', '))
                            }
                          }
                          // Reset CFE receipt selection when address changes
                          setSelectedCfeReceiptId('')
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue placeholder="Seleccionar dirección..." />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Main address from clients table */}
                          {(selectedClient.address || selectedClient.city) && (
                            <SelectItem value="main-address">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedClient.city || 'Dirección Principal'}</span>
                                <span className="text-xs text-muted-foreground">(Principal)</span>
                              </div>
                            </SelectItem>
                          )}
                          {/* Additional addresses from client_addresses */}
                          {selectedClient.addresses?.map((addr) => (
                            <SelectItem key={addr.id} value={addr.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{addr.name || addr.city || 'Sin nombre'}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Show selected address details */}
                      {selectedAddressId === 'main-address' && (
                        <div className="mt-2 text-muted-foreground text-xs space-y-0.5">
                          {selectedClient.address && <p>{selectedClient.address}</p>}
                          {selectedClient.neighborhood && <p>Col. {selectedClient.neighborhood}</p>}
                          <p>
                            {[selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}
                            {selectedClient.postalCode && ` - C.P. ${selectedClient.postalCode}`}
                          </p>
                        </div>
                      )}
                      {selectedAddressId && selectedAddressId !== 'main-address' && (() => {
                        const addr = selectedClient.addresses?.find(a => a.id === selectedAddressId)
                        return addr && (
                          <div className="mt-2 text-muted-foreground text-xs space-y-0.5">
                            {addr.address && <p>{addr.address}</p>}
                            {addr.neighborhood && <p>Col. {addr.neighborhood}</p>}
                            <p>
                              {[addr.city, addr.state].filter(Boolean).join(', ')}
                              {addr.postalCode && ` - C.P. ${addr.postalCode}`}
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* CFE Meter Selection Section */}
                  {selectedClient.cfeReceipts && selectedClient.cfeReceipts.length > 0 && (
                    <div className="pt-2 border-t border-border mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <strong>Medidor CFE:</strong>
                      </div>
                      {selectedClient.cfeReceipts.length === 1 ? (
                        // Single meter - show directly
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                          {selectedClient.cfeReceipts[0].name && (
                            <p className="col-span-2 font-medium text-foreground mb-1">{selectedClient.cfeReceipts[0].name}</p>
                          )}
                          {selectedClient.cfeReceipts[0].rpu && (
                            <p><span className="font-medium text-foreground">RPU:</span> {selectedClient.cfeReceipts[0].rpu}</p>
                          )}
                          {selectedClient.cfeReceipts[0].serviceNumber && (
                            <p><span className="font-medium text-foreground">N° Servicio:</span> {selectedClient.cfeReceipts[0].serviceNumber}</p>
                          )}
                          {selectedClient.cfeReceipts[0].meterNumber && (
                            <p><span className="font-medium text-foreground">N° Medidor:</span> {selectedClient.cfeReceipts[0].meterNumber}</p>
                          )}
                          {selectedClient.cfeReceipts[0].tariff && (
                            <p><span className="font-medium text-foreground">Tarifa:</span> {selectedClient.cfeReceipts[0].tariff}</p>
                          )}
                        </div>
                      ) : (
                        // Multiple meters - show selector
                        <>
                          <Select
                            value={selectedCfeReceiptId}
                            onValueChange={setSelectedCfeReceiptId}
                          >
                            <SelectTrigger className="bg-white dark:bg-gray-900">
                              <SelectValue placeholder="Seleccionar medidor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedClient.cfeReceipts
                                .filter(cfe => !selectedAddressId || !cfe.addressId || cfe.addressId === selectedAddressId)
                                .map((cfe) => (
                                  <SelectItem key={cfe.id} value={cfe.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{cfe.name || `Medidor ${cfe.meterNumber || cfe.rpu || cfe.id.slice(-4)}`}</span>
                                      {cfe.address && <span className="text-xs text-muted-foreground">({cfe.address.name})</span>}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {selectedCfeReceiptId && (() => {
                            const cfe = selectedClient.cfeReceipts.find(c => c.id === selectedCfeReceiptId)
                            return cfe && (
                              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
                                {cfe.rpu && <p><span className="font-medium text-foreground">RPU:</span> {cfe.rpu}</p>}
                                {cfe.serviceNumber && <p><span className="font-medium text-foreground">N° Servicio:</span> {cfe.serviceNumber}</p>}
                                {cfe.meterNumber && <p><span className="font-medium text-foreground">N° Medidor:</span> {cfe.meterNumber}</p>}
                                {cfe.tariff && <p><span className="font-medium text-foreground">Tarifa:</span> {cfe.tariff}</p>}
                                {cfe.phases && <p><span className="font-medium text-foreground">Fases:</span> {cfe.phases}</p>}
                                {cfe.installedLoad && <p><span className="font-medium text-foreground">Carga:</span> {cfe.installedLoad} kW</p>}
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </div>
                  )}
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
            {/* Barcode Scanner Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ScanBarcode className="h-4 w-4" />
                Escanear Código de Barras
              </Label>
              <div className="flex gap-2">
                <Input
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value)
                    setBarcodeError(null)
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Escanea o ingresa el código de barras"
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => searchByBarcode(barcodeInput)}
                  disabled={barcodeSearching || !barcodeInput}
                >
                  {barcodeSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {barcodeError && (
                <p className="text-sm text-red-500">{barcodeError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Presiona Enter después de escanear para agregar el producto automáticamente
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">o buscar manualmente</span>
              </div>
            </div>

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
                            {item.serialNumbers.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs text-muted-foreground font-medium">Seriales:</p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
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
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
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
                            onFocus={(e) => e.target.select()}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity * item.unitPrice}
                              step="0.01"
                              value={item.discount}
                              onChange={(e) => {
                                const maxDiscount = item.quantity * item.unitPrice
                                const value = Math.min(parseFloat(e.target.value) || 0, maxDiscount)
                                updateItem(index, 'discount', value)
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-28 pl-7"
                            />
                          </div>
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

        {/* Payment/Deposit Section */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Configuración de Pagos
              </CardTitle>
              <CardDescription>Configura el anticipo y forma de pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Subtotal</p>
                  <p className="text-lg font-semibold">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">IVA (16%)</p>
                  <p className="text-lg font-semibold">${taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Total</p>
                  <p className="text-lg font-bold text-primary">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                {depositRequired && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Anticipo ({depositPercentage}%)</p>
                    <p className="text-lg font-bold text-green-600">${depositAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {financingEnabled && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Pago Mensual ({financingMonths} meses)</p>
                    <p className="text-lg font-bold text-purple-600">${monthlyPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>

              {/* Options row */}
              <div className="flex flex-wrap gap-6">
                {/* Dejará anticipo checkbox */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="deposit-switch"
                    checked={depositRequired}
                    onCheckedChange={setDepositRequired}
                  />
                  <Label htmlFor="deposit-switch" className="cursor-pointer">
                    ¿Dejará anticipo?
                  </Label>
                </div>

                {/* Financiamiento checkbox */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="financing-switch"
                    checked={financingEnabled}
                    onCheckedChange={setFinancingEnabled}
                  />
                  <Label htmlFor="financing-switch" className="cursor-pointer">
                    ¿Requiere financiamiento?
                  </Label>
                </div>
              </div>

              {depositRequired && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Porcentaje de Anticipo</Label>
                      <Select value={depositPercentage.toString()} onValueChange={(v) => setDepositPercentage(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30%</SelectItem>
                          <SelectItem value="40">40%</SelectItem>
                          <SelectItem value="50">50%</SelectItem>
                          <SelectItem value="60">60%</SelectItem>
                          <SelectItem value="70">70%</SelectItem>
                          <SelectItem value="100">100% (Pago total)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Monto de Anticipo</Label>
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-md border">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">
                          ${depositAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span>Saldo restante:</span>
                    <span className="font-medium">${(total - depositAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Register Payment Now */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="payment-now-switch"
                      checked={registerPaymentNow}
                      onCheckedChange={setRegisterPaymentNow}
                    />
                    <Label htmlFor="payment-now-switch" className="cursor-pointer">
                      Registrar pago del anticipo ahora
                    </Label>
                  </div>

                  {registerPaymentNow && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <div className="space-y-2">
                        <Label>Método de Pago</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="bg-white dark:bg-gray-900">
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
                      <div className="space-y-2">
                        <Label>No. Referencia (opcional)</Label>
                        <Input
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Ej: TRANS-12345"
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>

                      {/* Card Details - Only show when CARD is selected */}
                      {paymentMethod === 'CARD' && (
                        <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="col-span-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-medium">
                              <CreditCard className="h-4 w-4" />
                              Datos de la Tarjeta
                            </div>
                            {cardNumber.replace(/\D/g, '').length >= 4 && (
                              <Badge variant="outline" className="text-xs">
                                {getCardBrand(cardNumber)}
                              </Badge>
                            )}
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Número de Tarjeta *</Label>
                            <Input
                              value={formatCardNumber(cardNumber)}
                              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                              className={`bg-white dark:bg-gray-900 font-mono ${
                                cardNumber.replace(/\D/g, '').length === 16 && !validateLuhn(cardNumber)
                                  ? 'border-red-500'
                                  : ''
                              }`}
                            />
                            {cardNumber.replace(/\D/g, '').length === 16 && !validateLuhn(cardNumber) && (
                              <p className="text-xs text-red-500">Número de tarjeta inválido</p>
                            )}
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Nombre del Titular *</Label>
                            <Input
                              value={cardHolderName}
                              onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                              placeholder="NOMBRE COMO APARECE EN LA TARJETA"
                              className="bg-white dark:bg-gray-900 uppercase"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha de Expiración *</Label>
                            <Input
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="bg-white dark:bg-gray-900 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CVV/CVC *</Label>
                            <Input
                              type="password"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="123"
                              maxLength={4}
                              className="bg-white dark:bg-gray-900 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div className="col-span-2 space-y-2">
                        <Label>Concepto/Descripción (opcional)</Label>
                        <Input
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Concepto o descripción del pago..."
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Financing Section */}
              {financingEnabled && (
                <div className="space-y-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Configuración de Financiamiento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número de Meses</Label>
                      <Select value={financingMonths.toString()} onValueChange={(v) => setFinancingMonths(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="6">6 meses</SelectItem>
                          <SelectItem value="9">9 meses</SelectItem>
                          <SelectItem value="12">12 meses</SelectItem>
                          <SelectItem value="18">18 meses</SelectItem>
                          <SelectItem value="24">24 meses</SelectItem>
                          <SelectItem value="36">36 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tasa de Interés</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={interestRate}
                          onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Financing Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-white dark:bg-gray-900 rounded-lg mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Monto a Financiar</p>
                      <p className="font-semibold">${amountToFinance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Interés ({interestRate}%)</p>
                      <p className="font-semibold">${interestAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total con Interés</p>
                      <p className="font-semibold text-purple-600">${totalWithInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pago Mensual</p>
                      <p className="font-bold text-lg text-purple-600">${monthlyPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    * El financiamiento se calcula sobre {depositRequired ? 'el saldo restante después del anticipo' : 'el total de la orden'}
                  </p>
                </div>
              )}

              {/* Register Payment Section - when no deposit */}
              {!depositRequired && (
                <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Registrar Pago Inicial</span>
                    </div>
                    <Switch
                      id="payment-switch"
                      checked={registerPaymentNow}
                      onCheckedChange={setRegisterPaymentNow}
                    />
                  </div>

                  {registerPaymentNow && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Monto del Pago *</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={initialPaymentAmount}
                              onChange={(e) => setInitialPaymentAmount(e.target.value)}
                              placeholder="0.00"
                              className="pl-9 bg-white dark:bg-gray-900"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Pago</Label>
                          <Select value={paymentType} onValueChange={setPaymentType}>
                            <SelectTrigger className="bg-white dark:bg-gray-900">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DEPOSIT">Anticipo</SelectItem>
                              <SelectItem value="PARTIAL">Abono</SelectItem>
                              <SelectItem value="FINAL">Liquidación</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Método de Pago</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="bg-white dark:bg-gray-900">
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
                        <div className="space-y-2">
                          <Label>No. Referencia (opcional)</Label>
                          <Input
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Ej: TRANS-12345"
                            className="bg-white dark:bg-gray-900"
                          />
                        </div>
                      </div>

                      {/* Card Details - Only show when CARD is selected */}
                      {paymentMethod === 'CARD' && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="col-span-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-medium">
                              <CreditCard className="h-4 w-4" />
                              Datos de la Tarjeta
                            </div>
                            {cardNumber.replace(/\D/g, '').length >= 4 && (
                              <Badge variant="outline" className="text-xs">
                                {getCardBrand(cardNumber)}
                              </Badge>
                            )}
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Número de Tarjeta *</Label>
                            <Input
                              value={formatCardNumber(cardNumber)}
                              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                              className={`bg-white dark:bg-gray-900 font-mono ${
                                cardNumber.replace(/\D/g, '').length === 16 && !validateLuhn(cardNumber)
                                  ? 'border-red-500'
                                  : ''
                              }`}
                            />
                            {cardNumber.replace(/\D/g, '').length === 16 && !validateLuhn(cardNumber) && (
                              <p className="text-xs text-red-500">Número de tarjeta inválido</p>
                            )}
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label>Nombre del Titular *</Label>
                            <Input
                              value={cardHolderName}
                              onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                              placeholder="NOMBRE COMO APARECE EN LA TARJETA"
                              className="bg-white dark:bg-gray-900 uppercase"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha de Expiración *</Label>
                            <Input
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="bg-white dark:bg-gray-900 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CVV/CVC *</Label>
                            <Input
                              type="password"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="123"
                              maxLength={4}
                              className="bg-white dark:bg-gray-900 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Concepto/Descripción (opcional)</Label>
                        <Input
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="Concepto o descripción del pago..."
                          className="bg-white dark:bg-gray-900"
                        />
                      </div>
                      {initialPaymentAmount && parseFloat(initialPaymentAmount) > 0 && (
                        <div className="flex justify-between text-sm p-2 bg-white dark:bg-gray-900 rounded-lg">
                          <span>Saldo después del pago:</span>
                          <span className="font-medium text-green-600">
                            ${(total - parseFloat(initialPaymentAmount)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
