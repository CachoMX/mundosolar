import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/maintenance/[id]/parts - List parts used
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parts = await prisma.maintenancePart.findMany({
      where: {
        maintenanceId: params.id
      },
      include: {
        inventoryItem: {
          include: {
            product: {
              select: {
                name: true,
                brand: true,
                model: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: parts
    })
  } catch (error) {
    console.error('Error fetching parts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/[id]/parts - Add part
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { inventoryItemId, quantity, notes } = body

    if (!inventoryItemId || !quantity) {
      return NextResponse.json(
        { success: false, error: 'inventoryItemId and quantity are required' },
        { status: 400 }
      )
    }

    // Check inventory availability
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId }
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    if (inventoryItem.quantity < quantity) {
      return NextResponse.json(
        { success: false, error: 'Insufficient inventory quantity' },
        { status: 400 }
      )
    }

    const part = await prisma.maintenancePart.create({
      data: {
        maintenanceId: params.id,
        inventoryItemId,
        quantity,
        notes
      },
      include: {
        inventoryItem: {
          include: {
            product: {
              select: {
                name: true,
                brand: true,
                model: true,
              }
            }
          }
        }
      }
    })

    // Update inventory quantity
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: {
          decrement: quantity
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: part
    })
  } catch (error) {
    console.error('Error adding part:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
