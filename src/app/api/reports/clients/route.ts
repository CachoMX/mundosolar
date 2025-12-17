import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/reports/clients
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
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

    // Get current user to check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    // Only ADMIN and MANAGER can view client reports
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Get all clients with their related data
    const clients = await prisma.client.findMany({
      include: {
        orders: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          },
          select: {
            id: true,
            total: true,
            createdAt: true,
            status: true
          }
        },
        solarSystems: {
          select: {
            id: true,
            capacity: true,
            installationDate: true
          }
        },
        maintenanceRecords: {
          select: {
            id: true,
            status: true,
            type: true
          }
        },
        growattHistory: {
          orderBy: {
            date: 'desc'
          },
          take: 30,
          select: {
            dailyGeneration: true,
            date: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate metrics for each client
    const clientMetrics = clients.map(client => {
      const totalOrders = client.orders.length
      const totalSpent = client.orders.reduce((sum, o) => sum + Number(o.total), 0)
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

      const totalSystems = client.solarSystems.length
      const totalCapacity = client.solarSystems.reduce((sum, s) => sum + Number(s.capacity || 0), 0)

      const totalMaintenances = client.maintenanceRecords.length
      const completedMaintenances = client.maintenanceRecords.filter(m => m.status === 'COMPLETED').length

      const avgDailyGeneration = client.growattHistory.length > 0
        ? client.growattHistory.reduce((sum, h) => sum + Number(h.dailyGeneration || 0), 0) / client.growattHistory.length
        : 0

      return {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone,
        city: client.city,
        state: client.state,
        isActive: client.isActive,
        createdAt: client.createdAt,
        metrics: {
          totalOrders,
          totalSpent,
          averageOrderValue,
          totalSystems,
          totalCapacity,
          totalMaintenances,
          completedMaintenances,
          avgDailyGeneration
        }
      }
    })

    // Summary statistics
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.isActive).length
    const clientsWithSystems = clients.filter(c => c.solarSystems.length > 0).length
    const clientsWithOrders = clients.filter(c => c.orders.length > 0).length

    // Clients by state
    const clientsByState: Record<string, number> = {}
    clients.forEach(client => {
      const state = client.state || 'Sin estado'
      clientsByState[state] = (clientsByState[state] || 0) + 1
    })

    const stateDistribution = Object.entries(clientsByState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)

    // New clients by month (last 12 months)
    const now = new Date()
    const monthlyNewClients = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      return {
        month: month.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        count: 0
      }
    })

    clients.forEach(client => {
      const clientMonth = new Date(client.createdAt)
      const monthsAgo = (now.getFullYear() - clientMonth.getFullYear()) * 12 + (now.getMonth() - clientMonth.getMonth())
      if (monthsAgo >= 0 && monthsAgo < 12) {
        monthlyNewClients[11 - monthsAgo].count++
      }
    })

    // Top clients by revenue
    const topClientsByRevenue = clientMetrics
      .filter(c => c.metrics.totalSpent > 0)
      .sort((a, b) => b.metrics.totalSpent - a.metrics.totalSpent)
      .slice(0, 10)

    // Top clients by generation
    const topClientsByGeneration = clientMetrics
      .filter(c => c.metrics.avgDailyGeneration > 0)
      .sort((a, b) => b.metrics.avgDailyGeneration - a.metrics.avgDailyGeneration)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClients,
          activeClients,
          inactiveClients: totalClients - activeClients,
          clientsWithSystems,
          clientsWithOrders
        },
        stateDistribution,
        monthlyNewClients,
        topClientsByRevenue,
        topClientsByGeneration,
        clients: clientMetrics
      }
    })
  } catch (error: any) {
    console.error('Error fetching clients report:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
