import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// PUT /api/invoices/[id]/timbrar - Timbrar (issue/stamp) invoice
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update invoice status to ISSUED (Timbrada)
    const invoice = await prisma.invoice.update({
      where: {
        id: params.id
      },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        // In a real SAT integration, you would:
        // 1. Call the PAC (Proveedor Autorizado de Certificación) API
        // 2. Generate the XML with proper format
        // 3. Get the UUID from SAT
        // 4. Store the XML/PDF paths
        uuid: `UUID-${Date.now()}`, // Mock UUID for demo
        xmlPath: `/invoices/${params.id}/invoice.xml`,
        pdfPath: `/invoices/${params.id}/invoice.pdf`
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
      message: 'Factura timbrada exitosamente'
    })
  } catch (error: any) {
    console.error('Error timbrar invoice:', error)
    
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