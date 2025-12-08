import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/growatt-credentials
 * Get all Growatt credentials
 */
export async function GET(request: NextRequest) {
  try {
    const credentials = await prisma.growattCredentials.findMany({
      select: {
        id: true,
        clientId: true,
        username: true,
        isActive: true,
        lastSync: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ credentials })
  } catch (error) {
    console.error('Error fetching credentials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/growatt-credentials
 * Create new Growatt credentials for a client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, username, password } = body

    if (!clientId || !username || !password) {
      return NextResponse.json(
        { error: 'clientId, username, and password are required' },
        { status: 400 }
      )
    }

    // Check if credentials already exist for this client
    const existing = await prisma.growattCredentials.findUnique({
      where: { clientId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Credentials already exist for this client' },
        { status: 400 }
      )
    }

    // Create credentials
    const credential = await prisma.growattCredentials.create({
      data: {
        clientId,
        username,
        password, // In production, encrypt this!
        isActive: true,
      },
      select: {
        id: true,
        clientId: true,
        username: true,
        isActive: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ credential }, { status: 201 })
  } catch (error) {
    console.error('Error creating credentials:', error)
    return NextResponse.json(
      { error: 'Failed to create credentials' },
      { status: 500 }
    )
  }
}
