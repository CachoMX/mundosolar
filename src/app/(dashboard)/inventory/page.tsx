'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Package, AlertTriangle, TrendingUp, Loader2, RefreshCw, ScanBarcode, Minus, CheckCircle, Search, Upload, FileText, X, Eye, ArrowUpCircle, MapPin, Layers, ChevronRight, ChevronDown } from 'lucide-react'
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
  serialNumber: string | null
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
  subCategoryId: string
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
  category: { id: string; name: string } | null
  subCategory: { id: string; name: string } | null
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
    subCategory: { id: string; name: string } | null
  }
  location: {
    id: string
    name: string
  }
}

// Interfaz para items agrupados
interface BrandBreakdown {
  brand: string | null
  quantity: number
  totalCost: number
}

// Configuración de umbrales de stock
const LOW_STOCK_THRESHOLD = 10 // Stock bajo cuando total < 10
const LOW_STOCK_LOCATION_THRESHOLD = 5 // Stock bajo por ubicación cuando < 5

interface LocationStock {
  locationId: string
  locationName: string
  quantity: number
  isLowStock: boolean
}

interface GroupedInventoryItem {
  groupKey: string
  productId: string
  productName: string
  productBrand: string | null // Marca principal (para compatibilidad)
  productModel: string | null
  productSubCategory: string | null // Subcategoría del producto
  unitCost: number | null
  totalQuantity: number
  totalCost: number
  locationCount: number
  items: InventoryItem[]
  brands: BrandBreakdown[] // Desglose por marca
  isLowStock: boolean // true cuando totalQuantity < LOW_STOCK_THRESHOLD
  locationStocks: LocationStock[] // Stock por ubicación con indicador de stock bajo
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
    categoryId: '',
    subCategoryId: ''
  })
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null)
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  // Estado para múltiples códigos de barras (uno por unidad)
  const [serialNumbers, setSerialNumbers] = useState<string[]>([])
  // Estado para selección de producto por nombre y luego marca
  const [selectedProductName, setSelectedProductName] = useState<string>('')

  // Detail dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [selectedGroupedItem, setSelectedGroupedItem] = useState<GroupedInventoryItem | null>(null)
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())

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

  // Search inventory item by serialNumber (barcode)
  const searchProductByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return

    setSearchingProduct(true)
    setExitError(null)
    setFoundProduct(null)

    try {
      // Search by serialNumber in inventory entries
      const response = await fetch(`/api/inventory/entries?serialNumber=${encodeURIComponent(barcode)}`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const inventoryItem = result.data[0]
        setFoundProduct({
          id: inventoryItem.product.id,
          name: inventoryItem.product.name,
          brand: inventoryItem.product.brand,
          serialNumber: inventoryItem.serialNumber,
          totalStock: inventoryItem.quantity,
          category: inventoryItem.product.category
        })
      } else {
        setExitError('No se encontró un item de inventario con ese código de barras')
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
      categoryId: '',
      subCategoryId: ''
    })
    setIsNewProduct(false)
    setInvoiceFile(null)
    setInvoicePreview(null)
    setEntrySuccess(null)
    setEntryError(null)
    setSerialNumbers([]) // Limpiar códigos de barras múltiples
    setSelectedProductName('') // Limpiar selección de nombre de producto
  }

  // Reset solo campos de nuevo producto (mantiene isNewProduct = true)
  const resetNewProductFields = () => {
    setNewProductData({
      name: '',
      brand: '',
      model: '',
      capacity: '',
      description: '',
      barcode: '',
      unitPrice: '',
      categoryId: '',
      subCategoryId: ''
    })
    setEntryFormData(prev => ({
      ...prev,
      productId: '',
      quantity: 1,
      serialNumber: '',
      invoiceNumber: '',
      purchaseDate: '',
      supplier: '',
      unitCost: '',
      notes: ''
    }))
    setInvoiceFile(null)
    setInvoicePreview(null)
    setSerialNumbers([])
    // NO resetear isNewProduct ni locationId para facilitar agregar más productos
  }

  // Handler para cambio de cantidad - actualiza array de códigos de barras
  const handleQuantityChange = (newQuantity: number) => {
    setEntryFormData(prev => ({ ...prev, quantity: newQuantity }))
    // Solo crear array si la categoría requiere códigos de barras
    if (showsBarcodeField() && newQuantity > 1) {
      setSerialNumbers(prev => {
        const newArr = [...prev]
        // Ajustar tamaño del array
        while (newArr.length < newQuantity) {
          newArr.push('')
        }
        return newArr.slice(0, newQuantity)
      })
    } else if (newQuantity <= 1) {
      setSerialNumbers([])
    }
  }

  // Handler para actualizar un código de barras específico
  const handleSerialNumberChange = (index: number, value: string) => {
    setSerialNumbers(prev => {
      const newArr = [...prev]
      newArr[index] = value
      return newArr
    })
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

    // Validar código de barras para Paneles e Inversores
    // TEMPORALMENTE DESHABILITADO - El código de barras ahora es opcional
    // TODO: Reactivar cuando el inventario tenga códigos de barras
    // if (requiresBarcode() && !entryFormData.serialNumber.trim()) {
    //   setEntryError('El código de barras es requerido para Paneles e Inversores')
    //   return
    // }

    setSavingEntry(true)
    setEntryError(null)
    setEntrySuccess(null)

    // Guardar si era nuevo producto para decidir el reset después
    const wasNewProduct = isNewProduct

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

      // Determinar si crear múltiples entradas separadas o una sola
      // Solo crear múltiples entradas si hay códigos de barras (serialNumbers no vacíos)
      // Si no hay códigos de barras, crear una sola entrada con la cantidad total
      const hasSerialNumbers = serialNumbers.some(sn => sn.trim() !== '')
      const shouldCreateMultipleEntries = entryFormData.quantity > 1 && hasSerialNumbers

      if (shouldCreateMultipleEntries) {
        // Crear múltiples entradas, una por cada unidad
        let successCount = 0
        let errorMessages: string[] = []

        for (let i = 0; i < entryFormData.quantity; i++) {
          const serialNumber = serialNumbers[i]?.trim() || null
          try {
            const response = await fetch('/api/inventory/entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                locationId: entryFormData.locationId,
                quantity: 1, // Cada entrada tiene cantidad 1
                serialNumber: serialNumber,
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
              successCount++
            } else {
              errorMessages.push(`Error en unidad ${i + 1}: ${result.error}`)
            }
          } catch (err: any) {
            errorMessages.push(`Error en unidad ${i + 1}: ${err.message}`)
          }
        }

        if (successCount > 0) {
          setEntrySuccess(`${successCount} entrada(s) de inventario registrada(s)`)
          queryClient.invalidateQueries({ queryKey: ['inventory'] })
          queryClient.invalidateQueries({ queryKey: ['inventoryItems'] })
          queryClient.invalidateQueries({ queryKey: ['products'] })
          if (errorMessages.length === 0) {
            // Si era nuevo producto, solo limpiar campos pero mantener en modo nuevo producto
            if (wasNewProduct) {
              resetNewProductFields()
              // Auto-limpiar mensaje de éxito después de 3 segundos
              setTimeout(() => setEntrySuccess(null), 3000)
            } else {
              resetEntryForm()
            }
          }
        }
        if (errorMessages.length > 0) {
          setEntryError(errorMessages.join('; '))
        }
      } else {
        // Crear una sola entrada (cantidad = 1)
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
          // Si era nuevo producto, solo limpiar campos pero mantener en modo nuevo producto
          if (wasNewProduct) {
            resetNewProductFields()
            // Auto-limpiar mensaje de éxito después de 3 segundos
            setTimeout(() => setEntrySuccess(null), 3000)
          } else {
            resetEntryForm()
          }
        } else {
          setEntryError(result.error || 'Error al registrar entrada')
        }
      }
    } catch (error: any) {
      setEntryError(error.message || 'Error al registrar entrada de inventario')
    } finally {
      setSavingEntry(false)
      setUploadingInvoice(false)
    }
  }

  // View item details (single item - legacy)
  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item)
    setSelectedGroupedItem(null)
    setDetailDialogOpen(true)
  }

  // View grouped item details
  const handleViewGroupedDetails = (groupedItem: GroupedInventoryItem) => {
    setSelectedGroupedItem(groupedItem)
    setSelectedItem(null)
    setExpandedLocations(new Set()) // Reset expanded state
    setDetailDialogOpen(true)
  }

  // Toggle location expansion
  const toggleLocationExpand = (locId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev)
      if (next.has(locId)) {
        next.delete(locId)
      } else {
        next.add(locId)
      }
      return next
    })
  }

  // Función para agrupar items por nombre de producto (sin importar marca)
  // Agrupa productos con el mismo nombre aunque tengan diferentes marcas
  const groupInventoryItems = (items: InventoryItem[]): GroupedInventoryItem[] => {
    const groups = new Map<string, GroupedInventoryItem>()

    items.forEach(item => {
      // Crear key única: solo nombre (sin marca)
      // Esto agrupa productos como "Tubo 10 (130L)" de SOLECO y MS juntos
      const nameKey = item.product.name.toLowerCase().trim()
      const groupKey = nameKey

      const itemBrand = item.product.brand || null

      if (groups.has(groupKey)) {
        const group = groups.get(groupKey)!
        group.totalQuantity += item.quantity
        group.totalCost += item.totalCost || 0
        group.items.push(item)

        // Actualizar desglose por marca
        const existingBrand = group.brands.find(b =>
          (b.brand || '').toLowerCase() === (itemBrand || '').toLowerCase()
        )
        if (existingBrand) {
          existingBrand.quantity += item.quantity
          existingBrand.totalCost += item.totalCost || 0
        } else {
          group.brands.push({
            brand: itemBrand,
            quantity: item.quantity,
            totalCost: item.totalCost || 0
          })
        }

        // Contar ubicaciones únicas
        const uniqueLocations = new Set(group.items.map(i => i.location.id))
        group.locationCount = uniqueLocations.size
      } else {
        groups.set(groupKey, {
          groupKey,
          productId: item.product.id, // Usar el ID del primer item del grupo
          productName: item.product.name,
          productBrand: item.product.brand, // Marca del primer item (para compatibilidad)
          productModel: item.product.model,
          productSubCategory: item.product.subCategory?.name || null, // Subcategoría del producto
          unitCost: item.unitCost,
          totalQuantity: item.quantity,
          totalCost: item.totalCost || 0,
          locationCount: 1,
          items: [item],
          brands: [{
            brand: itemBrand,
            quantity: item.quantity,
            totalCost: item.totalCost || 0
          }],
          isLowStock: false, // Se calcula después
          locationStocks: [] // Se calcula después
        })
      }
    })

    // Calcular stock bajo y desglose por ubicación para cada grupo
    groups.forEach(group => {
      // Calcular si el total está bajo
      group.isLowStock = group.totalQuantity < LOW_STOCK_THRESHOLD

      // Calcular stock por ubicación
      const locationMap = new Map<string, LocationStock>()
      group.items.forEach(item => {
        const locId = item.location.id
        if (locationMap.has(locId)) {
          const loc = locationMap.get(locId)!
          loc.quantity += item.quantity
        } else {
          locationMap.set(locId, {
            locationId: locId,
            locationName: item.location.name,
            quantity: item.quantity,
            isLowStock: false // Se calcula después
          })
        }
      })

      // Marcar ubicaciones con stock bajo
      locationMap.forEach(loc => {
        loc.isLowStock = loc.quantity < LOW_STOCK_LOCATION_THRESHOLD
      })

      group.locationStocks = Array.from(locationMap.values())
    })

    // Convertir Map a array y ordenar por nombre de producto
    return Array.from(groups.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName)
    )
  }

  // Obtener items agrupados
  const groupedInventoryItems = groupInventoryItems(inventoryItems)

  // Calcular productos con stock bajo (basado en agrupación por nombre)
  const lowStockCount = groupedInventoryItems.filter(g => g.isLowStock).length

  // Contar productos con al menos una ubicación con stock bajo (pero total >= 10)
  const productsWithLowLocationStock = groupedInventoryItems.filter(
    g => !g.isLowStock && g.locationStocks.some(loc => loc.isLowStock)
  ).length

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

  // Palabras clave de categorías que requieren código de barras OBLIGATORIO
  const CATEGORIES_BARCODE_REQUIRED = ['Paneles', 'Inversores']
  // Palabras clave de categorías que tienen código de barras OPCIONAL
  const CATEGORIES_BARCODE_OPTIONAL = ['Calentadores']
  // Todas las palabras clave de categorías que muestran el campo de código de barras
  const CATEGORIES_WITH_BARCODE = [...CATEGORIES_BARCODE_REQUIRED, ...CATEGORIES_BARCODE_OPTIONAL]

  // Obtener el nombre de la categoría actual
  const getCurrentCategoryName = (): string | null => {
    if (isNewProduct) {
      const selectedCategory = categories.find((cat: any) => cat.id === newProductData.categoryId)
      return selectedCategory?.name || null
    } else {
      const selectedProduct = products.find((p: Product) => p.id === entryFormData.productId)
      return selectedProduct?.category?.name || null
    }
  }

  // Verificar si la categoría muestra el campo de código de barras (busca si el nombre CONTIENE alguna palabra clave)
  const showsBarcodeField = (): boolean => {
    const categoryName = getCurrentCategoryName()
    if (!categoryName) return false
    return CATEGORIES_WITH_BARCODE.some(keyword => categoryName.toLowerCase().includes(keyword.toLowerCase()))
  }

  // Verificar si el código de barras es obligatorio (busca si el nombre CONTIENE alguna palabra clave)
  const requiresBarcode = (): boolean => {
    const categoryName = getCurrentCategoryName()
    if (!categoryName) return false
    return CATEGORIES_BARCODE_REQUIRED.some(keyword => categoryName.toLowerCase().includes(keyword.toLowerCase()))
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
                  {foundProduct.serialNumber && (
                    <div className="mt-3 flex justify-center p-2 bg-white rounded border">
                      <BarcodeDisplay value={foundProduct.serialNumber} width={1.2} height={40} fontSize={10} />
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
                  <div className="space-y-4">
                    {/* Paso 1: Seleccionar nombre del producto */}
                    <div className="space-y-2">
                      <Label>Nombre del Producto *</Label>
                      <Select
                        value={selectedProductName}
                        onValueChange={(v) => {
                          setSelectedProductName(v)
                          setEntryFormData(prev => ({ ...prev, productId: '' })) // Reset marca al cambiar nombre
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Mostrar nombres únicos de productos con subcategoría */}
                          {(() => {
                            // Agrupar productos por nombre y obtener subcategoría
                            const productsByName = new Map<string, { name: string; subCategory: string | null }>()
                            products.forEach((p: Product) => {
                              if (!productsByName.has(p.name)) {
                                productsByName.set(p.name, {
                                  name: p.name,
                                  subCategory: p.subCategory?.name || null
                                })
                              }
                            })

                            return Array.from(productsByName.values())
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((item) => (
                                <SelectItem key={item.name} value={item.name}>
                                  <span className="flex items-center gap-2">
                                    {item.name}
                                    {item.subCategory && (
                                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {item.subCategory}
                                      </span>
                                    )}
                                  </span>
                                </SelectItem>
                              ))
                          })()}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Paso 2: Seleccionar marca (solo si hay nombre seleccionado) */}
                    {selectedProductName && (() => {
                      // Obtener productos con este nombre
                      const productsWithName = products.filter((p: Product) => p.name === selectedProductName)
                      const brands = productsWithName.map((p: Product) => ({
                        id: p.id,
                        brand: p.brand || 'Sin marca'
                      }))

                      return (
                        <div className="space-y-2">
                          <Label>Marca *</Label>
                          <Select
                            value={entryFormData.productId}
                            onValueChange={(v) => setEntryFormData(prev => ({ ...prev, productId: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar marca" />
                            </SelectTrigger>
                            <SelectContent>
                              {brands.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.brand}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })()}

                    {/* Información del inventario existente del producto seleccionado */}
                    {selectedProductName && (() => {
                      // Buscar items en inventario que coincidan con el nombre del producto
                      const relatedItems = inventoryItems.filter(item =>
                        item.product.name === selectedProductName
                      )

                      if (relatedItems.length === 0) {
                        return (
                          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                            <p>No hay stock existente de este producto</p>
                          </div>
                        )
                      }

                      // Calcular totales y desglose por marca
                      const totalQuantity = relatedItems.reduce((sum, item) => sum + item.quantity, 0)
                      const brandBreakdown: Record<string, { quantity: number; serials: string[]; productId: string }> = {}

                      relatedItems.forEach(item => {
                        const brand = item.product.brand || 'Sin marca'
                        if (!brandBreakdown[brand]) {
                          brandBreakdown[brand] = { quantity: 0, serials: [], productId: item.product.id }
                        }
                        brandBreakdown[brand].quantity += item.quantity
                        if (item.serialNumber) {
                          brandBreakdown[brand].serials.push(item.serialNumber)
                        }
                      })

                      const allSerials = relatedItems
                        .filter(item => item.serialNumber)
                        .map(item => ({ serial: item.serialNumber!, brand: item.product.brand || 'Sin marca' }))

                      // Obtener la marca seleccionada actualmente
                      const selectedProduct = products.find((p: Product) => p.id === entryFormData.productId)
                      const selectedBrand = selectedProduct?.brand || 'Sin marca'

                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800">Stock existente total:</span>
                            <span className="bg-blue-600 text-white text-sm px-2 py-0.5 rounded font-bold">
                              {totalQuantity} unidades
                            </span>
                          </div>

                          {/* Desglose por marca - resaltar la marca seleccionada */}
                          {Object.keys(brandBreakdown).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(brandBreakdown).map(([brand, data]) => (
                                <span
                                  key={brand}
                                  className={`text-xs px-2 py-0.5 rounded border ${
                                    entryFormData.productId && brand === selectedBrand
                                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                      : 'bg-white border-blue-200'
                                  }`}
                                >
                                  {brand}: {data.quantity}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Códigos de barras existentes */}
                          {allSerials.length > 0 && (
                            <div className="pt-2 border-t border-blue-200">
                              <p className="text-xs text-blue-700 mb-1">Códigos de barras registrados:</p>
                              <div className="max-h-[80px] overflow-y-auto">
                                <div className="flex flex-wrap gap-1">
                                  {allSerials.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                                        entryFormData.productId && item.brand === selectedBrand
                                          ? 'bg-blue-100 border-blue-300'
                                          : 'bg-white'
                                      }`}
                                      title={item.brand}
                                    >
                                      {item.serial}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Código de barras para producto existente (solo cuando cantidad = 1) */}
                    {showsBarcodeField() && entryFormData.quantity <= 1 && (
                      <div className="space-y-2">
                        <Label htmlFor="entry-serial-existing" className="flex items-center gap-2">
                          <ScanBarcode className="h-4 w-4" />
                          Código de Barras {/* TEMPORALMENTE OPCIONAL - requiresBarcode() && '*' */}
                        </Label>
                        <Input
                          id="entry-serial-existing"
                          value={entryFormData.serialNumber}
                          onChange={(e) => setEntryFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                          placeholder="Escanea o ingresa el código de barras"
                          className="font-mono"
                        />
                        {entryFormData.serialNumber && (
                          <div className="flex justify-center p-2 bg-white rounded border mt-2">
                            <BarcodeDisplay value={entryFormData.serialNumber} width={1.2} height={40} fontSize={10} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
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
                          onValueChange={(v) => setNewProductData(prev => ({ ...prev, categoryId: v, subCategoryId: '' }))}
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

                    {/* Subcategoría - solo si la categoría seleccionada tiene subcategorías */}
                    {newProductData.categoryId && (() => {
                      const selectedCategory = categories.find((cat: any) => cat.id === newProductData.categoryId)
                      const subCategories = selectedCategory?.subCategories || []
                      if (subCategories.length === 0) return null
                      return (
                        <div className="space-y-2">
                          <Label htmlFor="new-subcategory">Subcategoría</Label>
                          <Select
                            value={newProductData.subCategoryId}
                            onValueChange={(v) => setNewProductData(prev => ({ ...prev, subCategoryId: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar subcategoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {subCategories.map((sub: any) => (
                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })()}

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

                    {/* Código de barras - solo para Paneles, Inversores y Calentadores (cuando cantidad = 1) */}
                    {showsBarcodeField() && entryFormData.quantity <= 1 && (
                      <div className="space-y-2">
                        <Label htmlFor="entry-serial" className="flex items-center gap-2">
                          <ScanBarcode className="h-4 w-4" />
                          Código de Barras {/* TEMPORALMENTE OPCIONAL - requiresBarcode() && '*' */}
                        </Label>
                        <Input
                          id="entry-serial"
                          value={entryFormData.serialNumber}
                          onChange={(e) => setEntryFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                          placeholder="Escanea o ingresa el código de barras"
                          className="font-mono"
                        />
                        {entryFormData.serialNumber && (
                          <div className="flex justify-center p-2 bg-white rounded border mt-2">
                            <BarcodeDisplay value={entryFormData.serialNumber} width={1.2} height={40} fontSize={10} />
                          </div>
                        )}
                      </div>
                    )}

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
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Múltiples códigos de barras cuando cantidad > 1 */}
              {showsBarcodeField() && entryFormData.quantity > 1 && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <ScanBarcode className="h-4 w-4" />
                      Códigos de Barras ({entryFormData.quantity} unidades)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Un código por cada unidad
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {Array.from({ length: entryFormData.quantity }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                        <Input
                          value={serialNumbers[idx] || ''}
                          onChange={(e) => handleSerialNumberChange(idx, e.target.value)}
                          placeholder={`Código ${idx + 1}`}
                          className="font-mono text-sm h-8"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se creará una entrada separada por cada código de barras ingresado.
                  </p>
                </div>
              )}

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
                // NOTA: Se removió temporalmente la validación de código de barras obligatorio
                // Anterior: disabled={... || (requiresBarcode() && !entryFormData.serialNumber)}
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

      {/* Inventory Item Detail Dialog - Grouped View */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Desglose de Inventario
            </DialogTitle>
          </DialogHeader>

          {/* Grouped Item View */}
          {selectedGroupedItem && (
            <div className="space-y-4">
              {/* Product Summary */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">{selectedGroupedItem.productName}</h4>
                  {selectedGroupedItem.isLowStock && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Stock Bajo
                    </span>
                  )}
                </div>

                {/* Desglose por marca */}
                {selectedGroupedItem.brands.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Desglose por marca:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroupedItem.brands.map((b, idx) => (
                        <span
                          key={idx}
                          className="text-sm bg-white border px-2 py-1 rounded-md"
                        >
                          <span className="font-medium">{b.brand || 'Sin marca'}</span>
                          <span className="text-muted-foreground ml-1">({b.quantity} uds)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className={`text-center p-3 rounded-lg border ${selectedGroupedItem.isLowStock ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <p className={`text-2xl font-bold ${selectedGroupedItem.isLowStock ? 'text-red-600' : 'text-primary'}`}>
                      {selectedGroupedItem.totalQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">Cantidad Total</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-lg font-semibold">
                      {selectedGroupedItem.unitCost !== null ? formatCurrency(selectedGroupedItem.unitCost) : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Costo Unitario</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-lg font-semibold text-green-600">
                      {selectedGroupedItem.totalCost > 0 ? formatCurrency(selectedGroupedItem.totalCost) : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                  </div>
                </div>
              </div>

              {/* Breakdown by Location - Grouped & Collapsible */}
              <div>
                <h5 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Desglose por Ubicación
                </h5>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {(() => {
                    // Agrupar items por ubicación
                    const locationGroups = selectedGroupedItem.items.reduce((acc, item) => {
                      const locId = item.location.id
                      if (!acc[locId]) {
                        acc[locId] = {
                          locationName: item.location.name,
                          totalQuantity: 0,
                          totalCost: 0,
                          items: []
                        }
                      }
                      acc[locId].totalQuantity += item.quantity
                      acc[locId].totalCost += item.totalCost || 0
                      acc[locId].items.push(item)
                      return acc
                    }, {} as Record<string, { locationName: string; totalQuantity: number; totalCost: number; items: InventoryItem[] }>)

                    return Object.entries(locationGroups).map(([locId, locData]) => {
                      const isExpanded = expandedLocations.has(locId)
                      const hasMultipleItems = locData.items.length > 1

                      return (
                        <div
                          key={locId}
                          className="rounded-lg border bg-white overflow-hidden"
                        >
                          {/* Location Header - Clickable */}
                          <div
                            className={`flex items-center justify-between p-3 ${hasMultipleItems ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                            onClick={() => hasMultipleItems && toggleLocationExpand(locId)}
                          >
                            <div className="flex items-center gap-2">
                              {hasMultipleItems && (
                                isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <MapPin className="h-4 w-4 text-blue-500" />
                              <span className="font-semibold">{locData.locationName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                                locData.totalQuantity < LOW_STOCK_LOCATION_THRESHOLD
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {locData.totalQuantity} unidades
                              </span>
                              {locData.totalQuantity < LOW_STOCK_LOCATION_THRESHOLD && (
                                <span title="Stock bajo en esta ubicación">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                </span>
                              )}
                              {locData.totalCost > 0 && (
                                <span className="text-green-600 font-medium text-sm">
                                  {formatCurrency(locData.totalCost)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Items in this location - mismo formato para 1 o múltiples items */}
                          {(locData.items.length === 1 || isExpanded) && (
                            <div className="border-t max-h-[250px] overflow-y-auto">
                              {locData.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs p-3 border-b last:border-b-0 hover:bg-muted/20"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-1">
                                      {/* Marca del producto */}
                                      {item.product.brand && (
                                        <p className="font-medium text-sm">
                                          <span className="bg-muted px-1.5 py-0.5 rounded">{item.product.brand}</span>
                                        </p>
                                      )}
                                      {/* Proveedor */}
                                      {item.supplier && (
                                        <p className="text-muted-foreground">
                                          <span className="text-foreground">Proveedor:</span> {item.supplier}
                                        </p>
                                      )}
                                      {/* Fecha */}
                                      {item.purchaseDate && (
                                        <p className="text-muted-foreground">
                                          <span className="text-foreground">Fecha compra:</span> {new Date(item.purchaseDate).toLocaleDateString('es-MX')}
                                        </p>
                                      )}
                                      {/* Factura */}
                                      {item.invoiceNumber && (
                                        <p className="flex items-center gap-1 text-muted-foreground">
                                          <span className="text-foreground">Factura:</span> {item.invoiceNumber}
                                          {item.invoiceUrl && (
                                            <a
                                              href={item.invoiceUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </a>
                                          )}
                                        </p>
                                      )}
                                      {/* Código de barras */}
                                      {item.serialNumber && (
                                        <p className="text-muted-foreground">
                                          <span className="text-foreground">Código:</span>{' '}
                                          <span className="font-mono">{item.serialNumber}</span>
                                        </p>
                                      )}
                                      {/* Notas */}
                                      {item.notes && (
                                        <p className="text-muted-foreground">
                                          <span className="text-foreground">Notas:</span> {item.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium">
                                        {item.quantity} ud.
                                      </span>
                                      {item.totalCost !== null && item.totalCost > 0 && (
                                        <p className="text-green-600 text-xs mt-1">{formatCurrency(item.totalCost)}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Legacy Single Item View */}
          {selectedItem && !selectedGroupedItem && (
            <div className="space-y-4">
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
            <div className="text-2xl font-bold text-red-500">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Productos con menos de {LOW_STOCK_THRESHOLD} unidades
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
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
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

      {/* Inventory Items List - Grouped */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items de Inventario
          </CardTitle>
          <CardDescription>
            Productos agrupados por tipo y costo. Click en "Ver" para desglose por ubicación.
            {groupedInventoryItems.length > 0 && (
              <span className="ml-2 text-xs">
                ({groupedInventoryItems.length} productos únicos, {inventoryItems.length} entradas totales)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedInventoryItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Producto</th>
                    <th className="text-center py-3 px-2 font-medium">Cantidad Total</th>
                    <th className="text-center py-3 px-2 font-medium">Ubicaciones</th>
                    <th className="text-right py-3 px-2 font-medium">Costo Unit.</th>
                    <th className="text-right py-3 px-2 font-medium">Costo Total</th>
                    <th className="text-center py-3 px-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedInventoryItems.slice(0, 30).map((group) => (
                    <tr key={group.groupKey} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{group.productName}</p>
                            {group.productSubCategory && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {group.productSubCategory}
                              </span>
                            )}
                          </div>
                          {group.brands.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {group.brands.map((b, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-muted px-1.5 py-0.5 rounded"
                                  title={`${b.quantity} unidades`}
                                >
                                  {b.brand || 'Sin marca'}: {b.quantity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-bold text-lg ${group.isLowStock ? 'text-red-500' : ''}`}>
                            {group.totalQuantity}
                          </span>
                          {group.isLowStock && (
                            <span title="Stock bajo">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </span>
                          )}
                          {!group.isLowStock && group.locationStocks.some(loc => loc.isLowStock) && (
                            <span title="Alguna ubicación tiene stock bajo">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{group.locationCount}</span>
                          {group.items.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                              ({group.items.length} entradas)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {group.unitCost !== null ? formatCurrency(group.unitCost) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {group.totalCost > 0 ? formatCurrency(group.totalCost) : '-'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewGroupedDetails(group)}
                          title="Ver desglose"
                        >
                          <Layers className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {groupedInventoryItems.length > 30 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Mostrando 30 de {groupedInventoryItems.length} productos
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
