import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, email, role, department, employeeId, isActive } = body

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

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || existingUser.name,
        email: email || existingUser.email,
        role: role || existingUser.role,
        department: department !== undefined ? department : existingUser.department,
        employeeId: employeeId !== undefined ? employeeId : existingUser.employeeId,
        isActive: isActive !== undefined ? isActive : existingUser.isActive
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
      message: 'Usuario actualizado exitosamente',
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
