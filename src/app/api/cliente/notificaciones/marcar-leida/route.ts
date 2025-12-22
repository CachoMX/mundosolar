import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// POST /api/cliente/notificaciones/marcar-leida - Mark notification(s) as read
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
    const { maintenanceId, type, markAllCancelled } = body

    let result

    // Option 1: Mark ALL cancelled notifications as read
    if (markAllCancelled) {
      result = await prisma.notification.updateMany({
        where: {
          clientId,
          type: 'maintenance_cancelled',
          read: false
        },
        data: {
          read: true
        }
      })
    }
    // Option 2: Mark by specific maintenanceId
    else if (maintenanceId) {
      // First try to find and update notifications with this maintenanceId in data field
      // Get all unread notifications for this client and filter manually
      const notifications = await prisma.notification.findMany({
        where: {
          clientId,
          read: false,
          type: {
            in: ['maintenance_cancelled', 'maintenance_scheduled', 'maintenance_rescheduled', 'maintenance_time_changed']
          }
        },
        select: {
          id: true,
          data: true
        }
      })

      // Filter to find matching maintenanceId in JSON data
      const matchingIds = notifications
        .filter(n => {
          const data = n.data as any
          return data?.maintenanceId === maintenanceId
        })
        .map(n => n.id)

      if (matchingIds.length > 0) {
        result = await prisma.notification.updateMany({
          where: {
            id: { in: matchingIds }
          },
          data: {
            read: true
          }
        })
      } else {
        result = { count: 0 }
      }
    }
    // Option 3: Mark by type
    else if (type) {
      result = await prisma.notification.updateMany({
        where: {
          clientId,
          type,
          read: false
        },
        data: {
          read: true
        }
      })
    } else {
      result = { count: 0 }
    }

    return NextResponse.json({
      success: true,
      data: {
        updated: result.count
      }
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { success: false, error: 'Error al marcar notificaciones como leídas' },
      { status: 500 }
    )
  }
}
