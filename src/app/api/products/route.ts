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
