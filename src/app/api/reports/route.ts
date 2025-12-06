import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/reports - Get reports and analytics data
export async function GET() {
  try {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1)
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31)

    // Total sales this year
    const salesThisYear = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfYear },
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { total: true },
      _count: true
    })

    // Total sales last year
    const salesLastYear = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfLastYear, lte: endOfLastYear },
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { total: true }
    })

    // Calculate year-over-year change
    const thisYearTotal = Number(salesThisYear._sum.total) || 0
    const lastYearTotal = Number(salesLastYear._sum.total) || 1
    const yoyChange = ((thisYearTotal - lastYearTotal) / lastYearTotal) * 100

    // Get total clients
    const totalClients = await prisma.client.count({ where: { isActive: true } })
    const newClientsThisYear = await prisma.client.count({
      where: { createdAt: { gte: startOfYear }, isActive: true }
    })

    // Get solar systems data
    const solarSystems = await prisma.solarSystem.findMany({
      where: { isActive: true },
      include: {
        energyReadings: {
          where: { readingDate: { gte: startOfYear } }
        }
      }
    })

    const totalCapacity = solarSystems.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0)
    const totalEnergy = solarSystems.reduce((sum, s) => {
      return sum + s.energyReadings.reduce((eSum, r) => eSum + (Number(r.dailyGeneration) || 0), 0)
    }, 0)
    const totalCO2 = solarSystems.reduce((sum, s) => {
      return sum + s.energyReadings.reduce((eSum, r) => eSum + (Number(r.co2Saved) || 0), 0)
    }, 0)

    // Maintenance stats
    const maintenanceCompleted = await prisma.maintenanceRecord.count({
      where: {
        completedDate: { gte: startOfYear },
        status: 'COMPLETED'
      }
    })

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true
    })

    // Orders by type
    const ordersByType = await prisma.order.groupBy({
      by: ['orderType'],
      _count: true,
      _sum: { total: true }
    })

    // Monthly sales trend
    const monthlyTrend = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthData = await prisma.order.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ['COMPLETED', 'DELIVERED'] }
        },
        _sum: { total: true },
        _count: true
      })

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        sales: Number(monthData._sum.total) || 0,
        orders: monthData._count
      })
    }

    // Top clients by revenue
    const topClients = await prisma.order.groupBy({
      by: ['clientId'],
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5
    })

    // Get client names for top clients
    const topClientIds = topClients.map(c => c.clientId)
    const clientNames = await prisma.client.findMany({
      where: { id: { in: topClientIds } },
      select: { id: true, firstName: true, lastName: true }
    })

    const topClientsWithNames = topClients.map(c => {
      const client = clientNames.find(cn => cn.id === c.clientId)
      return {
        clientId: c.clientId,
        name: client ? `${client.firstName} ${client.lastName}` : 'Desconocido',
        totalRevenue: Number(c._sum.total) || 0,
        orderCount: c._count
      }
    })

    // Calculate averages
    const avgOrderValue = salesThisYear._count > 0
      ? thisYearTotal / salesThisYear._count
      : 0

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalSales: thisYearTotal,
          yoyChange: Math.round(yoyChange * 10) / 10,
          totalOrders: salesThisYear._count,
          avgOrderValue: Math.round(avgOrderValue),
          totalClients,
          newClientsThisYear,
          solarSystemsInstalled: solarSystems.length,
          totalCapacityKw: Math.round(totalCapacity * 10) / 10,
          totalEnergyKwh: Math.round(totalEnergy),
          totalCO2SavedKg: Math.round(totalCO2),
          maintenanceCompleted
        },
        ordersByStatus: ordersByStatus.map(o => ({
          status: o.status,
          count: o._count
        })),
        ordersByType: ordersByType.map(o => ({
          type: o.orderType,
          count: o._count,
          revenue: Number(o._sum.total) || 0
        })),
        monthlyTrend,
        topClients: topClientsWithNames
      }
    })
  } catch (error: any) {
    console.error('Error fetching reports data:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos de reportes' },
      { status: 500 }
    )
  }
}
