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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes } = body

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
          changedById: session.user.id,
        }
      }
    }

    // Update dates based on status
    if (status === 'IN_PROGRESS' && !updateData.startedDate) {
      updateData.startedDate = new Date()
    }

    if (status === 'COMPLETED') {
      updateData.completedDate = new Date()
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

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          userId: maintenance.clientId,
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
