import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// GET /api/cliente/sistemas - Get all solar systems for the client
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string

    // Get all solar systems for this client
    const systems = await prisma.solarSystem.findMany({
      where: {
        clientId,
        isActive: true
      },
      select: {
        id: true,
        systemName: true,
        capacity: true,
        installationDate: true
      },
      orderBy: {
        systemName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: systems.map(s => ({
        id: s.id,
        name: s.systemName,
        capacity: s.capacity ? Number(s.capacity) : null,
        installationDate: s.installationDate?.toISOString() || null
      }))
    })
  } catch (error) {
    console.error('Error fetching client solar systems:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar sistemas solares' },
      { status: 500 }
    )
  }
}
