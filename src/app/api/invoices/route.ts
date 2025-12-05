import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/invoices - Fetch all invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoices = await prisma.invoice.findMany({
      include: {
        order: {
          include: {
            client: true
          }
        },
        invoiceItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: invoices
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // First, create an order for this invoice
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${data.invoiceNumber}`,
        clientId: data.clientId,
        status: 'CONFIRMED',
        orderType: 'SALE',
        subtotal: data.subtotal,
        taxAmount: data.iva,
        total: data.total,
        notes: data.notes || null
      }
    })

    // For now, we'll skip creating order items since we need product management
    // The invoice items will contain the detailed information

    // Get client data for RFC
    const client = await prisma.client.findUnique({
      where: { id: data.clientId }
    })

    if (!client) {
      throw new Error('Cliente no encontrado')
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        orderId: order.id,
        clientId: data.clientId,
        rfcEmisor: 'MUNDOSOLAR123', // This should come from company settings
        rfcReceptor: client.rfc || 'XAXX010101000', // Generic RFC if client doesn't have one
        regimenFiscal: client.regimenFiscal || '612', // Default to Personas Físicas
        usoCFDI: data.usoCFDI,
        metodoPago: data.metodoPago,
        formaPago: data.formaPago,
        subtotal: data.subtotal,
        iva: data.iva,
        total: data.total,
        status: 'PENDING',
        invoiceItems: {
          create: data.items.map((item: any) => ({
            productCode: '01010101', // Generic SAT product code
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount
          }))
        }
      },
      include: {
        invoiceItems: true,
        order: {
          include: {
            client: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'Factura creada exitosamente'
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}