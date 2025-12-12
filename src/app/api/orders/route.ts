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

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        notes: item.notes || null
      }
    })

    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    // Create order with items
    const order = await withRetry(() => prisma.order.create({
      data: {
        orderNumber,
        clientId: data.clientId,
        status: data.status || 'DRAFT',
        orderType: data.orderType || 'SALE',
        orderDate: new Date(),
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
        createdBy: user.id,
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

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount)
      },
      message: 'Orden creada exitosamente'
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
