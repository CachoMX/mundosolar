import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Supabase admin client for password updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, email, role, department, employeeId, isActive, currentPassword, newPassword, confirmPassword } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado'
        },
        { status: 404 }
      )
    }

    // If email is being changed, check it's not taken
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })

      if (emailTaken) {
        return NextResponse.json(
          {
            success: false,
            error: 'El email ya está registrado'
          },
          { status: 400 }
        )
      }
    }

    // Handle password change
    let hashedPassword = undefined
    if (newPassword) {
      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json(
          {
            success: false,
            error: 'La nueva contraseña debe tener al menos 6 caracteres'
          },
          { status: 400 }
        )
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Las contraseñas no coinciden'
          },
          { status: 400 }
        )
      }

      // Verify current password
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debes ingresar la contraseña actual'
          },
          { status: 400 }
        )
      }

      // Try to verify with local bcrypt first, then Supabase Auth
      let isValidPassword = false

      if (existingUser.password) {
        isValidPassword = await bcrypt.compare(currentPassword, existingUser.password)
      }

      if (!isValidPassword && existingUser.email) {
        // Try Supabase Auth verification
        const tempSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { error: signInError } = await tempSupabase.auth.signInWithPassword({
          email: existingUser.email,
          password: currentPassword
        })
        isValidPassword = !signInError
      }

      if (!isValidPassword) {
        return NextResponse.json(
          {
            success: false,
            error: 'La contraseña actual es incorrecta'
          },
          { status: 400 }
        )
      }

      // Hash the new password
      hashedPassword = await bcrypt.hash(newPassword, 10)

      // Also update in Supabase Auth
      const { data: supabaseUsers } = await supabaseAdmin.auth.admin.listUsers()
      const supabaseUser = supabaseUsers?.users?.find(u => u.email === existingUser.email)

      if (supabaseUser) {
        await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
          password: newPassword
        })
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || existingUser.name,
        email: email || existingUser.email,
        role: role || existingUser.role,
        department: department !== undefined ? department : existingUser.department,
        employeeId: employeeId !== undefined ? employeeId : existingUser.employeeId,
        isActive: isActive !== undefined ? isActive : existingUser.isActive,
        ...(hashedPassword && { password: hashedPassword })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: hashedPassword ? 'Usuario y contraseña actualizados exitosamente' : 'Usuario actualizado exitosamente',
      data: updatedUser
    })

  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar usuario'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado'
        },
        { status: 404 }
      )
    }

    // Delete user (or soft delete by setting isActive to false)
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    })

  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar usuario'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
