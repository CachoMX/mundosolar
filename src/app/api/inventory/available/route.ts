import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/inventory/available - Get inventory items available for maintenance parts
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inStockOnly = searchParams.get('inStockOnly') === 'true'

    const items = await prisma.inventoryItem.findMany({
      where: {
        product: {
          isActive: true
        },
        ...(inStockOnly && {
          quantity: {
            gt: 0
          }
        })
      },
      select: {
        id: true,
        quantity: true,
        unitCost: true,
        supplier: true,
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
            unitPrice: true,
            category: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: items
    })
  } catch (error) {
    console.error('Error fetching available inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
