import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT /api/invoices/[id]/cancel - Cancel invoice
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if invoice exists and can be cancelled
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id }
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    if (existingInvoice.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'La factura ya está cancelada' },
        { status: 400 }
      )
    }

    if (existingInvoice.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'No se puede cancelar una factura pagada' },
        { status: 400 }
      )
    }

    // Update invoice status to CANCELLED
    const invoice = await prisma.invoice.update({
      where: {
        id: params.id
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
        // In a real SAT integration, you would:
        // 1. Call the PAC API to cancel the invoice
        // 2. Update the SAT status
        // 3. Generate cancellation acknowledgment
      },
      include: {
        order: {
          include: {
            client: true
          }
        },
        invoiceItems: true
      }
    })

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'Factura cancelada exitosamente'
    })
  } catch (error: any) {
    console.error('Error canceling invoice:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}