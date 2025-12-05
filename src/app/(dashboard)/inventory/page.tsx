'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Package, AlertTriangle, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

interface InventoryData {
  summary: {
    totalProducts: number
    lowStock: number
    totalValue: number
    totalLocations: number
  }
  categories: {
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

export default function InventoryPage() {
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventoryData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory')

      if (!response.ok) {
        throw new Error('Error al obtener datos del inventario')
      }

      const result = await response.json()

      if (result.success) {
        setInventoryData(result.data)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      console.error('Error fetching inventory:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryData()
  }, [])

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
          <Button onClick={fetchInventoryData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
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
          <Button variant="outline" onClick={fetchInventoryData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>
        </div>
      </div>

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