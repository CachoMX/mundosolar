import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/growatt-credentials/[id]
 * Update Growatt credentials (toggle active status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { isActive } = body

    const credential = await prisma.growattCredentials.update({
      where: { id: params.id },
      data: { isActive },
      select: {
        id: true,
        clientId: true,
        username: true,
        isActive: true,
      },
    })

    return NextResponse.json({ credential })
  } catch (error) {
    console.error('Error updating credentials:', error)
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/growatt-credentials/[id]
 * Delete Growatt credentials
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.growattCredentials.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credentials:', error)
    return NextResponse.json(
      { error: 'Failed to delete credentials' },
      { status: 500 }
    )
  }
}
