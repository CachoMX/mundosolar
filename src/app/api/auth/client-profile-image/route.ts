import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// Create Supabase client with service role for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify client token
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string

    // Get form data with image
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó imagen' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use JPG, PNG, WEBP o GIF' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La imagen es muy grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `client-${clientId}-${Date.now()}.${fileExt}`
    const filePath = `profile-images/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Error al subir la imagen' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const imageUrl = urlData.publicUrl

    // Update client profile in database
    await prisma.client.update({
      where: { id: clientId },
      data: { profileImage: imageUrl }
    })

    return NextResponse.json({
      success: true,
      imageUrl
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar imagen de perfil' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify client token
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string

    // Get current profile image
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { profileImage: true }
    })

    if (client?.profileImage) {
      // Extract file path from URL and delete from storage
      const url = new URL(client.profileImage)
      const pathParts = url.pathname.split('/storage/v1/object/public/avatars/')
      if (pathParts[1]) {
        await supabaseAdmin.storage
          .from('avatars')
          .remove([pathParts[1]])
      }
    }

    // Remove profile image from database
    await prisma.client.update({
      where: { id: clientId },
      data: { profileImage: null }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Profile image delete error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar imagen de perfil' },
      { status: 500 }
    )
  }
}
