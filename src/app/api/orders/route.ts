import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/orders - Fetch all orders with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')

    const where: any = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
    })

    // Get statistics
    const stats = {
      total: orders.length,
      active: orders.filter(o => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status)).length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      inProgress: orders.filter(o => o.status === 'IN_PROGRESS').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      totalValue: orders.reduce((acc, o) => acc + Number(o.total), 0),
      activeValue: orders
        .filter(o => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status))
        .reduce((acc, o) => acc + Number(o.total), 0)
    }

    // Get orders by type
    const byType = {
      sale: orders.filter(o => o.orderType === 'SALE').length,
      installation: orders.filter(o => o.orderType === 'INSTALLATION').length,
      maintenance: orders.filter(o => o.orderType === 'MAINTENANCE').length,
      warranty: orders.filter(o => o.orderType === 'WARRANTY').length
    }

    // Get orders by status
    const byStatus = {
      draft: orders.filter(o => o.status === 'DRAFT').length,
      confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
      inProgress: orders.filter(o => o.status === 'IN_PROGRESS').length,
      shipped: orders.filter(o => o.status === 'SHIPPED').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length
    }

    return NextResponse.json({
      success: true,
      data: {
        orders,
        stats,
        byType,
        byStatus
      }
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener órdenes' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
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
        { success: false, error: 'La orden debe tener al menos un producto' },
        { status: 400 }
      )
    }

    // Generate order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true }
    })

    let nextNumber = 1
    if (lastOrder?.orderNumber) {
      const match = lastOrder.orderNumber.match(/ORD-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    const orderNumber = `ORD-${nextNumber.toString().padStart(6, '0')}`

    // Calculate totals
    let subtotal = 0
    const orderItems = data.items.map((item: any) => {
      const itemTotal = item.quantity * item.unitPrice - (item.discount || 0)
      subtotal += itemTotal
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        totalPrice: itemTotal,
        notes: item.notes || null
      }
    })

    const taxRate = 0.16 // IVA 16%
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: data.clientId,
        status: data.status || 'DRAFT',
        orderType: data.orderType || 'SALE',
        requiredDate: data.requiredDate ? new Date(data.requiredDate) : null,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        orderItems: {
          create: orderItems
        }
      },
      include: {
        client: {
          select: {
            id: true,
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
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Orden creada exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear orden' },
      { status: 500 }
    )
  }
}
