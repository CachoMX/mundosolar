import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate start date (days - 1 to get exactly N days including today)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))

    // Fetch historical data
    const history = await prisma.growattDailyHistory.findMany({
      where: {
        clientId: params.id,
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
      where: { id: params.id },
      select: {
        firstName: true,
        lastName: true,
        expectedDailyGeneration: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
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
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
