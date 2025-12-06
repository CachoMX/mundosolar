import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/finances - Get financial summary and data
export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get current month revenue (from completed/paid orders)
    const currentMonthRevenue = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { total: true }
    })

    // Get last month revenue for comparison
    const lastMonthRevenue = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { total: true }
    })

    // Get total revenue (all time)
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { total: true }
    })

    // Get pending invoices (accounts receivable)
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'ISSUED', 'OVERDUE'] }
      },
      include: {
        order: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Calculate accounts receivable total
    const accountsReceivableTotal = await prisma.invoice.aggregate({
      where: {
        status: { in: ['PENDING', 'ISSUED', 'OVERDUE'] }
      },
      _sum: { total: true }
    })

    // Get paid invoices this month
    const paidInvoicesThisMonth = await prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        updatedAt: { gte: startOfMonth }
      },
      _sum: { total: true }
    })

    // Calculate expenses estimate (maintenance costs)
    const maintenanceCostsThisMonth = await prisma.maintenanceRecord.aggregate({
      where: {
        completedDate: { gte: startOfMonth },
        status: 'COMPLETED'
      },
      _sum: { cost: true }
    })

    // Get inventory value
    const inventoryValue = await prisma.inventoryItem.aggregate({
      _sum: { totalCost: true }
    })

    // Calculate net profit estimate
    const monthlyRevenue = Number(currentMonthRevenue._sum.total) || 0
    const monthlyExpenses = Number(maintenanceCostsThisMonth._sum.cost) || 0
    const netProfit = monthlyRevenue - monthlyExpenses
    const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0

    // Get recent transactions (orders)
    const recentOrders = await prisma.order.findMany({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED', 'CONFIRMED'] }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Monthly trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthRevenue = await prisma.order.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ['COMPLETED', 'DELIVERED'] }
        },
        _sum: { total: true }
      })

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('es-MX', { month: 'short' }),
        revenue: Number(monthRevenue._sum.total) || 0
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          monthlyRevenue,
          lastMonthRevenue: Number(lastMonthRevenue._sum.total) || 0,
          totalRevenue: Number(totalRevenue._sum.total) || 0,
          monthlyExpenses,
          netProfit,
          profitMargin: Math.round(profitMargin * 10) / 10,
          accountsReceivable: Number(accountsReceivableTotal._sum.total) || 0,
          paidThisMonth: Number(paidInvoicesThisMonth._sum.total) || 0,
          inventoryValue: Number(inventoryValue._sum.totalCost) || 0
        },
        pendingInvoices: pendingInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          client: inv.order?.client ? `${inv.order.client.firstName} ${inv.order.client.lastName}` : 'N/A',
          total: Number(inv.total),
          status: inv.status,
          createdAt: inv.createdAt
        })),
        recentTransactions: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          client: `${order.client.firstName} ${order.client.lastName}`,
          total: Number(order.total),
          status: order.status,
          date: order.createdAt
        })),
        monthlyTrend
      }
    })
  } catch (error: any) {
    console.error('Error fetching financial data:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos financieros' },
      { status: 500 }
    )
  }
}
