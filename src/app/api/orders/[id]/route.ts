import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/orders/[id] - Get single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await withRetry(() => prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        invoice: true
      }
    }))

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        taxRate: Number(order.taxRate),
        amountPaid: Number(order.amountPaid) || 0,
        balanceDue: order.balanceDue ? Number(order.balanceDue) : Number(order.total),
        depositAmount: order.depositAmount ? Number(order.depositAmount) : null,
        depositPercentage: order.depositPercentage ? Number(order.depositPercentage) : null,
        orderItems: order.orderItems.map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          totalPrice: Number(item.totalPrice)
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[id] - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (data.status) {
      updateData.status = data.status

      // Set dates based on status changes
      if (data.status === 'SHIPPED' && !existingOrder.shippingDate) {
        updateData.shippingDate = new Date()
      }
      if (data.status === 'COMPLETED' && !existingOrder.completedDate) {
        updateData.completedDate = new Date()
      }
    }

    if (data.orderType) updateData.orderType = data.orderType
    if (data.requiredDate) updateData.requiredDate = new Date(data.requiredDate)
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress
    if (data.notes !== undefined) updateData.notes = data.notes

    // If items are being updated, recalculate totals
    if (data.items && data.items.length > 0) {
      // Delete existing items
      await prisma.orderItem.deleteMany({
        where: { orderId: id }
      })

      // Calculate new totals
      const taxRate = data.taxRate ?? Number(existingOrder.taxRate)
      let subtotal = 0

      const orderItems = data.items.map((item: any) => {
        const unitPrice = Number(item.unitPrice)
        const quantity = Number(item.quantity)
        const discount = Number(item.discount) || 0
        const totalPrice = (unitPrice * quantity) - discount
        subtotal += totalPrice

        return {
          orderId: id,
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

      updateData.subtotal = subtotal
      updateData.taxRate = taxRate
      updateData.taxAmount = taxAmount
      updateData.total = total

      // Create new items
      await prisma.orderItem.createMany({
        data: orderItems
      })
    }

    // Update order
    const order = await withRetry(() => prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
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
      message: 'Orden actualizada exitosamente'
    })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if order exists and has no invoice
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { invoice: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    if (existingOrder.invoice) {
      return NextResponse.json(
        { success: false, error: 'No se puede eliminar una orden con factura asociada' },
        { status: 400 }
      )
    }

    // Delete order (cascade will delete items)
    await withRetry(() => prisma.order.delete({
      where: { id }
    }))

    return NextResponse.json({
      success: true,
      message: 'Orden eliminada exitosamente'
    })
  } catch (error: any) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
