import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/solar-systems/[id]/installation - Get installation tracking info
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const systemId = params.id

    const system = await prisma.solarSystem.findUnique({
      where: { id: systemId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: true,
            city: true,
            state: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        },
        installedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!system) {
      return NextResponse.json(
        { success: false, error: 'Sistema no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: system.id,
        systemName: system.systemName,
        capacity: system.capacity ? Number(system.capacity) : null,
        client: system.client,
        order: system.order,
        installation: {
          status: system.installationStatus,
          annexDate: system.annexDate,
          scheduledInstallationDate: system.scheduledInstallationDate,
          installationCompletedDate: system.installationCompletedDate,
          cfeSubmissionDate: system.cfeSubmissionDate,
          cfeApprovalDate: system.cfeApprovalDate,
          interconnectionDate: system.interconnectionDate,
          installationNotes: system.installationNotes,
          installedBy: system.installedBy
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching installation info:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener información de instalación' },
      { status: 500 }
    )
  }
}

// PATCH /api/solar-systems/[id]/installation - Update installation tracking
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

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para actualizar instalaciones' },
        { status: 403 }
      )
    }

    const systemId = params.id
    const body = await request.json()

    const {
      installationStatus,
      annexDate,
      scheduledInstallationDate,
      installationCompletedDate,
      cfeSubmissionDate,
      cfeApprovalDate,
      interconnectionDate,
      installationNotes,
      installedById
    } = body

    // Verify system exists
    const existingSystem = await prisma.solarSystem.findUnique({
      where: { id: systemId }
    })

    if (!existingSystem) {
      return NextResponse.json(
        { success: false, error: 'Sistema no encontrado' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (installationStatus !== undefined) {
      updateData.installationStatus = installationStatus
    }
    if (annexDate !== undefined) {
      updateData.annexDate = annexDate ? new Date(annexDate) : null
    }
    if (scheduledInstallationDate !== undefined) {
      updateData.scheduledInstallationDate = scheduledInstallationDate ? new Date(scheduledInstallationDate) : null
    }
    if (installationCompletedDate !== undefined) {
      updateData.installationCompletedDate = installationCompletedDate ? new Date(installationCompletedDate) : null
      // Also update the legacy installationDate field
      updateData.installationDate = installationCompletedDate ? new Date(installationCompletedDate) : null
    }
    if (cfeSubmissionDate !== undefined) {
      updateData.cfeSubmissionDate = cfeSubmissionDate ? new Date(cfeSubmissionDate) : null
    }
    if (cfeApprovalDate !== undefined) {
      updateData.cfeApprovalDate = cfeApprovalDate ? new Date(cfeApprovalDate) : null
    }
    if (interconnectionDate !== undefined) {
      updateData.interconnectionDate = interconnectionDate ? new Date(interconnectionDate) : null
    }
    if (installationNotes !== undefined) {
      updateData.installationNotes = installationNotes
    }
    if (installedById !== undefined) {
      updateData.installedById = installedById || null
    }

    // Update system
    const updatedSystem = await prisma.solarSystem.update({
      where: { id: systemId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        installedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSystem.id,
        systemName: updatedSystem.systemName,
        installation: {
          status: updatedSystem.installationStatus,
          annexDate: updatedSystem.annexDate,
          scheduledInstallationDate: updatedSystem.scheduledInstallationDate,
          installationCompletedDate: updatedSystem.installationCompletedDate,
          cfeSubmissionDate: updatedSystem.cfeSubmissionDate,
          cfeApprovalDate: updatedSystem.cfeApprovalDate,
          interconnectionDate: updatedSystem.interconnectionDate,
          installationNotes: updatedSystem.installationNotes,
          installedBy: updatedSystem.installedBy
        }
      }
    })
  } catch (error: any) {
    console.error('Error updating installation:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar instalación' },
      { status: 500 }
    )
  }
}
