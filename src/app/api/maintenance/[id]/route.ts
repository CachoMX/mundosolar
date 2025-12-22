import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/maintenance/[id] - Get maintenance details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const maintenance = await withRetry(() => prisma.maintenanceRecord.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            neighborhood: true,
            city: true,
            state: true,
            postalCode: true,
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
                phone: true,
                image: true,
              }
            }
          }
        },
        parts: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                product: {
                  select: {
                    name: true,
                    brand: true,
                    model: true,
                  }
                }
              }
            }
          }
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            changedAt: 'desc'
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    }))

    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: 'Maintenance not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: maintenance
    })
  } catch (error) {
    console.error('Error fetching maintenance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/maintenance/[id] - Update maintenance
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const {
      type,
      priority,
      scheduledDate,
      title,
      description,
      privateNotes,
      workPerformed,
      laborHours,
      cost,
      technicianIds,
      rescheduleReason
    } = body

    // If technicianIds is provided, update the technician assignments
    if (technicianIds !== undefined && Array.isArray(technicianIds)) {
      // Delete existing technician assignments
      await withRetry(() => prisma.maintenanceTechnician.deleteMany({
        where: { maintenanceId: params.id }
      }))

      // Create new technician assignments
      if (technicianIds.length > 0) {
        await withRetry(() => prisma.maintenanceTechnician.createMany({
          data: technicianIds.map((techId: string, index: number) => ({
            maintenanceId: params.id,
            technicianId: techId,
            role: index === 0 ? 'LEAD' : 'ASSISTANT'
          }))
        }))
      }
    }

    // Get the current maintenance to check if date changed
    const currentMaintenance = await withRetry(() => prisma.maintenanceRecord.findUnique({
      where: { id: params.id },
      select: {
        scheduledDate: true,
        clientId: true,
        title: true,
        status: true
      }
    }))

    const maintenance = await withRetry(() => prisma.maintenanceRecord.update({
      where: { id: params.id },
      data: {
        ...(type && { type }),
        ...(priority && { priority }),
        ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(privateNotes !== undefined && { privateNotes }),
        ...(workPerformed !== undefined && { workPerformed }),
        ...(laborHours !== undefined && { laborHours }),
        ...(cost !== undefined && { cost }),
      },
      include: {
        client: true,
        technicians: {
          include: {
            technician: true
          }
        }
      }
    }))

    // Send notification to client if scheduled date changed and maintenance is already approved
    if (scheduledDate && currentMaintenance &&
        currentMaintenance.status !== 'PENDING_APPROVAL' &&
        currentMaintenance.status !== 'CANCELLED' &&
        currentMaintenance.status !== 'COMPLETED') {

      const oldDate = currentMaintenance.scheduledDate
      const newDate = new Date(scheduledDate)

      // Check if the date actually changed (compare timestamps)
      const dateChanged = !oldDate || oldDate.getTime() !== newDate.getTime()

      if (dateChanged && currentMaintenance.clientId) {
        try {
          // Format the new date for display
          const formattedDate = newDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

          await prisma.notification.create({
            data: {
              clientId: currentMaintenance.clientId,
              type: 'maintenance_rescheduled',
              title: 'Mantenimiento Reprogramado',
              message: `Su mantenimiento "${currentMaintenance.title}" ha sido reprogramado para el ${formattedDate}`,
              data: {
                maintenanceId: params.id,
                newScheduledDate: scheduledDate,
                oldScheduledDate: oldDate?.toISOString() || null,
                rescheduleReason: rescheduleReason || null
              }
            }
          })
        } catch (notifError) {
          // Log but don't fail the request if notification creation fails
          console.warn('Could not create notification for date change:', notifError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: maintenance
    })
  } catch (error) {
    console.error('Error updating maintenance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/maintenance/[id] - Cancel maintenance
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find the Prisma user by email to get the correct ID
    const user = await withRetry(() => prisma.user.findUnique({
      where: { email: authUser.email! },
      select: { id: true }
    }))

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Don't actually delete, just mark as cancelled
    const maintenance = await withRetry(() => prisma.maintenanceRecord.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: {
            status: 'CANCELLED',
            notes: 'Mantenimiento cancelado',
            changedById: user.id,
          }
        }
      }
    }))

    return NextResponse.json({
      success: true,
      data: maintenance
    })
  } catch (error) {
    console.error('Error cancelling maintenance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
