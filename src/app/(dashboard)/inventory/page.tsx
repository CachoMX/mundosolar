'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Package, AlertTriangle, TrendingUp, Loader2, RefreshCw, ScanBarcode, Minus, CheckCircle, Search } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import BarcodeDisplay from 'react-barcode'

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

interface ProductFormData {
  name: string
  brand: string
  model: string
  capacity: string
  description: string
  barcode: string
  unitPrice: string
  categoryId: string
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

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [processingExit, setProcessingExit] = useState(false)
  const [searchingProduct, setSearchingProduct] = useState(false)
  const [foundProduct, setFoundProduct] = useState<FoundProduct | null>(null)
  const [exitSuccess, setExitSuccess] = useState<string | null>(null)
  const [exitError, setExitError] = useState<string | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const exitBarcodeInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    brand: '',
    model: '',
    capacity: '',
    description: '',
    barcode: '',
    unitPrice: '',
    categoryId: ''
  })

  const [exitFormData, setExitFormData] = useState<ExitFormData>({
    barcode: '',
    quantity: 1,
    reason: '',
    notes: ''
  })

  const { data: inventoryData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventoryData,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Error al crear producto')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDialogOpen(false)
      resetForm()
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      model: '',
      capacity: '',
      description: '',
      barcode: '',
      unitPrice: '',
      categoryId: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createProductMutation.mutateAsync(formData)
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Error al crear producto')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Focus on barcode input when dialog opens
  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open)
    if (open) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100)
    } else {
      resetForm()
    }
  }

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
          <Button onClick={() => handleDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Producto</DialogTitle>
            <DialogDescription>
              Ingresa los datos del producto. Puedes escanear el código de barras con un lector USB.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Barcode Field - First for scanner focus */}
              <div className="space-y-2">
                <Label htmlFor="barcode" className="flex items-center gap-2">
                  <ScanBarcode className="h-4 w-4" />
                  Código de Barras
                </Label>
                <Input
                  ref={barcodeInputRef}
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Escanea o ingresa el código de barras"
                  className="font-mono"
                />
                {formData.barcode && (
                  <div className="flex justify-center p-4 bg-white rounded border">
                    <BarcodeDisplay value={formData.barcode} width={1.5} height={50} fontSize={12} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Panel Solar 400W"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={formData.categoryId} onValueChange={(v) => handleInputChange('categoryId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
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
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Ej: Canadian Solar"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="Ej: CS6R-410MS"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad</Label>
                  <Input
                    id="capacity"
                    value={formData.capacity}
                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                    placeholder="Ej: 400W, 6000W"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Precio Unitario (MXN)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción opcional del producto"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formData.name || !formData.categoryId}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {saving ? 'Guardando...' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
