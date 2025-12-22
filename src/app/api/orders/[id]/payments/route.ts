import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/orders/[id]/payments - Get all payments for an order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const orderId = params.id

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        amountPaid: true,
        balanceDue: true,
        paymentStatus: true,
        depositRequired: true,
        depositPercentage: true,
        depositAmount: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Get all payments for the order
    const payments = await prisma.payment.findMany({
      where: { orderId },
      include: {
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { installmentNumber: 'asc' },
        { paymentDate: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: Number(order.total),
          amountPaid: Number(order.amountPaid),
          balanceDue: Number(order.balanceDue) || Number(order.total) - Number(order.amountPaid),
          paymentStatus: order.paymentStatus,
          depositRequired: order.depositRequired,
          depositPercentage: order.depositPercentage ? Number(order.depositPercentage) : null,
          depositAmount: order.depositAmount ? Number(order.depositAmount) : null
        },
        payments: payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          dueDate: p.dueDate,
          installmentNumber: p.installmentNumber,
          status: p.status,
          referenceNumber: p.referenceNumber,
          notes: p.notes,
          receiptUrl: p.receiptUrl,
          receivedBy: p.receivedBy,
          paidAt: p.paidAt,
          createdAt: p.createdAt
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener pagos' },
      { status: 500 }
    )
  }
}

// POST /api/orders/[id]/payments - Create a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para registrar pagos' },
        { status: 403 }
      )
    }

    const orderId = params.id
    const body = await request.json()

    const {
      amount,
      paymentType,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      receiptUrl
    } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // Get current order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        total: true,
        amountPaid: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    const currentPaid = Number(order.amountPaid) || 0
    const orderTotal = Number(order.total)
    const newAmountPaid = currentPaid + amount
    const newBalanceDue = orderTotal - newAmountPaid

    // Determine payment status
    let newPaymentStatus = 'PARTIAL'
    if (newAmountPaid >= orderTotal) {
      newPaymentStatus = 'PAID'
    } else if (newAmountPaid === 0) {
      newPaymentStatus = 'PENDING'
    }

    // Create payment and update order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount,
          paymentType: paymentType || 'PARTIAL',
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          referenceNumber,
          notes,
          receiptUrl,
          receivedById: user.id
        },
        include: {
          receivedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Update order payment status
      await tx.order.update({
        where: { id: orderId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          paymentStatus: newPaymentStatus
        }
      })

      return payment
    })

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: result.id,
          amount: Number(result.amount),
          paymentType: result.paymentType,
          paymentMethod: result.paymentMethod,
          paymentDate: result.paymentDate,
          referenceNumber: result.referenceNumber,
          notes: result.notes,
          receiptUrl: result.receiptUrl,
          receivedBy: result.receivedBy,
          createdAt: result.createdAt
        },
        orderSummary: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          paymentStatus: newPaymentStatus
        }
      }
    })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al registrar pago' },
      { status: 500 }
    )
  }
}
