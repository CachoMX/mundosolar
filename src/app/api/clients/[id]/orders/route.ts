import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/clients/[id]/orders - Get all orders for a client with invoice status
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

    // Get all orders for the client with their items and invoice status
    const orders = await withRetry(() => prisma.order.findMany({
      where: {
        clientId: id,
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
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
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            uuid: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    }))

    // Transform orders to include invoice status
    const ordersWithStatus = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      orderDate: order.orderDate,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      paymentStatus: order.paymentStatus,
      isInvoiced: !!order.invoice,
      invoice: order.invoice ? {
        id: order.invoice.id,
        invoiceNumber: order.invoice.invoiceNumber,
        status: order.invoice.status,
        uuid: order.invoice.uuid,
        createdAt: order.invoice.createdAt
      } : null,
      items: order.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productBrand: item.product.brand,
        productModel: item.product.model,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        totalPrice: Number(item.totalPrice),
        notes: item.notes
      }))
    }))

    return NextResponse.json({
      success: true,
      data: ordersWithStatus
    })
  } catch (error: any) {
    console.error('Error fetching client orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener órdenes del cliente' },
      { status: 500 }
    )
  }
}
