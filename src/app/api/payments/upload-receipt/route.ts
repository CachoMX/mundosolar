import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Create Supabase client with service role for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/payments/upload-receipt - Upload a receipt for a payment
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('receipt') as File | null
    const paymentId = formData.get('paymentId') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // Validate file type (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido. Use JPG, PNG, WEBP o PDF' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'El archivo es muy grande. Máximo 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `receipt-${paymentId || 'new'}-${timestamp}.${fileExt}`
    const filePath = `payment-receipts/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)

      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('Bucket not found')) {
        try {
          await supabaseAdmin.storage.createBucket('receipts', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          })

          // Retry upload
          const { error: retryError } = await supabaseAdmin.storage
            .from('receipts')
            .upload(filePath, buffer, {
              contentType: file.type,
              upsert: true
            })

          if (retryError) {
            console.error('Retry upload error:', retryError)
            return NextResponse.json(
              { success: false, error: 'Error al subir el archivo' },
              { status: 500 }
            )
          }
        } catch (bucketError) {
          console.error('Bucket creation error:', bucketError)
          return NextResponse.json(
            { success: false, error: 'Error al crear el almacenamiento' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Error al subir el archivo' },
          { status: 500 }
        )
      }
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(filePath)

    const receiptUrl = urlData.publicUrl

    // If paymentId provided, update the payment record
    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { receiptUrl }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        receiptUrl,
        fileName,
        filePath
      }
    })
  } catch (error: any) {
    console.error('Receipt upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir el recibo' },
      { status: 500 }
    )
  }
}

// DELETE /api/payments/upload-receipt - Delete a receipt
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'ID de pago requerido' },
        { status: 400 }
      )
    }

    // Get payment to find the receipt URL
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { receiptUrl: true }
    })

    if (!payment?.receiptUrl) {
      return NextResponse.json(
        { success: false, error: 'No hay recibo para eliminar' },
        { status: 404 }
      )
    }

    // Extract file path from URL and delete from storage
    try {
      const url = new URL(payment.receiptUrl)
      const pathParts = url.pathname.split('/storage/v1/object/public/receipts/')
      if (pathParts[1]) {
        await supabaseAdmin.storage
          .from('receipts')
          .remove([pathParts[1]])
      }
    } catch (e) {
      console.error('Error deleting receipt file:', e)
    }

    // Update payment to remove receipt URL
    await prisma.payment.update({
      where: { id: paymentId },
      data: { receiptUrl: null }
    })

    return NextResponse.json({
      success: true,
      message: 'Recibo eliminado'
    })
  } catch (error: any) {
    console.error('Receipt delete error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar el recibo' },
      { status: 500 }
    )
  }
}
