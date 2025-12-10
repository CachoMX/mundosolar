import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

export async function GET(request: NextRequest) {
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
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string

    // Get maintenance records for this client
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: { clientId },
      orderBy: { scheduledDate: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        scheduledDate: true,
        completedDate: true,
        description: true
      }
    })

    return NextResponse.json({
      success: true,
      data: maintenanceRecords.map(record => ({
        id: record.id,
        title: record.title,
        type: record.type,
        status: record.status,
        scheduledDate: record.scheduledDate?.toISOString() || null,
        completedDate: record.completedDate?.toISOString() || null,
        description: record.description
      }))
    })
  } catch (error) {
    console.error('Client maintenance error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar mantenimientos' },
      { status: 500 }
    )
  }
}
