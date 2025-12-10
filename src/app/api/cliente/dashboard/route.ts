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

    // Get maintenance records for this client
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: { clientId },
      orderBy: { scheduledDate: 'desc' },
      take: 10,
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

    // Build stats
    const stats = {
      totalEnergyGenerated: growattCache?.totalGeneration?.toNumber() || 0,
      monthlyEnergy: growattCache?.monthlyGeneration?.toNumber() || 0,
      dailyEnergy: growattCache?.dailyGeneration?.toNumber() || 0,
      co2Saved: growattCache?.co2Reduction?.toNumber() || 0,
      systemStatus: growattCache?.status || 'offline',
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
        monthlyTrend
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
