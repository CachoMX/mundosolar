import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/inventory - Register inventory exit (sale/output)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { barcode, quantity, reason, notes, locationId } = data

    if (!barcode || !quantity || quantity <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Código de barras y cantidad son requeridos'
      }, { status: 400 })
    }

    // Find product by barcode (supports exact match and prefix match)
    // First get all products with barcodes
    const allProductsWithBarcodes = await withRetry(() => prisma.product.findMany({
      where: {
        isActive: true,
        barcode: { not: null }
      },
      include: {
        inventoryItems: {
          where: locationId ? { locationId } : {},
          include: { location: true }
        }
      }
    }))

    // Find matching product (exact or prefix match)
    const product = allProductsWithBarcodes.find(p => {
      if (!p.barcode) return false
      // Exact match
      if (p.barcode === barcode) return true
      // Prefix match: scanned code starts with product's barcode prefix
      if (barcode.startsWith(p.barcode)) return true
      return false
    })

    if (!product) {
      return NextResponse.json({
        success: false,
        error: 'Producto no encontrado con ese código de barras'
      }, { status: 404 })
    }

    // Check if there's enough stock
    const totalStock = product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
    if (totalStock < quantity) {
      return NextResponse.json({
        success: false,
        error: `Stock insuficiente. Disponible: ${totalStock}, Solicitado: ${quantity}`
      }, { status: 400 })
    }

    // Find inventory item to deduct from (use first available or specified location)
    let remainingToDeduct = quantity
    const movements = []

    for (const inventoryItem of product.inventoryItems) {
      if (remainingToDeduct <= 0) break
      if (inventoryItem.quantity <= 0) continue

      const deductAmount = Math.min(remainingToDeduct, inventoryItem.quantity)

      // Update inventory item quantity
      await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: inventoryItem.quantity - deductAmount }
      })

      // Create movement record
      const movement = await prisma.inventoryMovement.create({
        data: {
          type: 'SALE',
          quantity: deductAmount,
          fromItemId: inventoryItem.id,
          reason: reason || 'Salida de inventario por escaneo',
          notes: notes || `Producto: ${product.name}, Código: ${barcode}`
        }
      })

      movements.push({
        ...movement,
        locationName: inventoryItem.location.name,
        deductedAmount: deductAmount
      })

      remainingToDeduct -= deductAmount
    }

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode
        },
        quantityDeducted: quantity,
        movements,
        newTotalStock: totalStock - quantity
      },
      message: `Se descontaron ${quantity} unidades de ${product.name}`
    })
  } catch (error: any) {
    console.error('Error processing inventory exit:', error)
    return NextResponse.json(
      { success: false, error: 'Error al procesar salida de inventario' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get total products count
    const totalProducts = await withRetry(() => prisma.inventoryItem.aggregate({
      _sum: {
        quantity: true
      }
    }))

    // Get products with low stock (less than 10 units TOTAL per product)
    // First, get all products with their inventory items
    const productsWithInventory = await withRetry(() => prisma.product.findMany({
      where: { isActive: true },
      include: {
        inventoryItems: {
          select: { quantity: true }
        }
      }
    }))

    // Calculate total stock per product and filter those with less than 10
    const lowStockProducts = productsWithInventory.filter(product => {
      // For products with unique barcodes per unit (Paneles, Inversores), count items
      // For other products, sum quantities
      const totalStock = product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
      // Also count individual items (for products where each unit is a separate record)
      const itemCount = product.inventoryItems.length
      // Use the larger value to properly count both scenarios
      const effectiveStock = Math.max(totalStock, itemCount)
      return effectiveStock > 0 && effectiveStock < 10
    })

    // Get total inventory value
    const inventoryValue = await withRetry(() => prisma.inventoryItem.aggregate({
      _sum: {
        totalCost: true
      }
    }))

    // Get total locations
    const totalLocations = await withRetry(() => prisma.location.count({
      where: {
        isActive: true
      }
    }))

    // Get inventory by category
    const categoriesWithInventory = await withRetry(() => prisma.productCategory.findMany({
      where: {
        isActive: true
      },
      include: {
        products: {
          include: {
            inventoryItems: true
          }
        }
      }
    }))

    // Calculate quantities per category
    const categoryData = categoriesWithInventory.map(category => {
      const totalQuantity = category.products.reduce((sum, product) => {
        const productQuantity = product.inventoryItems.reduce((pSum, item) => pSum + item.quantity, 0)
        return sum + productQuantity
      }, 0)

      return {
        name: category.name,
        quantity: totalQuantity
      }
    })

    // Get recent inventory movements
    const recentMovements = await withRetry(() => prisma.inventoryMovement.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromItem: {
          include: {
            product: true,
            location: true
          }
        },
        toItem: {
          include: {
            product: true,
            location: true
          }
        }
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts: totalProducts._sum.quantity || 0,
          lowStock: lowStockProducts.length,
          totalValue: inventoryValue._sum.totalCost || 0,
          totalLocations: totalLocations
        },
        categories: categoryData,
        recentMovements: recentMovements.map(movement => ({
          id: movement.id,
          type: movement.type,
          quantity: movement.quantity,
          product: movement.fromItem?.product?.name || movement.toItem?.product?.name || 'Desconocido',
          fromLocation: movement.fromItem?.location?.name || null,
          toLocation: movement.toItem?.location?.name || null,
          date: movement.createdAt,
          reason: movement.reason,
          notes: movement.notes
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching inventory data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener datos del inventario'
      },
      { status: 500 }
    )
  }
}
