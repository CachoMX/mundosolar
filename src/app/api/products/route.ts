import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/products - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
