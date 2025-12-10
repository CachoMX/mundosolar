import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// DELETE /api/cliente/mantenimientos/[id] - Client deletes a cancelled maintenance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Token invalido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string
    const { id: maintenanceId } = await params

    // Find the maintenance and verify it belongs to this client
    const maintenance = await prisma.maintenanceRecord.findUnique({
      where: { id: maintenanceId },
      select: {
        id: true,
        clientId: true,
        status: true
      }
    })

    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Mantenimiento no encontrado' },
        { status: 404 }
      )
    }

    // Verify the maintenance belongs to this client
    if (maintenance.clientId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Only allow deletion of cancelled maintenances
    if (maintenance.status !== 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden eliminar mantenimientos cancelados' },
        { status: 400 }
      )
    }

    // Delete the maintenance
    await prisma.maintenanceRecord.delete({
      where: { id: maintenanceId }
    })

    return NextResponse.json({
      success: true,
      message: 'Mantenimiento eliminado correctamente'
    })
  } catch (error) {
    console.error('Error deleting maintenance:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el mantenimiento' },
      { status: 500 }
    )
  }
}
