import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get total clients
    const totalClients = await withRetry(() => prisma.client.count({
      where: { isActive: true }
    }))

    // Get active orders (draft, confirmed, in progress, or shipped)
    const activeOrders = await withRetry(() => prisma.order.count({
      where: {
        status: {
          in: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED']
        }
      }
    }))

    // Get monthly revenue (current month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyRevenue = await withRetry(() => prisma.order.aggregate({
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
    }))

    // Get pending maintenance
    const pendingMaintenance = await withRetry(() => prisma.maintenanceRecord.count({
      where: {
        status: {
          in: ['PENDING_APPROVAL', 'SCHEDULED']
        }
      }
    }))

    // Get total energy generated this month (from Growatt data for ALL clients)
    const totalEnergyGenerated = await withRetry(() => prisma.growattDailyHistory.aggregate({
      where: {
        date: {
          gte: startOfMonth
        }
      },
      _sum: {
        dailyGeneration: true
      }
    }))

    // Get CO2 saved this month (from Growatt data for ALL clients)
    // CO2 factor: 0.5 kg CO2 per kWh (standard factor for solar energy)
    const co2Factor = 0.5
    const energyGenerated = Number(totalEnergyGenerated._sum.dailyGeneration) || 0
    const co2SavedThisMonth = energyGenerated * co2Factor

    // Get recent orders
    const recentOrders = await withRetry(() => prisma.order.findMany({
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
    }))

    // Get active/upcoming maintenance (not completed or cancelled)
    const recentMaintenance = await withRetry(() => prisma.maintenanceRecord.findMany({
      where: {
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
    }))

    // Get monthly revenue trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const revenue = await withRetry(() => prisma.order.aggregate({
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
      }))

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
          totalEnergyGenerated: Math.round(energyGenerated * 10) / 10,
          co2SavedThisMonth: Math.round(co2SavedThisMonth * 10) / 10
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
