import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// DELETE /api/orders/[id]/payments/[paymentId] - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
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

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden eliminar pagos' },
        { status: 403 }
      )
    }

    const { id: orderId, paymentId } = params

    // Get the payment to be deleted
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        orderId: true,
        amount: true
      }
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Pago no encontrado' },
        { status: 404 }
      )
    }

    if (payment.orderId !== orderId) {
      return NextResponse.json(
        { success: false, error: 'El pago no pertenece a esta orden' },
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

    const paymentAmount = Number(payment.amount)
    const currentPaid = Number(order.amountPaid) || 0
    const orderTotal = Number(order.total)
    const newAmountPaid = Math.max(0, currentPaid - paymentAmount)
    const newBalanceDue = orderTotal - newAmountPaid

    // Determine new payment status
    let newPaymentStatus = 'PARTIAL'
    if (newAmountPaid >= orderTotal) {
      newPaymentStatus = 'PAID'
    } else if (newAmountPaid === 0) {
      newPaymentStatus = 'PENDING'
    }

    // Delete payment and update order in transaction
    await prisma.$transaction(async (tx) => {
      // Delete payment
      await tx.payment.delete({
        where: { id: paymentId }
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
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Pago eliminado correctamente',
        orderSummary: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          paymentStatus: newPaymentStatus
        }
      }
    })
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar pago' },
      { status: 500 }
    )
  }
}
