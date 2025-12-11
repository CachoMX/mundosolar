import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/reports/technician-performance
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

    // Get current user to check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Only ADMIN and MANAGER can view performance reports
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default 30 days
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date()

    // Get all technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true
      }
    })

    const performanceData = await Promise.all(
      technicians.map(async (technician) => {
        // Get all maintenances assigned to this technician in the date range
        const assignments = await prisma.maintenanceTechnician.findMany({
          where: {
            technicianId: technician.id,
            maintenance: {
              scheduledDate: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          include: {
            maintenance: {
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        })

        const totalAssigned = assignments.length
        const completed = assignments.filter(
          a => a.maintenance.status === 'COMPLETED'
        ).length
        const inProgress = assignments.filter(
          a => a.maintenance.status === 'IN_PROGRESS'
        ).length

        // Calculate average completion time (from scheduled to completed)
        const completedMaintenances = assignments.filter(
          a => a.maintenance.status === 'COMPLETED' && a.maintenance.completedDate
        )

        let averageCompletionTime = 0
        if (completedMaintenances.length > 0) {
          const totalHours = completedMaintenances.reduce((sum, a) => {
            if (!a.maintenance.scheduledDate || !a.maintenance.completedDate) return sum
            const scheduled = new Date(a.maintenance.scheduledDate)
            const completed = new Date(a.maintenance.completedDate)
            const hours = (completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }, 0)
          averageCompletionTime = totalHours / completedMaintenances.length
        }

        // Calculate on-time rate (completed before or on scheduled date)
        const onTimeCount = completedMaintenances.filter(a => {
          if (!a.maintenance.scheduledDate || !a.maintenance.completedDate) return false
          const scheduled = new Date(a.maintenance.scheduledDate)
          const completed = new Date(a.maintenance.completedDate)
          // Consider on-time if completed within 24 hours of scheduled date
          const diff = (completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60)
          return diff <= 24
        }).length

        const onTimeRate = completedMaintenances.length > 0
          ? (onTimeCount / completedMaintenances.length) * 100
          : 0

        // Completion rate
        const completionRate = totalAssigned > 0
          ? (completed / totalAssigned) * 100
          : 0

        // Client satisfaction (placeholder - you can implement actual ratings later)
        const clientSatisfaction = 4.5

        // Get recent maintenances
        const recentMaintenances = assignments
          .slice(0, 5)
          .map(a => ({
            id: a.maintenance.id,
            title: a.maintenance.title,
            status: a.maintenance.status,
            scheduledDate: a.maintenance.scheduledDate,
            completedDate: a.maintenance.completedDate,
            client: a.maintenance.client
          }))

        return {
          technician,
          metrics: {
            totalAssigned,
            completed,
            inProgress,
            averageCompletionTime,
            completionRate,
            onTimeRate,
            clientSatisfaction
          },
          recentMaintenances
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: performanceData
    })
  } catch (error: any) {
    console.error('Error fetching technician performance:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
