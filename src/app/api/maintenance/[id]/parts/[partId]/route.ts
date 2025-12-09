import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// DELETE /api/maintenance/[id]/parts/[partId] - Remove part (and restore inventory)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; partId: string } }
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

    // Get part info before deleting
    const part = await prisma.maintenancePart.findUnique({
      where: { id: params.partId }
    })

    if (!part) {
      return NextResponse.json(
        { success: false, error: 'Part not found' },
        { status: 404 }
      )
    }

    // Delete part
    await prisma.maintenancePart.delete({
      where: { id: params.partId }
    })

    // Restore inventory quantity
    await prisma.inventoryItem.update({
      where: { id: part.inventoryItemId },
      data: {
        quantity: {
          increment: part.quantity
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Part removed and inventory restored'
    })
  } catch (error) {
    console.error('Error removing part:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
