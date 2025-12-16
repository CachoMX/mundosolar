import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/products - Fetch all products
// Also supports search by barcode: GET /api/products?barcode=123456789
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    // If barcode is provided, search for products with that barcode
    // Supports both exact match AND prefix match (for barcodes with unique serial numbers)
    // Example: Product has prefix "N1M2550140", scanning "N1M255014037190" will match
    if (barcode) {
      // First, get all active products with barcodes
      const allProductsWithBarcodes = await withRetry(() => prisma.product.findMany({
        where: {
          isActive: true,
          barcode: { not: null }
        },
        include: {
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          inventoryItems: {
            select: {
              id: true,
              quantity: true,
              locationId: true,
              location: { select: { id: true, name: true } }
            }
          }
        }
      }))

      // Find products where:
      // 1. Exact match (scanned barcode === product barcode)
      // 2. Prefix match (scanned barcode starts with product barcode - for serial numbers)
      const matchingProducts = allProductsWithBarcodes.filter(product => {
        if (!product.barcode) return false
        // Exact match
        if (product.barcode === barcode) return true
        // Prefix match: scanned code starts with product's barcode prefix
        if (barcode.startsWith(product.barcode)) return true
        return false
      })

      if (matchingProducts.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Producto no encontrado con ese código de barras'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: matchingProducts.map(product => ({
          ...product,
          unitPrice: product.unitPrice ? Number(product.unitPrice) : null,
          totalStock: product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0)
        })),
        // Include info about the match type for debugging
        matchInfo: {
          scannedBarcode: barcode,
          matchedPrefix: matchingProducts[0]?.barcode
        }
      })
    }

    const products = await withRetry(() => prisma.product.findMany({
      where: {
        isActive: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subCategory: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    }))

    return NextResponse.json({
      success: true,
      data: products.map(product => ({
        ...product,
        unitPrice: product.unitPrice ? Number(product.unitPrice) : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.categoryId) {
      return NextResponse.json({
        success: false,
        error: 'Nombre y categoría son requeridos'
      }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        brand: data.brand || null,
        model: data.model || null,
        capacity: data.capacity || null,
        description: data.description || null,
        barcode: data.barcode || null,
        unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : null,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || null,
        isActive: true
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        unitPrice: product.unitPrice ? Number(product.unitPrice) : null
      },
      message: 'Producto creado exitosamente'
    })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
