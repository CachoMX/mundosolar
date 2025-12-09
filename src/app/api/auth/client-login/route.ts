import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// Extract last 10 digits from phone number (removing spaces, dashes, +52, etc.)
function extractLast10Digits(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '') // Remove all non-digits
  return digitsOnly.slice(-10) // Get last 10 digits
}

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Teléfono y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Validate phone format: only 10 digits, no spaces, dashes, or special characters
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'El teléfono debe ser exactamente 10 dígitos sin espacios ni guiones' },
        { status: 400 }
      )
    }

    const inputLast10 = phone

    // Get all active clients with phone numbers
    const clients = await prisma.client.findMany({
      where: {
        phone: { not: null },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        password: true,
        requirePasswordChange: true
      }
    })

    // Find client by comparing last 10 digits of phone
    const client = clients.find(c => {
      if (!c.phone) return false
      const clientLast10 = extractLast10Digits(c.phone)
      return clientLast10 === inputLast10
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Teléfono o contraseña incorrectos' },
        { status: 401 }
      )
    }

    if (!client.password) {
      return NextResponse.json(
        { error: 'Esta cuenta no tiene contraseña configurada. Contacte al administrador.' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, client.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Teléfono o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Create JWT token for client session
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
      clientId: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      requirePasswordChange: client.requirePasswordChange
    })
  } catch (error) {
    console.error('Client login error:', error)
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    )
  }
}
