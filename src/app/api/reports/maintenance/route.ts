import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/reports/maintenance
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
      where: { email: session.user.email! },
      select: { role: true }
    })

    // Only ADMIN and MANAGER can view maintenance reports
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    // Get all maintenances for the year
    const maintenances = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            city: true,
            state: true
          }
        },
        technicians: {
          include: {
            technician: {
              select: {
                name: true
              }
            }
          }
        },
        solarSystem: {
          select: {
            systemName: true,
            capacity: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    })

    // Monthly maintenance data
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      monthName: new Date(year, i, 1).toLocaleDateString('es-MX', { month: 'short' }),
      total: 0,
      completed: 0,
      cancelled: 0,
      pending: 0
    }))

    maintenances.forEach(m => {
      if (m.scheduledDate) {
        const month = new Date(m.scheduledDate).getMonth()
        monthlyData[month].total++
        if (m.status === 'COMPLETED') monthlyData[month].completed++
        else if (m.status === 'CANCELLED') monthlyData[month].cancelled++
        else monthlyData[month].pending++
      }
    })

    // By status
    const byStatus = {
      PENDING_APPROVAL: maintenances.filter(m => m.status === 'PENDING_APPROVAL').length,
      SCHEDULED: maintenances.filter(m => m.status === 'SCHEDULED').length,
      IN_PROGRESS: maintenances.filter(m => m.status === 'IN_PROGRESS').length,
      COMPLETED: maintenances.filter(m => m.status === 'COMPLETED').length,
      CANCELLED: maintenances.filter(m => m.status === 'CANCELLED').length
    }

    // By type
    const byType = {
      PREVENTIVE: maintenances.filter(m => m.type === 'PREVENTIVE').length,
      CORRECTIVE: maintenances.filter(m => m.type === 'CORRECTIVE').length,
      WARRANTY: maintenances.filter(m => m.type === 'WARRANTY').length,
      CLEANING: maintenances.filter(m => m.type === 'CLEANING').length
    }

    // By priority
    const byPriority = {
      SCHEDULED: maintenances.filter(m => m.priority === 'SCHEDULED').length,
      URGENT: maintenances.filter(m => m.priority === 'URGENT').length
    }

    // Average completion time
    const completedMaintenances = maintenances.filter(
      m => m.status === 'COMPLETED' && m.scheduledDate && m.completedDate
    )

    let averageCompletionTime = 0
    if (completedMaintenances.length > 0) {
      const totalHours = completedMaintenances.reduce((sum, m) => {
        const scheduled = new Date(m.scheduledDate!)
        const completed = new Date(m.completedDate!)
        const hours = (completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60)
        return sum + Math.max(0, hours)
      }, 0)
      averageCompletionTime = totalHours / completedMaintenances.length
    }

    // Completion rate
    const completionRate = maintenances.length > 0
      ? (completedMaintenances.length / maintenances.length) * 100
      : 0

    // By state
    const byState: Record<string, number> = {}
    maintenances.forEach(m => {
      const state = m.client.state || 'Sin estado'
      byState[state] = (byState[state] || 0) + 1
    })

    const stateDistribution = Object.entries(byState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Technician workload
    const technicianWorkload: Record<string, { name: string; assigned: number; completed: number }> = {}
    maintenances.forEach(m => {
      m.technicians.forEach(t => {
        const techName = t.technician.name || 'Sin nombre'
        if (!technicianWorkload[techName]) {
          technicianWorkload[techName] = { name: techName, assigned: 0, completed: 0 }
        }
        technicianWorkload[techName].assigned++
        if (m.status === 'COMPLETED') {
          technicianWorkload[techName].completed++
        }
      })
    })

    const technicianStats = Object.values(technicianWorkload)
      .sort((a, b) => b.assigned - a.assigned)

    // Recent maintenances
    const recentMaintenances = maintenances.slice(0, 15).map(m => ({
      id: m.id,
      title: m.title,
      client: `${m.client.firstName} ${m.client.lastName}`,
      type: m.type,
      status: m.status,
      priority: m.priority,
      scheduledDate: m.scheduledDate,
      completedDate: m.completedDate,
      technicians: m.technicians.map(t => t.technician.name).join(', ') || 'Sin asignar',
      system: m.solarSystem?.systemName || 'General'
    }))

    // Summary
    const totalMaintenances = maintenances.length
    const completedCount = byStatus.COMPLETED
    const pendingCount = byStatus.PENDING_APPROVAL + byStatus.SCHEDULED
    const inProgressCount = byStatus.IN_PROGRESS

    return NextResponse.json({
      success: true,
      data: {
        year,
        summary: {
          totalMaintenances,
          completedCount,
          pendingCount,
          inProgressCount,
          cancelledCount: byStatus.CANCELLED,
          completionRate,
          averageCompletionTime
        },
        monthlyData,
        byStatus,
        byType,
        byPriority,
        stateDistribution,
        technicianStats,
        recentMaintenances
      }
    })
  } catch (error: any) {
    console.error('Error fetching maintenance report:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
