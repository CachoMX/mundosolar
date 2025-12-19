import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { cancelarCFDI, validateConfig } from '@/lib/facturalo-plus'

export const dynamic = 'force-dynamic'

// Motivos de cancelación según SAT
const MOTIVOS_CANCELACION = {
  '01': 'Comprobante emitido con errores con relación',
  '02': 'Comprobante emitido con errores sin relación',
  '03': 'No se llevó a cabo la operación',
  '04': 'Operación nominativa relacionada en una factura global'
}

// PUT /api/invoices/[id]/cancel - Cancel invoice
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional cancellation reason from request body
    let motivo = '02' // Default: Error sin relación
    let folioSustitucion = ''

    try {
      const body = await request.json()
      if (body.motivo && MOTIVOS_CANCELACION[body.motivo as keyof typeof MOTIVOS_CANCELACION]) {
        motivo = body.motivo
      }
      if (body.folioSustitucion) {
        folioSustitucion = body.folioSustitucion
      }
    } catch {
      // No body provided, use defaults
    }

    // Check if invoice exists and can be cancelled
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            client: true
          }
        }
      }
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

    // If invoice is ISSUED (timbrada), we need to cancel with SAT
    if (existingInvoice.status === 'ISSUED' && existingInvoice.uuid) {
      const configValidation = validateConfig()

      if (!configValidation.isValid) {
        // For demo mode, allow cancellation without SAT
        if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_TIMBRADO === 'true') {
          console.warn('Using MOCK cancellation - configure Factura-lo Plus for production')

          const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date()
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
            data: updatedInvoice,
            message: 'Factura cancelada exitosamente (MODO DEMO)',
            isMock: true
          })
        }

        return NextResponse.json({
          success: false,
          error: 'Configuración de facturación incompleta. Contacte al administrador.'
        }, { status: 500 })
      }

      // Cancel with Factura-lo Plus / SAT
      console.log('Cancelling invoice with SAT:', existingInvoice.invoiceNumber, existingInvoice.uuid)

      const cancelResult = await cancelarCFDI({
        uuid: existingInvoice.uuid,
        rfcReceptor: existingInvoice.order.client.rfc || 'XAXX010101000',
        total: Number(existingInvoice.total),
        motivo,
        folioSustitucion: motivo === '01' ? folioSustitucion : undefined
      })

      if (!cancelResult.success) {
        console.error('Cancellation failed:', cancelResult.error)
        return NextResponse.json({
          success: false,
          error: cancelResult.error || 'Error al cancelar la factura en el SAT',
          codigoError: cancelResult.codigoError
        }, { status: 400 })
      }

      // Update invoice with cancellation data
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
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
        data: {
          ...updatedInvoice,
          cancelacion: {
            acuse: cancelResult.acuse,
            fechaCancelacion: cancelResult.fechaCancelacion,
            estatusUUID: cancelResult.estatusUUID,
            motivo: MOTIVOS_CANCELACION[motivo as keyof typeof MOTIVOS_CANCELACION]
          }
        },
        message: 'Factura cancelada exitosamente en el SAT'
      })
    }

    // For PENDING invoices, just update status (no SAT call needed)
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
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
