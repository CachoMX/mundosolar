import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/reports/sales
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

    // Only ADMIN and MANAGER can view sales reports
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // Get monthly sales data for the year
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    // Get all orders for the year
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            city: true,
            state: true
          }
        },
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate monthly totals
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      monthName: new Date(year, i, 1).toLocaleDateString('es-MX', { month: 'short' }),
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0
    }))

    orders.forEach(order => {
      const month = new Date(order.createdAt).getMonth()
      monthlyData[month].totalOrders++
      monthlyData[month].totalRevenue += Number(order.total)
    })

    monthlyData.forEach(m => {
      m.averageOrderValue = m.totalOrders > 0 ? m.totalRevenue / m.totalOrders : 0
    })

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Sales by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    })

    // Sales by order type
    const ordersByType = await prisma.order.groupBy({
      by: ['orderType'],
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear
        },
        status: {
          not: 'CANCELLED'
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    })

    // Sales by state (top 10)
    const salesByState: Record<string, { orders: number; revenue: number }> = {}
    orders.forEach(order => {
      const state = order.client.state || 'Sin estado'
      if (!salesByState[state]) {
        salesByState[state] = { orders: 0, revenue: 0 }
      }
      salesByState[state].orders++
      salesByState[state].revenue += Number(order.total)
    })

    const topStatesSales = Object.entries(salesByState)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Sales by product category
    const salesByCategory: Record<string, { quantity: number; revenue: number }> = {}
    orders.forEach(order => {
      order.orderItems.forEach(item => {
        const category = item.product.category?.name || 'Sin categoría'
        if (!salesByCategory[category]) {
          salesByCategory[category] = { quantity: 0, revenue: 0 }
        }
        salesByCategory[category].quantity += item.quantity
        salesByCategory[category].revenue += Number(item.totalPrice)
      })
    })

    const categorySales = Object.entries(salesByCategory)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    // Top 10 clients by revenue
    const clientRevenue: Record<string, { name: string; orders: number; revenue: number }> = {}
    orders.forEach(order => {
      const clientName = `${order.client.firstName} ${order.client.lastName}`
      if (!clientRevenue[clientName]) {
        clientRevenue[clientName] = { name: clientName, orders: 0, revenue: 0 }
      }
      clientRevenue[clientName].orders++
      clientRevenue[clientName].revenue += Number(order.total)
    })

    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Recent orders
    const recentOrders = orders.slice(0, 10).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      client: `${order.client.firstName} ${order.client.lastName}`,
      total: Number(order.total),
      status: order.status,
      orderType: order.orderType,
      createdAt: order.createdAt
    }))

    // Compare with previous year
    const prevYearStart = new Date(year - 1, 0, 1)
    const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59)

    const prevYearOrders = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: prevYearStart,
          lte: prevYearEnd
        },
        status: {
          not: 'CANCELLED'
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    })

    const prevYearRevenue = Number(prevYearOrders._sum.total) || 0
    const yearOverYearGrowth = prevYearRevenue > 0
      ? ((totalRevenue - prevYearRevenue) / prevYearRevenue) * 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        year,
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          yearOverYearGrowth,
          prevYearRevenue
        },
        monthlyData,
        ordersByStatus: ordersByStatus.map(s => ({
          status: s.status,
          count: s._count.id,
          total: Number(s._sum.total) || 0
        })),
        ordersByType: ordersByType.map(t => ({
          type: t.orderType,
          count: t._count.id,
          total: Number(t._sum.total) || 0
        })),
        topStatesSales,
        categorySales,
        topClients,
        recentOrders
      }
    })
  } catch (error: any) {
    console.error('Error fetching sales report:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
