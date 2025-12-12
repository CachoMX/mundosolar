import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

export async function POST(request: NextRequest) {
  try {
    const { clientId, newPassword, currentPassword } = await request.json()

    // If currentPassword is provided, it's a change from profile (need to verify)
    // If clientId is provided without currentPassword, it's the first-time change

    let targetClientId = clientId

    if (currentPassword) {
      // Change from profile - get clientId from token
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

      targetClientId = payload.clientId as string

      // Verify current password
      const clientWithPassword = await prisma.client.findUnique({
        where: { id: targetClientId },
        select: { password: true }
      })

      if (!clientWithPassword?.password) {
        return NextResponse.json(
          { error: 'Error al verificar contraseña' },
          { status: 400 }
        )
      }

      const isValidPassword = await bcrypt.compare(currentPassword, clientWithPassword.password)
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta' },
          { status: 400 }
        )
      }
    }

    if (!targetClientId || !newPassword) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Find the client
    const client = await prisma.client.findUnique({
      where: { id: targetClientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true
      }
    })

    if (!client || !client.isActive) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update the client's password and set requirePasswordChange to false
    await prisma.client.update({
      where: { id: targetClientId },
      data: {
        password: hashedPassword,
        requirePasswordChange: false
      }
    })

    // Create new JWT token for client session
    const token = await new SignJWT({
      clientId: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      type: 'client'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('client-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

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
