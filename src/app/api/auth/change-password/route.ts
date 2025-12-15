import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()

    // Get current user from Supabase session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Validate inputs
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'La contraseña actual es requerida' },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Find user in database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, password: true }
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verify current password - try local bcrypt first, then Supabase Auth
    let isValidPassword = false

    if (dbUser.password) {
      // User has local password, verify with bcrypt
      isValidPassword = await bcrypt.compare(currentPassword, dbUser.password)
    }

    if (!isValidPassword) {
      // Try verifying with Supabase Auth (for users who don't have local password yet)
      const tempSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: signInError } = await tempSupabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      isValidPassword = !signInError
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password in local database
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { password: hashedPassword }
    })

    // Also update in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error('Error updating Supabase Auth password:', updateError)
      // Continue anyway - local password is updated
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    )
  }
}
