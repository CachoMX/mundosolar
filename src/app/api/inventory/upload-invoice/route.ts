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

// POST /api/inventory/upload-invoice - Upload an invoice for inventory
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

    // Get current user to check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para subir facturas' },
        { status: 403 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('invoice') as File | null
    const inventoryItemId = formData.get('inventoryItemId') as string | null

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
    const fileName = `invoice-${inventoryItemId || 'new'}-${timestamp}.${fileExt}`
    const filePath = `inventory-invoices/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('invoices')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)

      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('Bucket not found')) {
        try {
          await supabaseAdmin.storage.createBucket('invoices', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          })

          // Retry upload
          const { error: retryError } = await supabaseAdmin.storage
            .from('invoices')
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
      .from('invoices')
      .getPublicUrl(filePath)

    const invoiceUrl = urlData.publicUrl

    // If inventoryItemId provided, update the inventory item record
    if (inventoryItemId) {
      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { invoiceUrl }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        invoiceUrl,
        fileName,
        filePath
      }
    })
  } catch (error: any) {
    console.error('Invoice upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al subir la factura' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/upload-invoice - Delete an invoice
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
    const inventoryItemId = searchParams.get('inventoryItemId')

    if (!inventoryItemId) {
      return NextResponse.json(
        { success: false, error: 'ID de item de inventario requerido' },
        { status: 400 }
      )
    }

    // Get inventory item to find the invoice URL
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { invoiceUrl: true }
    })

    if (!inventoryItem?.invoiceUrl) {
      return NextResponse.json(
        { success: false, error: 'No hay factura para eliminar' },
        { status: 404 }
      )
    }

    // Extract file path from URL and delete from storage
    try {
      const url = new URL(inventoryItem.invoiceUrl)
      const pathParts = url.pathname.split('/storage/v1/object/public/invoices/')
      if (pathParts[1]) {
        await supabaseAdmin.storage
          .from('invoices')
          .remove([pathParts[1]])
      }
    } catch (e) {
      console.error('Error deleting invoice file:', e)
    }

    // Update inventory item to remove invoice URL
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { invoiceUrl: null }
    })

    return NextResponse.json({
      success: true,
      message: 'Factura eliminada'
    })
  } catch (error: any) {
    console.error('Invoice delete error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar la factura' },
      { status: 500 }
    )
  }
}
