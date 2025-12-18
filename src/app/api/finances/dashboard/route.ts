import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year

    // Calculate date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)

    let startDate: Date
    switch (period) {
      case 'year':
        startDate = startOfYear
        break
      case 'quarter':
        startDate = startOfQuarter
        break
      default:
        startDate = startOfMonth
    }

    // Get all orders with payments for the period
    const orders = await prisma.order.findMany({
      where: {
        orderDate: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      include: {
        payments: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Calculate income (total from orders)
    const totalIncome = orders.reduce((sum, order) => sum + Number(order.total), 0)

    // Calculate received payments (actual cash received)
    const paidPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: startDate }
      }
    })
    const totalReceived = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Get accounts receivable (pending payments) with aging
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { not: null }
      },
      include: {
        order: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Also get orders with balance due (even without scheduled payments)
    const ordersWithBalance = await prisma.order.findMany({
      where: {
        balanceDue: { gt: 0 },
        status: { not: 'CANCELLED' }
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Calculate aging buckets for accounts receivable
    const accountsReceivable = {
      current: 0,      // 0-30 days
      days31to60: 0,   // 31-60 days
      days61to90: 0,   // 61-90 days
      over90: 0,       // 90+ days
      total: 0,
      details: [] as any[]
    }

    // Process pending payments
    for (const payment of pendingPayments) {
      if (!payment.dueDate) continue

      const dueDate = new Date(payment.dueDate)
      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const amount = Number(payment.amount)

      accountsReceivable.total += amount

      if (daysDiff <= 0) {
        // Not yet due - count as current
        accountsReceivable.current += amount
      } else if (daysDiff <= 30) {
        accountsReceivable.current += amount
      } else if (daysDiff <= 60) {
        accountsReceivable.days31to60 += amount
      } else if (daysDiff <= 90) {
        accountsReceivable.days61to90 += amount
      } else {
        accountsReceivable.over90 += amount
      }

      accountsReceivable.details.push({
        id: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        clientName: `${payment.order.client.firstName} ${payment.order.client.lastName}`,
        amount,
        dueDate: payment.dueDate,
        daysOverdue: daysDiff > 0 ? daysDiff : 0,
        installmentNumber: payment.installmentNumber
      })
    }

    // Add orders with balance due that don't have scheduled payments
    const orderIdsWithScheduledPayments = new Set(pendingPayments.map(p => p.orderId))
    for (const order of ordersWithBalance) {
      if (orderIdsWithScheduledPayments.has(order.id)) continue

      const balance = Number(order.balanceDue)
      const orderAge = Math.floor((today.getTime() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24))

      accountsReceivable.total += balance

      if (orderAge <= 30) {
        accountsReceivable.current += balance
      } else if (orderAge <= 60) {
        accountsReceivable.days31to60 += balance
      } else if (orderAge <= 90) {
        accountsReceivable.days61to90 += balance
      } else {
        accountsReceivable.over90 += balance
      }

      accountsReceivable.details.push({
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName: `${order.client.firstName} ${order.client.lastName}`,
        amount: balance,
        dueDate: null,
        daysOverdue: orderAge,
        installmentNumber: null
      })
    }

    // Sort details by days overdue (most overdue first)
    accountsReceivable.details.sort((a, b) => b.daysOverdue - a.daysOverdue)

    // Get inventory costs (as proxy for expenses/COGS)
    const inventoryMovements = await prisma.inventoryMovement.findMany({
      where: {
        createdAt: { gte: startDate },
        type: 'SALE'
      },
      include: {
        fromItem: {
          select: {
            unitCost: true
          }
        }
      }
    })

    const totalCOGS = inventoryMovements.reduce((sum, mov) => {
      const cost = mov.fromItem?.unitCost ? Number(mov.fromItem.unitCost) * mov.quantity : 0
      return sum + cost
    }, 0)

    // Get recent payments for cash flow
    const recentPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidAt: { not: null }
      },
      orderBy: { paidAt: 'desc' },
      take: 20,
      include: {
        order: {
          select: {
            orderNumber: true,
            client: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthOrders = await prisma.order.findMany({
        where: {
          orderDate: {
            gte: monthStart,
            lte: monthEnd
          },
          status: { not: 'CANCELLED' }
        }
      })

      const monthPayments = await prisma.payment.findMany({
        where: {
          status: 'PAID',
          paidAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      const income = monthOrders.reduce((sum, o) => sum + Number(o.total), 0)
      const received = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        income,
        received,
        orders: monthOrders.length
      })
    }

    // Get order stats by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        total: true
      }
    })

    // Get order stats by type
    const ordersByType = await prisma.order.groupBy({
      by: ['orderType'],
      _count: true,
      _sum: {
        total: true
      },
      where: {
        orderDate: { gte: startDate }
      }
    })

    // Get payment method distribution
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      _count: true,
      _sum: {
        amount: true
      },
      where: {
        status: 'PAID',
        paidAt: { gte: startDate }
      }
    })

    // Get top clients by revenue
    const topClients = await prisma.order.groupBy({
      by: ['clientId'],
      _sum: {
        total: true,
        amountPaid: true
      },
      where: {
        orderDate: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      orderBy: {
        _sum: {
          total: 'desc'
        }
      },
      take: 5
    })

    // Get client details for top clients
    const topClientsWithDetails = await Promise.all(
      topClients.map(async (tc) => {
        const client = await prisma.client.findUnique({
          where: { id: tc.clientId },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        })
        return {
          ...tc,
          client,
          total: Number(tc._sum.total) || 0,
          amountPaid: Number(tc._sum.amountPaid) || 0
        }
      })
    )

    // Calculate key metrics
    const netProfit = totalIncome - totalCOGS
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
    const cashFlow = totalReceived - totalCOGS

    // Get invoices stats
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        total: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalReceived,
          totalCOGS,
          netProfit,
          profitMargin: Math.round(profitMargin * 10) / 10,
          cashFlow,
          period
        },
        accountsReceivable,
        monthlyTrends,
        ordersByStatus: ordersByStatus.map(s => ({
          status: s.status,
          count: s._count,
          total: Number(s._sum.total) || 0
        })),
        ordersByType: ordersByType.map(t => ({
          type: t.orderType,
          count: t._count,
          total: Number(t._sum.total) || 0
        })),
        paymentsByMethod: paymentsByMethod.map(p => ({
          method: p.paymentMethod,
          count: p._count,
          total: Number(p._sum.amount) || 0
        })),
        topClients: topClientsWithDetails,
        recentPayments: recentPayments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          paidAt: p.paidAt,
          orderNumber: p.order.orderNumber,
          clientName: `${p.order.client.firstName} ${p.order.client.lastName}`
        })),
        invoiceStats: invoiceStats.map(i => ({
          status: i.status,
          count: i._count,
          total: Number(i._sum.total) || 0
        }))
      }
    })
  } catch (error: any) {
    console.error('Finance dashboard error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al cargar datos financieros' },
      { status: 500 }
    )
  }
}
