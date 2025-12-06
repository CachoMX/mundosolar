import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/solar-systems - Fetch all solar systems with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    const where: any = { isActive: true }
    if (clientId) where.clientId = clientId

    const solarSystems = await prisma.solarSystem.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        components: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true
              }
            }
          }
        },
        energyReadings: {
          take: 30,
          orderBy: {
            readingDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate stats
    const stats = {
      total: solarSystems.length,
      totalCapacity: solarSystems.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0),
      totalGeneration: solarSystems.reduce((sum, s) => {
        const monthlyGen = s.energyReadings.reduce((rSum, r) => rSum + (Number(r.dailyGeneration) || 0), 0)
        return sum + monthlyGen
      }, 0),
      totalCO2Saved: solarSystems.reduce((sum, s) => {
        const co2 = s.energyReadings.reduce((rSum, r) => rSum + (Number(r.co2Saved) || 0), 0)
        return sum + co2
      }, 0)
    }

    return NextResponse.json({
      success: true,
      data: solarSystems,
      stats
    })
  } catch (error: any) {
    console.error('Error fetching solar systems:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener sistemas solares' },
      { status: 500 }
    )
  }
}

// POST /api/solar-systems - Create new solar system
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data.clientId) {
      return NextResponse.json(
        { success: false, error: 'Cliente es requerido' },
        { status: 400 }
      )
    }

    if (!data.systemName) {
      return NextResponse.json(
        { success: false, error: 'Nombre del sistema es requerido' },
        { status: 400 }
      )
    }

    const solarSystem = await prisma.solarSystem.create({
      data: {
        systemName: data.systemName,
        clientId: data.clientId,
        orderId: data.orderId || null,
        installationDate: data.installationDate ? new Date(data.installationDate) : null,
        capacity: data.capacity ? parseFloat(data.capacity) : null,
        estimatedGeneration: data.estimatedGeneration ? parseFloat(data.estimatedGeneration) : null,
        warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
        notes: data.notes || null,
        isActive: true
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: solarSystem,
      message: 'Sistema solar creado exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating solar system:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear sistema solar' },
      { status: 500 }
    )
  }
}
