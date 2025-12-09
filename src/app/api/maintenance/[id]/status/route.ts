import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// PATCH /api/maintenance/[id]/status - Change maintenance status
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Prisma user by email to get the correct ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, notes, scheduledDate, technicianIds } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      statusHistory: {
        create: {
          status,
          notes: notes || null,
          changedById: user.id,
        }
      }
    }

    // When approving (changing to SCHEDULED), allow setting the scheduled date
    if (status === 'SCHEDULED' && scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate)
    }

    // Update dates based on status
    if (status === 'IN_PROGRESS' && !updateData.startedDate) {
      updateData.startedDate = new Date()
    }

    if (status === 'COMPLETED') {
      updateData.completedDate = new Date()
    }

    // If technicianIds provided, update technicians
    if (technicianIds && technicianIds.length > 0) {
      // Delete existing technicians
      await prisma.maintenanceTechnician.deleteMany({
        where: { maintenanceId: params.id }
      })
      // Add new technicians
      updateData.technicians = {
        create: technicianIds.map((techId: string, index: number) => ({
          technicianId: techId,
          role: index === 0 ? 'Lead' : 'Assistant'
        }))
      }
    }

    const maintenance = await prisma.maintenanceRecord.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc'
          },
          take: 5
        }
      }
    })

    // Create notification for client
    let notificationMessage = ''
    switch (status) {
      case 'SCHEDULED':
        notificationMessage = `Su mantenimiento "${maintenance.title}" ha sido programado`
        break
      case 'IN_PROGRESS':
        notificationMessage = `El mantenimiento "${maintenance.title}" está en progreso`
        break
      case 'COMPLETED':
        notificationMessage = `El mantenimiento "${maintenance.title}" ha sido completado`
        break
      case 'CANCELLED':
        notificationMessage = `El mantenimiento "${maintenance.title}" ha sido cancelado`
        break
    }

    // Try to create notification for client (may fail if client doesn't have a user account)
    if (notificationMessage) {
      try {
        // First check if client has a linked user account
        const clientUser = await prisma.user.findFirst({
          where: { email: maintenance.client.email },
          select: { id: true }
        })

        if (clientUser) {
          await prisma.notification.create({
            data: {
              userId: clientUser.id,
              type: `maintenance_${status.toLowerCase()}`,
              title: 'Actualización de Mantenimiento',
              message: notificationMessage,
              data: {
                maintenanceId: maintenance.id,
                status: status
              }
            }
          })
        }
        // If no user account exists, skip notification (client will see status change in their portal)
      } catch (notifError) {
        // Log but don't fail the request if notification creation fails
        console.warn('Could not create notification for client:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      data: maintenance
    })
  } catch (error) {
    console.error('Error updating maintenance status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
