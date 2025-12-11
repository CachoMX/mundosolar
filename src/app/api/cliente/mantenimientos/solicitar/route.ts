import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
    const { type, title, description, solarSystemId, plantName, preferredDate } = body

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

    // Try to find solar system in database (for Growatt plants, solarSystemId might be plantId which doesn't exist in DB)
    let validSolarSystemId: string | null = null
    let plantNameForTitle: string | null = plantName || null

    if (solarSystemId) {
      // First try to find by ID
      const solarSystem = await prisma.solarSystem.findFirst({
        where: {
          id: solarSystemId,
          clientId: clientId
        }
      })

      if (solarSystem) {
        validSolarSystemId = solarSystem.id
      } else {
        // If not found by ID, try to find by name (solarSystemId might be a Growatt plantName)
        const systemByName = await prisma.solarSystem.findFirst({
          where: {
            systemName: solarSystemId,
            clientId: clientId
          }
        })

        if (systemByName) {
          validSolarSystemId = systemByName.id
        } else {
          // Not found in DB - this is likely a Growatt plant, use the plant name (not ID)
          plantNameForTitle = plantName || solarSystemId
        }
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

    // Get client info for notification
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { firstName: true, lastName: true }
    })

    // Build title with plant name if not found in DB
    const finalTitle = plantNameForTitle && !validSolarSystemId
      ? `${title} - Planta: ${plantNameForTitle}`
      : title

    const maintenanceRequest = await prisma.maintenanceRecord.create({
      data: {
        clientId,
        solarSystemId: validSolarSystemId,
        type: type as any,
        priority: 'SCHEDULED',
        status: 'PENDING_APPROVAL',
        title: finalTitle,
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

    // Notify all ADMIN users about the new maintenance request
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true }
      })

      if (admins.length > 0) {
        const clientName = client ? `${client.firstName} ${client.lastName}` : 'Un cliente'

        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            type: 'maintenance_request',
            title: 'Nueva Solicitud de Mantenimiento',
            message: `${clientName} ha solicitado un mantenimiento: ${title}`,
            data: {
              maintenanceId: maintenanceRequest.id,
              clientId: clientId,
              type: type
            }
          }))
        })
      }
    } catch (notifError) {
      // Log but don't fail the request if notification creation fails
      console.warn('Could not create notifications for admins:', notifError)
    }

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
