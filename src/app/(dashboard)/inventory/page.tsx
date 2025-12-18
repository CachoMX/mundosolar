'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Package, AlertTriangle, TrendingUp, Loader2, RefreshCw, ScanBarcode, Minus, CheckCircle, Search, Upload, FileText, X, Eye, ArrowUpCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import BarcodeDisplay from 'react-barcode'
import Image from 'next/image'

interface InventoryData {
  summary: {
    totalProducts: number
    lowStock: number
    totalValue: number
    totalLocations: number
  }
  categories: {
    id: string
    name: string
    quantity: number
  }[]
  recentMovements: {
    id: string
    type: string
    quantity: number
    product: string
    fromLocation: string | null
    toLocation: string | null
    date: string
    reason: string | null
    notes: string | null
  }[]
}

interface ExitFormData {
  barcode: string
  quantity: number
  reason: string
  notes: string
}

interface FoundProduct {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  totalStock: number
  category: { name: string } | null
}

interface EntryFormData {
  productId: string
  locationId: string
  quantity: number
  serialNumber: string
  invoiceNumber: string
  purchaseDate: string
  supplier: string
  unitCost: string
  notes: string
}

interface NewProductData {
  name: string
  brand: string
  model: string
  capacity: string
  description: string
  barcode: string
  unitPrice: string
  categoryId: string
}

interface Location {
  id: string
  name: string
  address: string | null
}

interface Product {
  id: string
  name: string
  brand: string | null
  model: string | null
  barcode: string | null
  totalStock: number
  category: { name: string } | null
}

interface InventoryItem {
  id: string
  quantity: number
  serialNumber: string | null
  invoiceNumber: string | null
  invoiceUrl: string | null
  purchaseDate: string | null
  supplier: string | null
  unitCost: number | null
  totalCost: number | null
  notes: string | null
  createdAt: string
  product: {
    id: string
    name: string
    brand: string | null
    model: string | null
    barcode: string | null
  }
  location: {
    id: string
    name: string
  }
}

const fetchInventoryData = async (): Promise<InventoryData> => {
  const response = await fetch('/api/inventory')
  if (!response.ok) {
    throw new Error('Error al obtener datos del inventario')
  }
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error desconocido')
  }
  return result.data
}

const fetchCategories = async () => {
  const response = await fetch('/api/categories')
  if (!response.ok) return []
  const result = await response.json()
  return result.success ? result.data : []
}

const fetchLocations = async (): Promise<Location[]> => {
  const response = await fetch('/api/locations')
  if (!response.ok) return []
  const result = await response.json()
  return result.success ? result.data : []
}

const fetchProducts = async (): Promise<Product[]> => {
  const response = await fetch('/api/products')
  if (!response.ok) return []
  const result = await response.json()
  return result.success ? result.data : []
}

const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  const response = await fetch('/api/inventory/entries')
  if (!response.ok) return []
  const result = await response.json()
  return result.success ? result.data : []
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [processingExit, setProcessingExit] = useState(false)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [foundProduct, setFoundProduct] = useState<FoundProduct | null>(null)
  const [exitSuccess, setExitSuccess] = useState<string | null>(null)
  const [exitError, setExitError] = useState<string | null>(null)
  const exitBarcodeInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const [exitFormData, setExitFormData] = useState<ExitFormData>({
    barcode: '',
    quantity: 1,
    reason: '',
    notes: ''
  })

  // Entry dialog states
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [entryFormData, setEntryFormData] = useState<EntryFormData>({
    productId: '',
    locationId: '',
    quantity: 1,
    serialNumber: '',
    invoiceNumber: '',
    purchaseDate: '',
    supplier: '',
    unitCost: '',
    notes: ''
  })
  const [newProductData, setNewProductData] = useState<NewProductData>({
    name: '',
    brand: '',
    model: '',
    capacity: '',
    description: '',
    barcode: '',
    unitPrice: '',
    categoryId: ''
  })
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null)
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  // Detail dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const { data: inventoryData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventoryData,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const { data: inventoryItems = [], refetch: refetchItems } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: fetchInventoryItems,
  })

  // Exit dialog handlers
  const resetExitForm = () => {
    setExitFormData({ barcode: '', quantity: 1, reason: '', notes: '' })
    setFoundProduct(null)
    setExitSuccess(null)
    setExitError(null)
  }

  const handleExitDialogOpen = (open: boolean) => {
    setExitDialogOpen(open)
    if (open) {
      setTimeout(() => exitBarcodeInputRef.current?.focus(), 100)
    } else {
      resetExitForm()
    }
  }

  // Search product by barcode
  const searchProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return

    setSearchingProduct(true)
    setExitError(null)
    setFoundProduct(null)

    try {
      const response = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const product = result.data[0]
        setFoundProduct({
          id: product.id,
          name: product.name,
          brand: product.brand,
          barcode: product.barcode,
          totalStock: product.totalStock,
          category: product.category
        })
      } else {
        setExitError('Producto no encontrado con ese código de barras')
      }
    } catch (error) {
      setExitError('Error al buscar producto')
    } finally {
      setSearchingProduct(false)
    }
  }

  // Handle barcode input (auto-search on Enter or after scanner input)
  const handleExitBarcodeChange = (value: string) => {
    setExitFormData(prev => ({ ...prev, barcode: value }))
    setExitError(null)
    setFoundProduct(null)
  }

  const handleExitBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchProductByBarcode(exitFormData.barcode)
    }
  }

  // Process inventory exit
  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foundProduct || exitFormData.quantity <= 0) return

    setProcessingExit(true)
    setExitError(null)
    setExitSuccess(null)

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: exitFormData.barcode,
          quantity: exitFormData.quantity,
          reason: exitFormData.reason || 'Salida de inventario',
          notes: exitFormData.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        setExitSuccess(`Se descontaron ${exitFormData.quantity} unidades de ${foundProduct.name}. Stock restante: ${result.data.newTotalStock}`)
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        // Reset for next scan
        setExitFormData({ barcode: '', quantity: 1, reason: '', notes: '' })
        setFoundProduct(null)
        setTimeout(() => exitBarcodeInputRef.current?.focus(), 100)
      } else {
        setExitError(result.error || 'Error al procesar salida')
      }
    } catch (error) {
      setExitError('Error al procesar salida de inventario')
    } finally {
      setProcessingExit(false)
    }
  }

  // Entry dialog handlers
  const resetEntryForm = () => {
    setEntryFormData({
      productId: '',
      locationId: '',
      quantity: 1,
      serialNumber: '',
      invoiceNumber: '',
      purchaseDate: '',
      supplier: '',
      unitCost: '',
      notes: ''
    })
    setNewProductData({
      name: '',
      brand: '',
      model: '',
      capacity: '',
      description: '',
      barcode: '',
      unitPrice: '',
      categoryId: ''
    })
    setIsNewProduct(false)
    setInvoiceFile(null)
    setInvoicePreview(null)
    setEntrySuccess(null)
    setEntryError(null)
  }

  const handleEntryDialogOpen = (open: boolean) => {
    setEntryDialogOpen(open)
    if (!open) {
      resetEntryForm()
    }
  }

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setEntryError('Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF')
        return
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setEntryError('El archivo es muy grande. Máximo 10MB')
        return
      }
      setInvoiceFile(file)
      setEntryError(null)
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setInvoicePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setInvoicePreview(null)
      }
    }
  }

  const clearInvoice = () => {
    setInvoiceFile(null)
    setInvoicePreview(null)
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = ''
    }
  }

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate based on mode
    if (isNewProduct) {
      if (!newProductData.name || !newProductData.categoryId) {
        setEntryError('Nombre y categoría del producto son requeridos')
        return
      }
    } else {
      if (!entryFormData.productId) {
        setEntryError('Selecciona un producto')
        return
      }
    }

    if (!entryFormData.locationId || entryFormData.quantity <= 0) {
      setEntryError('Ubicación y cantidad son requeridos')
      return
    }

    setSavingEntry(true)
    setEntryError(null)
    setEntrySuccess(null)

    try {
      let productId = entryFormData.productId

      // If new product, create it first
      if (isNewProduct) {
        const productResponse = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProductData)
        })
        const productResult = await productResponse.json()
        if (!productResult.success) {
          throw new Error(productResult.error || 'Error al crear producto')
        }
        productId = productResult.data.id
      }

      // Upload invoice if present
      let invoiceUrl = null
      if (invoiceFile) {
        setUploadingInvoice(true)
        const formData = new FormData()
        formData.append('invoice', invoiceFile)

        const uploadResponse = await fetch('/api/inventory/upload-invoice', {
          method: 'POST',
          body: formData
        })
        const uploadResult = await uploadResponse.json()
        if (uploadResult.success) {
          invoiceUrl = uploadResult.data.invoiceUrl
        } else {
          throw new Error(uploadResult.error || 'Error al subir factura')
        }
        setUploadingInvoice(false)
      }

      // Create inventory entry
      const response = await fetch('/api/inventory/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          locationId: entryFormData.locationId,
          quantity: entryFormData.quantity,
          serialNumber: entryFormData.serialNumber || null,
          invoiceNumber: entryFormData.invoiceNumber || null,
          invoiceUrl,
          purchaseDate: entryFormData.purchaseDate || null,
          supplier: entryFormData.supplier || null,
          unitCost: entryFormData.unitCost ? parseFloat(entryFormData.unitCost) : null,
          notes: entryFormData.notes || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setEntrySuccess(result.message || 'Entrada de inventario registrada')
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        queryClient.invalidateQueries({ queryKey: ['inventoryItems'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        resetEntryForm()
      } else {
        setEntryError(result.error || 'Error al registrar entrada')
      }
    } catch (error: any) {
      setEntryError(error.message || 'Error al registrar entrada de inventario')
    } finally {
      setSavingEntry(false)
      setUploadingInvoice(false)
    }
  }

  // View item details
  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item)
    setDetailDialogOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'PURCHASE': 'Compra',
      'SALE': 'Venta',
      'TRANSFER': 'Transferencia',
      'ADJUSTMENT': 'Ajuste',
      'MAINTENANCE': 'Mantenimiento',
      'RETURN': 'Devolución'
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando datos del inventario...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Inventario</h2>
          <Button onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventario</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => handleExitDialogOpen(true)}>
            <Minus className="mr-2 h-4 w-4" />
            Ajuste de Inventario
          </Button>
          <Button variant="default" onClick={() => handleEntryDialogOpen(true)}>
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Entrada de Inventario
          </Button>
        </div>
      </div>

      {/* Inventory Exit Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={handleExitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Ajuste de Inventario
            </DialogTitle>
            <DialogDescription>
              Para ajustes manuales o correcciones de stock. Las salidas normales se descuentan automáticamente al crear órdenes.
            </DialogDescription>
          </DialogHeader>

          {exitSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {exitSuccess}
              </AlertDescription>
            </Alert>
          )}

          {exitError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{exitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleExitSubmit}>
            <div className="grid gap-4 py-4">
              {/* Barcode scan field */}
              <div className="space-y-2">
                <Label htmlFor="exit-barcode" className="flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Código de Barras
                </Label>
                <div className="flex gap-2">
                  <Input
                    ref={exitBarcodeInputRef}
                    id="exit-barcode"
                    value={exitFormData.barcode}
                    onChange={(e) => handleExitBarcodeChange(e.target.value)}
                    onKeyDown={handleExitBarcodeKeyDown}
                    placeholder="Escanea o ingresa el código"
                    className="font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => searchProductByBarcode(exitFormData.barcode)}
                    disabled={searchingProduct || !exitFormData.barcode}
                  >
                    {searchingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Presiona Enter o click en buscar después de escanear
                </p>
              </div>

              {/* Found product info */}
              {foundProduct && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{foundProduct.name}</h4>
                      {foundProduct.brand && (
                        <p className="text-sm text-muted-foreground">Marca: {foundProduct.brand}</p>
                      )}
                      {foundProduct.category && (
                        <p className="text-sm text-muted-foreground">Categoría: {foundProduct.category.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{foundProduct.totalStock}</p>
                      <p className="text-xs text-muted-foreground">en stock</p>
                    </div>
                  </div>
                  {foundProduct.barcode && (
                    <div className="mt-3 flex justify-center p-2 bg-white rounded border">
                      <BarcodeDisplay value={foundProduct.barcode} width={1.2} height={40} fontSize={10} />
                    </div>
                  )}
                </div>
              )}

              {/* Quantity field */}
              {foundProduct && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="exit-quantity">Cantidad a retirar</Label>
                    <Input
                      id="exit-quantity"
                      type="number"
                      min="1"
                      max={foundProduct.totalStock}
                      value={exitFormData.quantity}
                      onChange={(e) => setExitFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                    {exitFormData.quantity > foundProduct.totalStock && (
                      <p className="text-xs text-red-500">
                        La cantidad excede el stock disponible ({foundProduct.totalStock})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exit-reason">Razón (opcional)</Label>
                    <Input
                      id="exit-reason"
                      value={exitFormData.reason}
                      onChange={(e) => setExitFormData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Ej: Venta, Instalación, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exit-notes">Notas (opcional)</Label>
                    <Input
                      id="exit-notes"
                      value={exitFormData.notes}
                      onChange={(e) => setExitFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notas adicionales"
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleExitDialogOpen(false)}>
                Cerrar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!foundProduct || processingExit || exitFormData.quantity <= 0 || exitFormData.quantity > (foundProduct?.totalStock || 0)}
              >
                {processingExit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Minus className="mr-2 h-4 w-4" />}
                {processingExit ? 'Procesando...' : `Retirar ${exitFormData.quantity} unidad${exitFormData.quantity > 1 ? 'es' : ''}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={handleEntryDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5" />
              Entrada de Inventario
            </DialogTitle>
            <DialogDescription>
              Registra la entrada de productos al inventario. Puedes adjuntar la factura del proveedor.
            </DialogDescription>
          </DialogHeader>

          {entrySuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {entrySuccess}
              </AlertDescription>
            </Alert>
          )}

          {entryError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{entryError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEntrySubmit}>
            <div className="grid gap-4 py-4">
              {/* Product Type Toggle */}
              <div className="space-y-2">
                <Label>Producto *</Label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={!isNewProduct ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsNewProduct(false)
                      setEntryFormData(prev => ({ ...prev, productId: '' }))
                    }}
                  >
                    Producto existente
                  </Button>
                  <Button
                    type="button"
                    variant={isNewProduct ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsNewProduct(true)
                      setEntryFormData(prev => ({ ...prev, productId: '' }))
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo producto
                  </Button>
                </div>

                {!isNewProduct ? (
                  <Select
                    value={entryFormData.productId}
                    onValueChange={(v) => setEntryFormData(prev => ({ ...prev, productId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: Product) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.brand && `- ${p.brand}`} {p.model && `(${p.model})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    {/* Barcode */}
                    <div className="space-y-2">
                      <Label htmlFor="new-barcode" className="flex items-center gap-2">
                        <ScanBarcode className="h-4 w-4" />
                        Código de Barras
                      </Label>
                      <Input
                        ref={barcodeInputRef}
                        id="new-barcode"
                        value={newProductData.barcode}
                        onChange={(e) => setNewProductData(prev => ({ ...prev, barcode: e.target.value }))}
                        placeholder="Escanea o ingresa el código"
                        className="font-mono"
                      />
                      {newProductData.barcode && (
                        <div className="flex justify-center p-2 bg-white rounded border">
                          <BarcodeDisplay value={newProductData.barcode} width={1.2} height={40} fontSize={10} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name">Nombre *</Label>
                        <Input
                          id="new-name"
                          value={newProductData.name}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ej: Panel Solar 400W"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-category">Categoría *</Label>
                        <Select
                          value={newProductData.categoryId}
                          onValueChange={(v) => setNewProductData(prev => ({ ...prev, categoryId: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-brand">Marca</Label>
                        <Input
                          id="new-brand"
                          value={newProductData.brand}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="Ej: Canadian Solar"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-model">Modelo</Label>
                        <Input
                          id="new-model"
                          value={newProductData.model}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="Ej: CS6R-410MS"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-capacity">Capacidad</Label>
                        <Input
                          id="new-capacity"
                          value={newProductData.capacity}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, capacity: e.target.value }))}
                          placeholder="Ej: 400W, 6000W"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-price">Precio Venta (MXN)</Label>
                        <Input
                          id="new-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newProductData.unitPrice}
                          onChange={(e) => setNewProductData(prev => ({ ...prev, unitPrice: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-description">Descripción</Label>
                      <Input
                        id="new-description"
                        value={newProductData.description}
                        onChange={(e) => setNewProductData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción opcional"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location Selection */}
              <div className="space-y-2">
                <Label htmlFor="entry-location">Ubicación *</Label>
                <Select
                  value={entryFormData.locationId}
                  onValueChange={(v) => setEntryFormData(prev => ({ ...prev, locationId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc: Location) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.address && `- ${loc.address}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="entry-quantity">Cantidad *</Label>
                  <Input
                    id="entry-quantity"
                    type="number"
                    min="1"
                    value={entryFormData.quantity}
                    onChange={(e) => setEntryFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                {/* Unit Cost */}
                <div className="space-y-2">
                  <Label htmlFor="entry-unit-cost">Costo Unitario (MXN)</Label>
                  <Input
                    id="entry-unit-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={entryFormData.unitCost}
                    onChange={(e) => setEntryFormData(prev => ({ ...prev, unitCost: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Supplier */}
                <div className="space-y-2">
                  <Label htmlFor="entry-supplier">Proveedor</Label>
                  <Input
                    id="entry-supplier"
                    value={entryFormData.supplier}
                    onChange={(e) => setEntryFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Nombre del proveedor"
                  />
                </div>

                {/* Purchase Date */}
                <div className="space-y-2">
                  <Label htmlFor="entry-date">Fecha de Compra</Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={entryFormData.purchaseDate}
                    onChange={(e) => setEntryFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label htmlFor="entry-invoice">Número de Factura</Label>
                  <Input
                    id="entry-invoice"
                    value={entryFormData.invoiceNumber}
                    onChange={(e) => setEntryFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Ej: FAC-001234"
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <Label htmlFor="entry-serial">Número de Serie</Label>
                  <Input
                    id="entry-serial"
                    value={entryFormData.serialNumber}
                    onChange={(e) => setEntryFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Invoice Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Factura (archivo)
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {!invoiceFile ? (
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arrastra o selecciona un archivo
                      </p>
                      <Input
                        ref={invoiceInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleInvoiceChange}
                        className="hidden"
                        id="invoice-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => invoiceInputRef.current?.click()}
                      >
                        Seleccionar archivo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG, WEBP o PDF (máx. 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      {invoicePreview ? (
                        <div className="relative w-24 h-24 border rounded overflow-hidden">
                          <Image
                            src={invoicePreview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 border rounded flex items-center justify-center bg-muted">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{invoiceFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(invoiceFile.size / 1024).toFixed(1)} KB
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearInvoice}
                          className="mt-2 text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="entry-notes">Notas</Label>
                <Input
                  id="entry-notes"
                  value={entryFormData.notes}
                  onChange={(e) => setEntryFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleEntryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingEntry || (!isNewProduct && !entryFormData.productId) || (isNewProduct && (!newProductData.name || !newProductData.categoryId)) || !entryFormData.locationId || entryFormData.quantity <= 0}
              >
                {savingEntry ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingInvoice ? 'Subiendo factura...' : 'Guardando...'}
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Registrar Entrada
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inventory Item Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalle del Item de Inventario
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-semibold text-lg">{selectedItem.product.name}</h4>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  {selectedItem.product.brand && (
                    <p><span className="text-muted-foreground">Marca:</span> {selectedItem.product.brand}</p>
                  )}
                  {selectedItem.product.model && (
                    <p><span className="text-muted-foreground">Modelo:</span> {selectedItem.product.model}</p>
                  )}
                  <p><span className="text-muted-foreground">Ubicación:</span> {selectedItem.location.name}</p>
                  <p><span className="text-muted-foreground">Cantidad:</span> {selectedItem.quantity} unidades</p>
                </div>
              </div>

              {/* Invoice & Purchase Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Información de Compra</h5>
                  <div className="space-y-1 text-sm">
                    {selectedItem.supplier && (
                      <p><span className="text-muted-foreground">Proveedor:</span> {selectedItem.supplier}</p>
                    )}
                    {selectedItem.purchaseDate && (
                      <p><span className="text-muted-foreground">Fecha:</span> {new Date(selectedItem.purchaseDate).toLocaleDateString('es-MX')}</p>
                    )}
                    {selectedItem.unitCost !== null && (
                      <p><span className="text-muted-foreground">Costo Unitario:</span> {formatCurrency(selectedItem.unitCost)}</p>
                    )}
                    {selectedItem.totalCost !== null && (
                      <p><span className="text-muted-foreground">Costo Total:</span> {formatCurrency(selectedItem.totalCost)}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Factura</h5>
                  <div className="space-y-1 text-sm">
                    {selectedItem.invoiceNumber ? (
                      <p><span className="text-muted-foreground">Número:</span> {selectedItem.invoiceNumber}</p>
                    ) : (
                      <p className="text-muted-foreground">Sin número de factura</p>
                    )}
                    {selectedItem.invoiceUrl && (
                      <a
                        href={selectedItem.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver factura
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Serial & Notes */}
              {(selectedItem.serialNumber || selectedItem.notes) && (
                <div className="border-t pt-4">
                  {selectedItem.serialNumber && (
                    <p className="text-sm"><span className="text-muted-foreground">Número de Serie:</span> {selectedItem.serialNumber}</p>
                  )}
                  {selectedItem.notes && (
                    <p className="text-sm mt-2"><span className="text-muted-foreground">Notas:</span> {selectedItem.notes}</p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>Registrado: {new Date(selectedItem.createdAt).toLocaleString('es-MX')}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryData?.summary.totalProducts.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              En todas las ubicaciones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{inventoryData?.summary.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requieren reposición
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryData?.summary.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Inventario valorizado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ubicaciones</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryData?.summary.totalLocations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Almacenes activos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Categorías de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryData?.categories && inventoryData.categories.length > 0 ? (
              <div className="space-y-4">
                {inventoryData.categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">{category.quantity} unidades</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <p>No hay categorías configuradas</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
            <CardDescription>Últimos 10 movimientos de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryData?.recentMovements && inventoryData.recentMovements.length > 0 ? (
              <div className="space-y-3">
                {inventoryData.recentMovements.map((movement) => (
                  <div key={movement.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{getMovementTypeLabel(movement.type)}</span>
                          <span className="text-xs text-muted-foreground">
                            {movement.quantity} unidades
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{movement.product}</p>
                        {(movement.fromLocation || movement.toLocation) && (
                          <p className="text-xs text-muted-foreground">
                            {movement.fromLocation && `De: ${movement.fromLocation}`}
                            {movement.fromLocation && movement.toLocation && ' → '}
                            {movement.toLocation && `A: ${movement.toLocation}`}
                          </p>
                        )}
                        {movement.reason && (
                          <p className="text-xs text-muted-foreground italic">{movement.reason}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatDate(movement.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Sin movimientos recientes</h3>
                <p className="text-sm">No hay movimientos registrados en el sistema</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items de Inventario
          </CardTitle>
          <CardDescription>Lista de productos en inventario con detalles de factura y proveedor</CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Producto</th>
                    <th className="text-left py-3 px-2 font-medium">Ubicación</th>
                    <th className="text-center py-3 px-2 font-medium">Cantidad</th>
                    <th className="text-left py-3 px-2 font-medium">Proveedor</th>
                    <th className="text-left py-3 px-2 font-medium">Factura</th>
                    <th className="text-right py-3 px-2 font-medium">Costo Unit.</th>
                    <th className="text-center py-3 px-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          {item.product.brand && (
                            <p className="text-xs text-muted-foreground">{item.product.brand} {item.product.model && `- ${item.product.model}`}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">{item.location.name}</td>
                      <td className="py-3 px-2 text-center font-medium">{item.quantity}</td>
                      <td className="py-3 px-2">{item.supplier || '-'}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {item.invoiceNumber || '-'}
                          {item.invoiceUrl && (
                            <a
                              href={item.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver factura"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {item.unitCost !== null ? formatCurrency(item.unitCost) : '-'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventoryItems.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Mostrando 20 de {inventoryItems.length} items
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Sin items de inventario</h3>
              <p className="text-sm mb-4">Agrega productos al inventario para verlos aquí</p>
              <Button onClick={() => handleEntryDialogOpen(true)}>
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Agregar Entrada
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
