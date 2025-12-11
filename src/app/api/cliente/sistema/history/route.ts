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

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate start date
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch historical data for this client
    const history = await prisma.growattDailyHistory.findMany({
      where: {
        clientId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
        dailyGeneration: true,
        monthlyGeneration: true,
        yearlyGeneration: true,
        totalGeneration: true,
        currentPower: true,
        co2Reduction: true,
        revenue: true,
        status: true,
      },
    })

    // Get client info and expected generation
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        firstName: true,
        lastName: true,
        expectedDailyGeneration: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Calculate metrics
    const totalGeneration = history.reduce(
      (sum, day) => sum + (parseFloat(day.dailyGeneration?.toString() || '0')),
      0
    )
    const avgGeneration = history.length > 0 ? totalGeneration / history.length : 0
    const bestDay = history.reduce((max, day) => {
      const current = parseFloat(day.dailyGeneration?.toString() || '0')
      return current > max.value ? { value: current, date: day.date } : max
    }, { value: 0, date: new Date() })

    const latestCO2 = history.length > 0
      ? parseFloat(history[history.length - 1].co2Reduction?.toString() || '0')
      : 0

    return NextResponse.json({
      success: true,
      data: {
        client: {
          name: `${client.firstName} ${client.lastName}`,
          expectedDailyGeneration: parseFloat(client.expectedDailyGeneration?.toString() || '0'),
        },
        history: history.map(day => ({
          date: day.date,
          dailyGeneration: parseFloat(day.dailyGeneration?.toString() || '0'),
          monthlyGeneration: parseFloat(day.monthlyGeneration?.toString() || '0'),
          yearlyGeneration: parseFloat(day.yearlyGeneration?.toString() || '0'),
          totalGeneration: parseFloat(day.totalGeneration?.toString() || '0'),
          currentPower: parseFloat(day.currentPower?.toString() || '0'),
          co2Reduction: parseFloat(day.co2Reduction?.toString() || '0'),
          revenue: parseFloat(day.revenue?.toString() || '0'),
          status: day.status,
        })),
        metrics: {
          totalGeneration: parseFloat(totalGeneration.toFixed(2)),
          avgGeneration: parseFloat(avgGeneration.toFixed(2)),
          bestDay: {
            value: parseFloat(bestDay.value.toFixed(2)),
            date: bestDay.date,
          },
          co2Saved: parseFloat(latestCO2.toFixed(2)),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching client history:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener historial' },
      { status: 500 }
    )
  }
}
