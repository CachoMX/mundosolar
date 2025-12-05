import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/admin/solar-systems - Fetch all client solar systems (admin only)
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Admin solar systems API called')
    const session = await getServerSession()
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Session found:', session.user?.email)

    // TODO: Check if user is admin
    // For now, we'll allow all authenticated users

    // Get all clients with Growatt credentials
    console.log('🔍 Searching for clients with Growatt credentials...')
    
    // Debug: Check total clients first
    const totalClients = await prisma.client.count()
    console.log(`🔢 Total clients in database: ${totalClients}`)
    
    const clientsWithGrowatt = await prisma.client.findMany({
      where: {
        AND: [
          { growattUsername: { not: null } },
          { growattUsername: { not: '' } },
          { isActive: true }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        growattUsername: true,
        growattPassword: true,
        expectedDailyGeneration: true,
        createdAt: true,
        solarSystems: {
          select: {
            id: true,
            systemName: true,
            capacity: true,
            installationDate: true,
            isActive: true,
            estimatedGeneration: true
          }
        },
        growattCredentials: {
          select: {
            id: true,
            isActive: true,
            lastSync: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    console.log(`📊 Found ${clientsWithGrowatt.length} clients with Growatt credentials`)
    console.log('👥 Clients:', clientsWithGrowatt.map(c => `${c.firstName} ${c.lastName} (${c.growattUsername})`))
    
    // Debug: Also check without the isActive filter
    const allWithGrowatt = await prisma.client.findMany({
      where: {
        AND: [
          { growattUsername: { not: null } },
          { growattUsername: { not: '' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        growattUsername: true,
        isActive: true
      }
    })
    
    console.log(`🔍 All clients with Growatt (including inactive): ${allWithGrowatt.length}`)
    console.log('📝 Sample clients:', allWithGrowatt.slice(0, 5).map(c => 
      `${c.firstName} ${c.lastName} (${c.growattUsername}) - Active: ${c.isActive}`
    ))

    return NextResponse.json({
      success: true,
      data: clientsWithGrowatt,
      count: clientsWithGrowatt.length
    })
  } catch (error) {
    console.error('Error fetching client solar systems:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}