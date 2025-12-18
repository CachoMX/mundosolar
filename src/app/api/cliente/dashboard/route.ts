import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string

    // Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Get cached Growatt data for this client
    const growattCache = await prisma.growattDataCache.findUnique({
      where: { clientId }
    })

    // Get maintenance records for this client (only non-cancelled, active ones)
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: {
        clientId,
        status: {
          in: ['PENDING_APPROVAL', 'SCHEDULED', 'IN_PROGRESS']
        }
      },
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        scheduledDate: true
      }
    })

    // Get pending maintenance count
    const pendingMaintenance = await prisma.maintenanceRecord.count({
      where: {
        clientId,
        status: {
          in: ['PENDING_APPROVAL', 'SCHEDULED']
        }
      }
    })

    // Get upcoming and overdue payments (for notifications)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const fiveDaysFromNow = new Date()
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

    const scheduledPayments = await prisma.payment.findMany({
      where: {
        order: {
          clientId,
        },
        status: 'PENDING',
        dueDate: {
          not: null,
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            financingMonths: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    // Separate payments into categories
    const upcomingPayments = scheduledPayments.filter(
      (p) => p.dueDate && p.dueDate <= fiveDaysFromNow && p.dueDate >= today
    )

    const overduePayments = scheduledPayments.filter(
      (p) => p.dueDate && p.dueDate < today
    )

    // Get Growatt daily history for monthly trend
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const dailyHistory = await prisma.growattDailyHistory.findMany({
      where: {
        clientId,
        date: { gte: sixMonthsAgo }
      },
      orderBy: { date: 'asc' }
    })

    // Aggregate by month
    const monthlyTrend = aggregateByMonth(dailyHistory)

    // Calculate current month's generation from daily history
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthGeneration = dailyHistory
      .filter(record => new Date(record.date) >= currentMonthStart)
      .reduce((sum, record) => sum + (record.dailyGeneration?.toNumber() || 0), 0)

    // Build stats
    const totalGeneration = growattCache?.totalGeneration?.toNumber() || 0
    const dailyGeneration = growattCache?.dailyGeneration?.toNumber() || 0

    // Determine system status - consider "online" if we have valid generation data
    // This matches the logic in /api/cliente/sistema
    const hasValidData = totalGeneration > 0
    const systemStatus = hasValidData ? 'online' : (growattCache?.status || 'offline')

    const stats = {
      totalEnergyGenerated: totalGeneration,
      monthlyEnergy: currentMonthGeneration,
      dailyEnergy: dailyGeneration,
      co2Saved: growattCache?.co2Reduction?.toNumber() || 0,
      systemStatus,
      pendingMaintenance
    }

    return NextResponse.json({
      success: true,
      data: {
        client,
        stats,
        recentMaintenance: maintenanceRecords.map(m => ({
          id: m.id,
          title: m.title,
          type: m.type,
          status: m.status,
          scheduledDate: m.scheduledDate?.toISOString() || null
        })),
        monthlyTrend,
        // Payment notifications
        paymentAlerts: {
          upcoming: upcomingPayments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            dueDate: p.dueDate?.toISOString(),
            installmentNumber: p.installmentNumber,
            totalInstallments: p.order.financingMonths,
            orderNumber: p.order.orderNumber,
            daysUntilDue: p.dueDate
              ? Math.ceil(
                  (p.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                )
              : null,
          })),
          overdue: overduePayments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            dueDate: p.dueDate?.toISOString(),
            installmentNumber: p.installmentNumber,
            totalInstallments: p.order.financingMonths,
            orderNumber: p.order.orderNumber,
            daysOverdue: p.dueDate
              ? Math.ceil(
                  (today.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                )
              : null,
          })),
          hasAlerts: upcomingPayments.length > 0 || overduePayments.length > 0,
        }
      }
    })
  } catch (error) {
    console.error('Client dashboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar dashboard' },
      { status: 500 }
    )
  }
}

function aggregateByMonth(dailyHistory: any[]): { month: string; energy: number }[] {
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const monthlyData: Record<string, number> = {}

  for (const record of dailyHistory) {
    const date = new Date(record.date)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const monthName = monthNames[date.getMonth()]

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    monthlyData[monthKey] += record.dailyGeneration?.toNumber() || 0
  }

  // Convert to array and get last 6 months
  const result = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, energy]) => {
      const [year, monthIndex] = key.split('-')
      return {
        month: monthNames[parseInt(monthIndex)],
        energy
      }
    })

  return result
}
