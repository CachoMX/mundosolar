import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/maintenance - List maintenances with filters
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const clientId = searchParams.get('clientId')
    const technicianId = searchParams.get('technicianId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}

    if (status) where.status = status
    if (type) where.type = type
    if (clientId) where.clientId = clientId

    if (technicianId) {
      where.technicians = {
        some: {
          technicianId: technicianId
        }
      }
    }

    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const maintenances = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        solarSystem: {
          select: {
            id: true,
            systemName: true,
            capacity: true,
          }
        },
        technicians: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: maintenances
    })
  } catch (error) {
    console.error('Error fetching maintenances:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance - Create new maintenance
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Prisma user by email
    const prismaUser = await prisma.user.findFirst({
      where: { email: authUser.email },
      select: { id: true }
    })

    const body = await request.json()
    const {
      clientId,
      solarSystemId,
      type,
      priority,
      scheduledDate,
      title,
      description,
      privateNotes,
      technicianIds
    } = body

    // When admin creates maintenance, it's automatically SCHEDULED (approved)
    const maintenanceStatus = 'SCHEDULED'

    // Create maintenance
    const maintenance = await prisma.maintenanceRecord.create({
      data: {
        clientId,
        solarSystemId: solarSystemId || null,
        type,
        priority: priority || 'SCHEDULED',
        status: maintenanceStatus,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        title,
        description,
        privateNotes,
        createdBy: prismaUser?.id || null,
        // Create status history
        statusHistory: prismaUser ? {
          create: {
            status: maintenanceStatus,
            notes: 'Mantenimiento programado por administrador',
            changedById: prismaUser.id,
          }
        } : undefined,
        // Assign technicians
        technicians: technicianIds && technicianIds.length > 0 ? {
          create: technicianIds.map((techId: string, index: number) => ({
            technicianId: techId,
            role: index === 0 ? 'Lead' : 'Assistant'
          }))
        } : undefined
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        technicians: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })

    // Create notification for client (admin-created maintenances are always SCHEDULED)
    if (scheduledDate) {
      await prisma.notification.create({
        data: {
          clientId: clientId,
          type: 'maintenance_scheduled',
          title: 'Mantenimiento Programado',
          message: `Se ha programado un mantenimiento "${title}" para el ${new Date(scheduledDate).toLocaleDateString('es-MX')}`,
          data: {
            maintenanceId: maintenance.id,
            scheduledDate: scheduledDate
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: maintenance
    })
  } catch (error) {
    console.error('Error creating maintenance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
