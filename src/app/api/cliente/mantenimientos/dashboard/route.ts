import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// GET /api/cliente/mantenimientos/dashboard - Dashboard metrics for client's maintenances
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    // Programados hoy para este cliente
    const scheduledToday = await prisma.maintenanceRecord.count({
      where: {
        clientId,
        scheduledDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    })

    // Programados esta semana para este cliente
    const scheduledThisWeek = await prisma.maintenanceRecord.count({
      where: {
        clientId,
        scheduledDate: {
          gte: today,
          lt: endOfWeek
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    })

    // Atrasados para este cliente
    const overdue = await prisma.maintenanceRecord.count({
      where: {
        clientId,
        scheduledDate: {
          lt: today
        },
        status: {
          in: ['SCHEDULED', 'PENDING_APPROVAL']
        }
      }
    })

    // Total completados este mes para este cliente
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const completedThisMonth = await prisma.maintenanceRecord.count({
      where: {
        clientId,
        completedDate: {
          gte: firstDayOfMonth
        },
        status: 'COMPLETED'
      }
    })

    // Pendientes para este cliente
    const pendingApproval = await prisma.maintenanceRecord.count({
      where: {
        clientId,
        status: 'PENDING_APPROVAL'
      }
    })

    // Próximos mantenimientos (próximos 14 días) para este cliente
    const upcomingDate = new Date(today)
    upcomingDate.setDate(upcomingDate.getDate() + 14)

    const upcoming = await prisma.maintenanceRecord.findMany({
      where: {
        clientId,
        scheduledDate: {
          gte: today,
          lte: upcomingDate
        },
        status: {
          in: ['SCHEDULED', 'PENDING_APPROVAL', 'IN_PROGRESS']
        }
      },
      include: {
        solarSystem: {
          select: {
            id: true,
            systemName: true,
          }
        },
        technicians: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          take: 2
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      take: 10
    })

    // Mantenimientos atrasados para este cliente
    const overdueList = await prisma.maintenanceRecord.findMany({
      where: {
        clientId,
        scheduledDate: {
          lt: today
        },
        status: {
          in: ['SCHEDULED', 'PENDING_APPROVAL']
        }
      },
      include: {
        solarSystem: {
          select: {
            id: true,
            systemName: true,
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      take: 5
    })

    return NextResponse.json({
      success: true,
      data: {
        scheduledToday,
        scheduledThisWeek,
        overdue,
        completedThisMonth,
        pendingApproval,
        upcoming: upcoming.map(item => ({
          ...item,
          technicians: item.technicians.map(t => ({
            technician: { name: t.technician.name }
          }))
        })),
        overdueList
      }
    })
  } catch (error) {
    console.error('Client maintenance dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar datos del dashboard' },
      { status: 500 }
    )
  }
}
