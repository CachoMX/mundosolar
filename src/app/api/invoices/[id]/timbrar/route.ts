import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import {
  timbrarJSON,
  buildCFDIJSON,
  validateConfig
} from '@/lib/facturalo-plus'

export const dynamic = 'force-dynamic'

// PUT /api/invoices/[id]/timbrar - Timbrar (issue/stamp) invoice with Factura-lo Plus
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
      return NextResponse.json(
        { success: false, error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    if (invoice.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden timbrar facturas pendientes' },
        { status: 400 }
      )
    }

    // Validate Factura-lo Plus configuration
    const configValidation = validateConfig()
    if (!configValidation.isValid) {
      console.error('Factura-lo Plus configuration missing:', configValidation.missing)

      // For demo/testing purposes, use mock timbrado if not configured
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_TIMBRADO === 'true') {
        console.warn('Using MOCK timbrado - configure Factura-lo Plus for production')

        const mockUuid = `${Date.now()}-${Math.random().toString(36).substring(7)}`.toUpperCase()

        const updatedInvoice = await prisma.invoice.update({
          where: { id },
          data: {
            status: 'ISSUED',
            issuedAt: new Date(),
            uuid: mockUuid,
            xmlPath: `/invoices/${id}/invoice.xml`,
            pdfPath: `/invoices/${id}/invoice.pdf`
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
          message: 'Factura timbrada exitosamente (MODO DEMO)',
          isMock: true
        })
      }

      return NextResponse.json({
        success: false,
        error: 'Configuración de facturación incompleta. Contacte al administrador.',
        details: `Faltan: ${configValidation.missing.join(', ')}`
      }, { status: 500 })
    }

    const client = invoice.order.client

    // Validate client has required fiscal data
    if (!client.rfc) {
      return NextResponse.json({
        success: false,
        error: 'El cliente no tiene RFC registrado. Por favor actualice los datos fiscales del cliente.'
      }, { status: 400 })
    }

    if (!client.postalCode) {
      return NextResponse.json({
        success: false,
        error: 'El cliente no tiene código postal registrado. Por favor actualice los datos del cliente.'
      }, { status: 400 })
    }

    // Build CFDI JSON structure
    const cfdiData = buildCFDIJSON({
      serie: invoice.invoiceNumber.split('-')[0] || 'FAC',
      folio: invoice.invoiceNumber.split('-').slice(1).join('-') || invoice.invoiceNumber,
      formaPago: invoice.formaPago,
      metodoPago: invoice.metodoPago,
      subtotal: Number(invoice.subtotal),
      iva: Number(invoice.iva),
      total: Number(invoice.total),
      receptor: {
        rfc: client.rfc,
        nombre: `${client.firstName} ${client.lastName}`,
        usoCFDI: invoice.usoCFDI,
        codigoPostal: client.postalCode,
        regimenFiscal: client.regimenFiscal || '612' // Default to Personas Físicas
      },
      conceptos: invoice.invoiceItems.map(item => ({
        claveProdServ: item.productCode || '01010101', // Generic code
        claveUnidad: item.unit === 'PZA' ? 'H87' : 'E48', // H87 for pieces, E48 for service
        unidad: item.unit || 'PZA',
        cantidad: Number(item.quantity),
        descripcion: item.description,
        valorUnitario: Number(item.unitPrice),
        importe: Number(item.amount)
      }))
    })

    // Call Factura-lo Plus API to timbrar
    console.log('Timbring invoice with Factura-lo Plus:', invoice.invoiceNumber)
    const timbradoResult = await timbrarJSON(cfdiData)

    if (!timbradoResult.success) {
      console.error('Timbrado failed:', timbradoResult.error)
      return NextResponse.json({
        success: false,
        error: timbradoResult.error || 'Error al timbrar la factura',
        codigoError: timbradoResult.codigoError
      }, { status: 400 })
    }

    // Store XML and PDF in storage (you might want to use Supabase Storage or S3)
    // For now, we'll store the paths and keep the actual files in a separate storage
    let xmlPath = null
    let pdfPath = null

    if (timbradoResult.xmlTimbrado) {
      // In production, save to Supabase Storage or S3
      xmlPath = `/invoices/${id}/cfdi.xml`
      // TODO: Actually save the XML file
      console.log('XML received, length:', timbradoResult.xmlTimbrado.length)
    }

    if (timbradoResult.pdfBase64) {
      pdfPath = `/invoices/${id}/cfdi.pdf`
      // TODO: Actually save the PDF file
      console.log('PDF received (base64), length:', timbradoResult.pdfBase64.length)
    }

    // Update invoice with timbrado data
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        uuid: timbradoResult.uuid,
        xmlPath,
        pdfPath
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
        timbrado: {
          uuid: timbradoResult.uuid,
          fechaTimbrado: timbradoResult.fechaTimbrado,
          noCertificadoSAT: timbradoResult.noCertificadoSAT
        }
      },
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
