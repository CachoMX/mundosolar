import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/invoices/[id] - Fetch single invoice
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: params.id
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

    if (!invoice) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: invoice
    })
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}