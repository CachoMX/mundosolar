import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Create Supabase client with service role for storage operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name)
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

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
    const fileName = `admin-${user.id}-${Date.now()}.${fileExt}`
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

    // Update user metadata with avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: imageUrl }
    })

    if (updateError) {
      console.error('Update user error:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar perfil' },
        { status: 500 }
      )
    }

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
    const supabase = await getServerSupabase()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Get current avatar URL from user metadata
    const avatarUrl = user.user_metadata?.avatar_url

    if (avatarUrl) {
      // Extract file path from URL and delete from storage
      try {
        const url = new URL(avatarUrl)
        const pathParts = url.pathname.split('/storage/v1/object/public/avatars/')
        if (pathParts[1]) {
          await supabaseAdmin.storage
            .from('avatars')
            .remove([pathParts[1]])
        }
      } catch (e) {
        console.error('Error deleting old image:', e)
      }
    }

    // Remove avatar URL from user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: null }
    })

    if (updateError) {
      console.error('Update user error:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar perfil' },
        { status: 500 }
      )
    }

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
