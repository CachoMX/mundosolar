import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING_APPROVAL':
      return '#f59e0b' // Orange
    case 'SCHEDULED':
      return '#3b82f6' // Blue
    case 'IN_PROGRESS':
      return '#8b5cf6' // Purple
    case 'COMPLETED':
      return '#10b981' // Green
    case 'CANCELLED':
      return '#ef4444' // Red
    default:
      return '#6b7280' // Gray
  }
}

// GET /api/cliente/mantenimientos/calendar - Calendar events for client
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

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json(
        { success: false, error: 'start and end dates are required' },
        { status: 400 }
      )
    }

    // Calculate cutoff for showing cancelled events (48 hours ago)
    const cancelledCutoff = new Date()
    cancelledCutoff.setHours(cancelledCutoff.getHours() - 48)

    // Get client's own maintenances with full details
    // For CANCELLED status, only show recent ones (within 48 hours)
    const clientMaintenances = await prisma.maintenanceRecord.findMany({
      where: {
        clientId,
        scheduledDate: {
          gte: new Date(start),
          lte: new Date(end)
        },
        OR: [
          // Non-cancelled events - always show
          { status: { not: 'CANCELLED' } },
          // Cancelled events - only show if recently cancelled
          {
            status: 'CANCELLED',
            updatedAt: { gte: cancelledCutoff }
          }
        ]
      },
      include: {
        solarSystem: {
          select: {
            systemName: true,
          }
        },
        technicians: {
          include: {
            technician: {
              select: {
                name: true,
              }
            }
          },
          take: 1
        },
        // Include status history for cancelled maintenances (to show rejection reason)
        statusHistory: {
          where: {
            status: 'CANCELLED'
          },
          orderBy: {
            changedAt: 'desc'
          },
          take: 1,
          select: {
            notes: true,
            changedAt: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })

    // Get other clients' scheduled maintenances (only dates, no details) to show as "busy"
    const otherMaintenances = await prisma.maintenanceRecord.findMany({
      where: {
        clientId: { not: clientId },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: {
          gte: new Date(start),
          lte: new Date(end)
        }
      },
      select: {
        id: true,
        scheduledDate: true,
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })

    // Transform client's maintenances to calendar events format (with full details)
    const clientEvents = clientMaintenances.map(m => ({
      id: m.id,
      title: m.title,
      start: m.scheduledDate,
      end: m.scheduledDate,
      resource: {
        type: m.type,
        status: m.status,
        priority: m.priority,
        system: m.solarSystem?.systemName || 'General',
        technician: m.technicians[0]?.technician.name || 'Sin asignar',
        solarSystem: m.solarSystem,
        technicians: m.technicians.map(t => ({
          technician: { name: t.technician.name }
        })),
        isOwn: true,
        // Include rejection reason for cancelled maintenances
        rejectionReason: m.status === 'CANCELLED' && m.statusHistory[0]?.notes
          ? m.statusHistory[0].notes.replace('Solicitud rechazada: ', '')
          : null,
        rejectedAt: m.status === 'CANCELLED' && m.statusHistory[0]?.changedAt
          ? m.statusHistory[0].changedAt
          : null
      },
      backgroundColor: getStatusColor(m.status),
      borderColor: getStatusColor(m.status),
    }))

    // Transform other maintenances to "busy" events (no details, just show day is occupied)
    const busyEvents = otherMaintenances.map(m => ({
      id: `busy-${m.id}`,
      title: 'Día ocupado',
      start: m.scheduledDate,
      end: m.scheduledDate,
      resource: {
        status: 'BUSY',
        isOwn: false
      },
      backgroundColor: '#9ca3af', // Gray
      borderColor: '#9ca3af',
    }))

    // Combine both arrays
    const events = [...clientEvents, ...busyEvents]

    return NextResponse.json({
      success: true,
      data: events
    })
  } catch (error) {
    console.error('Client calendar error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar eventos del calendario' },
      { status: 500 }
    )
  }
}
