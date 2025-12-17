import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/orders - Fetch all orders with stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all orders with client info
    const orders = await withRetry(() => prisma.order.findMany({
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    // Get stats
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [activeCount, draftCount, confirmedCount, inProgressCount, shippedCount, completedCount, cancelledCount, totalValue, monthlyCompleted] = await Promise.all([
      withRetry(() => prisma.order.count({
        where: { status: { in: ['CONFIRMED', 'IN_PROGRESS', 'SHIPPED'] } }
      })),
      withRetry(() => prisma.order.count({
        where: { status: 'DRAFT' }
      })),
      withRetry(() => prisma.order.count({
        where: { status: 'CONFIRMED' }
      })),
      withRetry(() => prisma.order.count({
        where: { status: 'IN_PROGRESS' }
      })),
      withRetry(() => prisma.order.count({
        where: { status: 'SHIPPED' }
      })),
      withRetry(() => prisma.order.count({
        where: { status: 'COMPLETED' }
      })),
      withRetry(() => prisma.order.count({
        where: { status: 'CANCELLED' }
      })),
      withRetry(() => prisma.order.aggregate({
        where: { status: { notIn: ['CANCELLED', 'DRAFT'] } },
        _sum: { total: true }
      })),
      withRetry(() => prisma.order.count({
        where: {
          status: 'COMPLETED',
          completedDate: { gte: startOfMonth }
        }
      }))
    ])

    // Get order type distribution
    const orderTypes = await withRetry(() => prisma.order.groupBy({
      by: ['orderType'],
      _count: { orderType: true },
      where: { status: { not: 'CANCELLED' } }
    }))

    const totalOrders = orderTypes.reduce((sum, t) => sum + t._count.orderType, 0)
    const typeDistribution = orderTypes.map(t => ({
      type: t.orderType,
      count: t._count.orderType,
      percentage: totalOrders > 0 ? Math.round((t._count.orderType / totalOrders) * 100) : 0
    }))

    return NextResponse.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          ...order,
          total: Number(order.total),
          subtotal: Number(order.subtotal),
          taxAmount: Number(order.taxAmount),
          taxRate: Number(order.taxRate),
          orderItems: order.orderItems.map(item => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            totalPrice: Number(item.totalPrice)
          }))
        })),
        stats: {
          active: activeCount,
          draft: draftCount,
          confirmed: confirmedCount,
          inProgress: inProgressCount,
          shipped: shippedCount,
          completed: completedCount,
          cancelled: cancelledCount,
          monthlyCompleted,
          totalValue: Number(totalValue._sum.total) || 0
        },
        typeDistribution
      }
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Helper function to deduct inventory for order items
async function deductInventoryForOrder(orderItems: any[], orderNumber: string) {
  const inventoryResults = []

  for (const item of orderItems) {
    const productId = item.productId
    const quantity = item.quantity

    // Find inventory items for this product (ordered by quantity to deduct from largest first)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { productId },
      orderBy: { quantity: 'desc' }
    })

    if (inventoryItems.length === 0) {
      inventoryResults.push({
        productId,
        success: false,
        message: 'No hay inventario para este producto'
      })
      continue
    }

    let remainingToDeduct = quantity

    for (const inventoryItem of inventoryItems) {
      if (remainingToDeduct <= 0) break
      if (inventoryItem.quantity <= 0) continue

      const deductAmount = Math.min(remainingToDeduct, inventoryItem.quantity)

      // Update inventory item quantity
      await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: inventoryItem.quantity - deductAmount }
      })

      // Create movement record
      await prisma.inventoryMovement.create({
        data: {
          type: 'SALE',
          quantity: deductAmount,
          fromItemId: inventoryItem.id,
          reason: `Orden ${orderNumber}`,
          notes: `Salida automática por creación de orden`
        }
      })

      remainingToDeduct -= deductAmount
    }

    inventoryResults.push({
      productId,
      success: true,
      deducted: quantity - remainingToDeduct,
      pending: remainingToDeduct
    })
  }

  return inventoryResults
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Buscar el usuario de Prisma por email
    const prismaUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true }
    })

    const data = await request.json()

    // Validate required fields
    if (!data.clientId) {
      return NextResponse.json(
        { success: false, error: 'Cliente es requerido' },
        { status: 400 }
      )
    }

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debe agregar al menos un producto' },
        { status: 400 }
      )
    }

    // Generate order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    })

    let nextNumber = 1
    if (lastOrder) {
      const match = lastOrder.orderNumber.match(/ORD-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    const orderNumber = `ORD-${String(nextNumber).padStart(5, '0')}`

    // Calculate totals
    const taxRate = data.taxRate ?? 0.16
    let subtotal = 0

    const orderItems = data.items.map((item: any) => {
      const unitPrice = Number(item.unitPrice)
      const quantity = Number(item.quantity)
      const discount = Number(item.discount) || 0
      const totalPrice = (unitPrice * quantity) - discount
      subtotal += totalPrice

      return {
        productId: item.productId,
        quantity,
        unitPrice,
        discount,
        totalPrice,
        notes: item.notes || null,
        serialNumbers: item.serialNumbers || []
      }
    })

    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    const orderStatus = data.status || 'DRAFT'

    // Calculate payment fields
    const depositRequired = data.depositRequired || false
    const depositPercentage = data.depositPercentage ? Number(data.depositPercentage) : 50
    const depositAmount = data.depositAmount ? Number(data.depositAmount) : (depositRequired ? total * depositPercentage / 100 : null)

    // Calculate initial payment amount if provided
    const initialPaymentAmount = data.initialPayment ? Number(data.initialPayment.amount) : 0
    const amountPaid = initialPaymentAmount
    const balanceDue = total - amountPaid
    const paymentStatus = amountPaid === 0 ? 'PENDING' : (amountPaid >= total ? 'PAID' : 'PARTIAL')

    // Create order with items
    const order = await withRetry(() => prisma.order.create({
      data: {
        orderNumber,
        clientId: data.clientId,
        addressId: data.addressId || null,
        cfeReceiptId: data.cfeReceiptId || null,
        status: orderStatus,
        orderType: data.orderType || 'SALE',
        orderDate: new Date(),
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        // Payment tracking fields
        depositRequired,
        depositPercentage: depositRequired ? depositPercentage : null,
        depositAmount: depositAmount,
        amountPaid,
        balanceDue,
        paymentStatus,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
        createdBy: prismaUser?.id || null,
        orderItems: {
          create: orderItems
        }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: true
          }
        }
      }
    }))

    // Create initial payment record if provided
    if (data.initialPayment && initialPaymentAmount > 0) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: initialPaymentAmount,
          paymentType: data.initialPayment.paymentType || 'DEPOSIT',
          paymentMethod: data.initialPayment.paymentMethod || null,
          paymentDate: new Date(),
          referenceNumber: data.initialPayment.referenceNumber || null,
          notes: data.initialPayment.notes || null,
          receivedById: prismaUser?.id || null,
        }
      })
    }

    // If order is CONFIRMED, automatically deduct inventory
    let inventoryDeduction = null
    if (orderStatus === 'CONFIRMED') {
      try {
        inventoryDeduction = await deductInventoryForOrder(order.orderItems, orderNumber)
      } catch (inventoryError) {
        console.error('Error deducting inventory:', inventoryError)
        // Don't fail the order creation, just log the error
      }
    }

    // Build success message
    let message = 'Orden creada exitosamente'
    if (orderStatus === 'CONFIRMED') {
      message = 'Orden creada y inventario actualizado exitosamente'
    }
    if (data.initialPayment && initialPaymentAmount > 0) {
      message += `. Pago de $${initialPaymentAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} registrado`
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        amountPaid: Number(order.amountPaid),
        balanceDue: Number(order.balanceDue),
        depositAmount: order.depositAmount ? Number(order.depositAmount) : null,
        depositPercentage: order.depositPercentage ? Number(order.depositPercentage) : null,
      },
      inventoryDeduction,
      message
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
