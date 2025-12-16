import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/categories - Fetch all product categories
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await withRetry(() => prisma.productCategory.findMany({
      where: {
        isActive: true
      },
      include: {
        subCategories: {
          where: { isActive: true },
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    }))

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}
