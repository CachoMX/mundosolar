import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get total products count
    const totalProducts = await prisma.inventoryItem.aggregate({
      _sum: {
        quantity: true
      }
    })

    // Get products with low stock (less than 10 units)
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lt: 10
        }
      },
      include: {
        product: true
      }
    })

    // Get total inventory value
    const inventoryValue = await prisma.inventoryItem.aggregate({
      _sum: {
        totalCost: true
      }
    })

    // Get total locations
    const totalLocations = await prisma.location.count({
      where: {
        isActive: true
      }
    })

    // Get inventory by category
    const categoriesWithInventory = await prisma.productCategory.findMany({
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
    })

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
    const recentMovements = await prisma.inventoryMovement.findMany({
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
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts: totalProducts._sum.quantity || 0,
          lowStock: lowStockItems.length,
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
