import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List all transactions (payments + inventory movements)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // income, expense, all
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transactions: any[] = []

    if (type === 'all' || type === 'income') {
      // Get payments as income transactions
      const payments = await prisma.payment.findMany({
        where: {
          status: 'PAID'
        },
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
          },
          receivedBy: {
            select: {
              name: true
            }
          }
        },
        orderBy: { paidAt: 'desc' },
        take: limit,
        skip: offset
      })

      for (const payment of payments) {
        transactions.push({
          id: payment.id,
          type: 'income',
          category: payment.paymentType,
          description: `Pago ${payment.paymentType} - Orden ${payment.order.orderNumber}`,
          amount: Number(payment.amount),
          date: payment.paidAt || payment.paymentDate,
          reference: payment.referenceNumber,
          method: payment.paymentMethod,
          clientName: `${payment.order.client.firstName} ${payment.order.client.lastName}`,
          orderNumber: payment.order.orderNumber,
          receivedBy: payment.receivedBy?.name,
          notes: payment.notes
        })
      }
    }

    if (type === 'all' || type === 'expense') {
      // Get inventory purchases as expense transactions
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          purchaseDate: { not: null }
        },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              model: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        },
        orderBy: { purchaseDate: 'desc' },
        take: limit,
        skip: offset
      })

      for (const item of inventoryItems) {
        if (item.totalCost && Number(item.totalCost) > 0) {
          transactions.push({
            id: item.id,
            type: 'expense',
            category: 'PURCHASE',
            description: `Compra: ${item.product.name} ${item.product.brand || ''} ${item.product.model || ''}`.trim(),
            amount: Number(item.totalCost),
            date: item.purchaseDate,
            reference: item.invoiceNumber,
            supplier: item.supplier,
            quantity: item.quantity,
            location: item.location?.name,
            notes: null
          })
        }
      }
    }

    // Sort all transactions by date descending
    transactions.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime()
      const dateB = new Date(b.date || 0).getTime()
      return dateB - dateA
    })

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.slice(0, limit),
        totals: {
          income: totalIncome,
          expense: totalExpense,
          net: totalIncome - totalExpense
        },
        pagination: {
          limit,
          offset,
          total: transactions.length
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener transacciones' },
      { status: 500 }
    )
  }
}

// POST - Create a new payment/transaction
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const { orderId, amount, paymentType, paymentMethod, referenceNumber, notes } = data

    if (!orderId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Orden y monto son requeridos' },
        { status: 400 }
      )
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: parseFloat(amount),
        paymentType: paymentType || 'PARTIAL',
        paymentMethod: paymentMethod || 'CASH',
        paymentDate: new Date(),
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        status: 'PAID',
        paidAt: new Date()
      }
    })

    // Update order payment amounts
    const newAmountPaid = Number(order.amountPaid) + parseFloat(amount)
    const newBalanceDue = Number(order.total) - newAmountPaid

    await prisma.order.update({
      where: { id: orderId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        paymentStatus: newBalanceDue <= 0 ? 'PAID' : 'PARTIAL'
      }
    })

    return NextResponse.json({
      success: true,
      data: payment,
      message: `Pago de $${parseFloat(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} registrado exitosamente`
    })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al registrar pago' },
      { status: 500 }
    )
  }
}
