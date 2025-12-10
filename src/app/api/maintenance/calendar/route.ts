import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/maintenance/calendar - Calendar events
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
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
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json(
        { success: false, error: 'start and end dates are required' },
        { status: 400 }
      )
    }

    const maintenances = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          gte: new Date(start),
          lte: new Date(end)
        },
        // Exclude cancelled maintenances from admin calendar
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        solarSystem: {
          select: {
            systemName: true,
          }
        },
        technicians: {
          include: {
            technician: {
              select: {
                name: true,
              }
            }
          },
          take: 1
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })

    // Transform to calendar events format
    const events = maintenances.map(m => ({
      id: m.id,
      title: m.title,
      start: m.scheduledDate,
      end: m.scheduledDate, // Same as start for now
      resource: {
        type: m.type,
        status: m.status,
        priority: m.priority,
        client: m.client,
        solarSystem: m.solarSystem,
        technician: m.technicians[0]?.technician.name || 'Sin asignar',
        technicians: m.technicians.map(t => ({
          technician: { name: t.technician.name }
        })),
      },
      // Color coding by status
      backgroundColor: getStatusColor(m.status),
      borderColor: getStatusColor(m.status),
    }))

    return NextResponse.json({
      success: true,
      data: events
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING_APPROVAL':
      return '#f59e0b' // Orange
    case 'SCHEDULED':
      return '#3b82f6' // Blue
    case 'IN_PROGRESS':
      return '#8b5cf6' // Purple
    case 'COMPLETED':
      return '#10b981' // Green
    case 'CANCELLED':
      return '#ef4444' // Red
    default:
      return '#6b7280' // Gray
  }
}
