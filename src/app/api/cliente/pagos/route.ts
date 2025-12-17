import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

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

    // Get all orders for this client with their payments
    const orders = await prisma.order.findMany({
      where: {
        clientId,
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        total: true,
        amountPaid: true,
        balanceDue: true,
        paymentStatus: true,
        status: true,
        payments: {
          select: {
            id: true,
            amount: true,
            paymentType: true,
            paymentMethod: true,
            paymentDate: true,
            referenceNumber: true,
            notes: true,
          },
          orderBy: {
            paymentDate: 'desc'
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    // Calculate summary statistics
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.total), 0)
    const totalPaid = orders.reduce((sum, order) => sum + Number(order.amountPaid), 0)
    const totalPending = orders.reduce((sum, order) => sum + (Number(order.balanceDue) || 0), 0)

    const paidOrders = orders.filter(o => o.paymentStatus === 'PAID').length
    const partialOrders = orders.filter(o => o.paymentStatus === 'PARTIAL').length
    const pendingOrders = orders.filter(o => o.paymentStatus === 'PENDING').length

    // Get all payments flattened for timeline view
    const allPayments = orders.flatMap(order =>
      order.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
        orderNumber: order.orderNumber,
        orderId: order.id,
      }))
    ).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalAmount,
          totalPaid,
          totalPending,
          paidOrders,
          partialOrders,
          pendingOrders,
        },
        orders: orders.map(order => ({
          ...order,
          total: Number(order.total),
          amountPaid: Number(order.amountPaid),
          balanceDue: Number(order.balanceDue) || 0,
          payments: order.payments.map(p => ({
            ...p,
            amount: Number(p.amount)
          }))
        })),
        recentPayments: allPayments.slice(0, 10) // Last 10 payments
      }
    })
  } catch (error: any) {
    console.error('Error fetching client payments:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial de pagos' },
      { status: 500 }
    )
  }
}
