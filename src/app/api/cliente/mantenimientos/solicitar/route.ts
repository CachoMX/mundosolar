import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// POST /api/cliente/mantenimientos/solicitar - Client requests a maintenance
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { type, title, description, solarSystemId, preferredDate } = body

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: 'El tipo y título son requeridos' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['PREVENTIVE', 'CORRECTIVE', 'WARRANTY', 'CLEANING']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de mantenimiento inválido' },
        { status: 400 }
      )
    }

    // If solarSystemId is provided, verify it belongs to this client
    if (solarSystemId) {
      const solarSystem = await prisma.solarSystem.findFirst({
        where: {
          id: solarSystemId,
          clientId: clientId
        }
      })

      if (!solarSystem) {
        return NextResponse.json(
          { success: false, error: 'Sistema solar no encontrado' },
          { status: 404 }
        )
      }
    }

    // Create maintenance request with PENDING_APPROVAL status
    // For preferred date, add time component to avoid timezone issues
    let scheduledDateValue = null
    if (preferredDate) {
      // If it's just a date string (YYYY-MM-DD), add noon UTC to keep the correct day
      scheduledDateValue = preferredDate.includes('T')
        ? new Date(preferredDate)
        : new Date(`${preferredDate}T12:00:00.000Z`)
    }

    const maintenanceRequest = await prisma.maintenanceRecord.create({
      data: {
        clientId,
        solarSystemId: solarSystemId || null,
        type: type as any,
        priority: 'SCHEDULED',
        status: 'PENDING_APPROVAL',
        title,
        description: description || null,
        requestedDate: new Date(),
        scheduledDate: scheduledDateValue,
      },
      include: {
        solarSystem: {
          select: {
            systemName: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitud de mantenimiento enviada correctamente. Un administrador la revisará pronto.',
      data: {
        id: maintenanceRequest.id,
        title: maintenanceRequest.title,
        type: maintenanceRequest.type,
        status: maintenanceRequest.status,
        requestedDate: maintenanceRequest.requestedDate,
        solarSystem: maintenanceRequest.solarSystem?.systemName || null
      }
    })
  } catch (error) {
    console.error('Error creating maintenance request:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear la solicitud de mantenimiento' },
      { status: 500 }
    )
  }
}
