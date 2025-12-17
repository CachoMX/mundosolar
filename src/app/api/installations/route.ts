import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/installations - Get all installations with tracking info
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (status && status !== 'all') {
      where.installationStatus = status
    }

    // Get total count
    const total = await prisma.solarSystem.count({ where })

    // Get installations
    const systems = await prisma.solarSystem.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true,
            city: true,
            state: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            amountPaid: true
          }
        },
        installedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { installationStatus: 'asc' },
        { scheduledInstallationDate: 'asc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit
    })

    // Get status counts
    const statusCounts = await prisma.solarSystem.groupBy({
      by: ['installationStatus'],
      _count: {
        id: true
      }
    })

    const statusCountMap: Record<string, number> = {}
    statusCounts.forEach(s => {
      statusCountMap[s.installationStatus] = s._count.id
    })

    return NextResponse.json({
      success: true,
      data: {
        installations: systems.map(s => ({
          id: s.id,
          systemName: s.systemName,
          capacity: s.capacity ? Number(s.capacity) : null,
          client: {
            id: s.client.id,
            name: `${s.client.firstName} ${s.client.lastName}`,
            phone: s.client.phone,
            address: s.client.address,
            city: s.client.city,
            state: s.client.state
          },
          order: s.order ? {
            id: s.order.id,
            orderNumber: s.order.orderNumber,
            status: s.order.status,
            paymentStatus: s.order.paymentStatus,
            total: Number(s.order.total),
            amountPaid: Number(s.order.amountPaid)
          } : null,
          installation: {
            status: s.installationStatus,
            annexDate: s.annexDate,
            scheduledInstallationDate: s.scheduledInstallationDate,
            installationCompletedDate: s.installationCompletedDate,
            cfeSubmissionDate: s.cfeSubmissionDate,
            cfeApprovalDate: s.cfeApprovalDate,
            interconnectionDate: s.interconnectionDate,
            installationNotes: s.installationNotes,
            installedBy: s.installedBy
          }
        })),
        statusCounts: statusCountMap,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching installations:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener instalaciones' },
      { status: 500 }
    )
  }
}
