import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/maintenance/dashboard - Dashboard metrics and upcoming maintenances
export async function GET(request: NextRequest) {
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    // Programados hoy
    const scheduledToday = await prisma.maintenanceRecord.count({
      where: {
        scheduledDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    })

    // Programados esta semana
    const scheduledThisWeek = await prisma.maintenanceRecord.count({
      where: {
        scheduledDate: {
          gte: today,
          lt: endOfWeek
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    })

    // Atrasados
    const overdue = await prisma.maintenanceRecord.count({
      where: {
        scheduledDate: {
          lt: today
        },
        status: {
          in: ['SCHEDULED', 'PENDING_APPROVAL']
        }
      }
    })

    // Total completados este mes
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const completedThisMonth = await prisma.maintenanceRecord.count({
      where: {
        completedDate: {
          gte: firstDayOfMonth
        },
        status: 'COMPLETED'
      }
    })

    // Próximos mantenimientos (próximos 14 días)
    const upcomingDate = new Date(today)
    upcomingDate.setDate(upcomingDate.getDate() + 14)

    const upcoming = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          gte: today,
          lte: upcomingDate
        },
        status: {
          in: ['SCHEDULED', 'PENDING_APPROVAL']
        }
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
          }
        },
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

    // Mantenimientos atrasados (para alertas)
    const overdueList = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          lt: today
        },
        status: {
          in: ['SCHEDULED', 'PENDING_APPROVAL']
        }
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
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

    // Pendientes de aprobación
    const pendingApproval = await prisma.maintenanceRecord.count({
      where: {
        status: 'PENDING_APPROVAL'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        scheduledToday,
        scheduledThisWeek,
        overdue,
        completedThisMonth,
        pendingApproval,
        upcoming,
        overdueList
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
