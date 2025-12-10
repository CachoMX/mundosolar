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

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Prisma user by email to get the correct ID
    const user = await prisma.user.findUnique({
      where: { email: authUser.email! },
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

    // Create notification for client using clientId
    if (notificationMessage) {
      try {
        await prisma.notification.create({
          data: {
            clientId: maintenance.client.id,
            type: `maintenance_${status.toLowerCase()}`,
            title: 'Actualización de Mantenimiento',
            message: notificationMessage,
            data: {
              maintenanceId: maintenance.id,
              status: status
            }
          }
        })
      } catch (notifError) {
        // Log but don't fail the request if notification creation fails
        console.warn('Could not create notification for client:', notifError)
      }
    }

    // Notify all ADMIN users about the status change
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: user.id } // Exclude the admin who made the change
        },
        select: { id: true }
      })

      if (admins.length > 0) {
        let adminNotificationTitle = ''
        let adminNotificationMessage = ''
        const clientName = `${maintenance.client.firstName} ${maintenance.client.lastName}`

        switch (status) {
          case 'SCHEDULED':
            adminNotificationTitle = 'Mantenimiento Aprobado'
            adminNotificationMessage = `El mantenimiento "${maintenance.title}" de ${clientName} ha sido aprobado y programado`
            break
          case 'IN_PROGRESS':
            adminNotificationTitle = 'Mantenimiento en Progreso'
            adminNotificationMessage = `El mantenimiento "${maintenance.title}" de ${clientName} está en progreso`
            break
          case 'COMPLETED':
            adminNotificationTitle = 'Mantenimiento Completado'
            adminNotificationMessage = `El mantenimiento "${maintenance.title}" de ${clientName} ha sido completado`
            break
          case 'CANCELLED':
            adminNotificationTitle = 'Solicitud Rechazada'
            adminNotificationMessage = `La solicitud de mantenimiento "${maintenance.title}" de ${clientName} ha sido rechazada`
            break
        }

        if (adminNotificationTitle) {
          await prisma.notification.createMany({
            data: admins.map(admin => ({
              userId: admin.id,
              type: `maintenance_${status.toLowerCase()}`,
              title: adminNotificationTitle,
              message: adminNotificationMessage,
              data: {
                maintenanceId: maintenance.id,
                clientId: maintenance.client.id,
                status: status
              }
            }))
          })
        }
      }
    } catch (adminNotifError) {
      // Log but don't fail the request if notification creation fails
      console.warn('Could not create notifications for admins:', adminNotifError)
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
