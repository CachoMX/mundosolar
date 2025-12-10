import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get total clients
    const totalClients = await prisma.client.count({
      where: { isActive: true }
    })

    // Get active orders (pending or in progress)
    const activeOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'CONFIRMED']
        }
      }
    })

    // Get monthly revenue (current month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyRevenue = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        },
        status: {
          not: 'CANCELLED'
        }
      },
      _sum: {
        total: true
      }
    })

    // Get pending maintenance
    const pendingMaintenance = await prisma.maintenanceRecord.count({
      where: {
        status: {
          in: ['PENDING_APPROVAL', 'SCHEDULED']
        }
      }
    })

    // Get total energy generated (this month)
    const totalEnergyGenerated = await prisma.energyReading.aggregate({
      where: {
        readingDate: {
          gte: startOfMonth
        }
      },
      _sum: {
        dailyGeneration: true
      }
    })

    // Get CO2 saved this month
    const co2SavedThisMonth = await prisma.energyReading.aggregate({
      where: {
        readingDate: {
          gte: startOfMonth
        }
      },
      _sum: {
        co2Saved: true
      }
    })

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Get upcoming maintenance (scheduled in the future, not completed/cancelled)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const recentMaintenance = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          gte: today
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS', 'PENDING_APPROVAL']
        }
      },
      take: 5,
      orderBy: {
        scheduledDate: 'asc'
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Get monthly revenue trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const revenue = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd
          },
          status: {
            not: 'CANCELLED'
          }
        },
        _sum: {
          total: true
        }
      })

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('es-MX', { month: 'short' }),
        revenue: revenue._sum.total || 0
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalClients,
          activeOrders,
          monthlyRevenue: monthlyRevenue._sum.total || 0,
          pendingMaintenance,
          totalEnergyGenerated: totalEnergyGenerated._sum.dailyGeneration || 0,
          co2SavedThisMonth: co2SavedThisMonth._sum.co2Saved || 0
        },
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          client: `${order.client.firstName} ${order.client.lastName}`,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt
        })),
        recentMaintenance: recentMaintenance.map(maintenance => ({
          id: maintenance.id,
          client: `${maintenance.client.firstName} ${maintenance.client.lastName}`,
          maintenanceType: maintenance.type,
          scheduledDate: maintenance.scheduledDate,
          status: maintenance.status
        })),
        monthlyTrend
      }
    })
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener estadísticas del dashboard'
      },
      { status: 500 }
    )
  }
}
