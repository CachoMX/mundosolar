import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Test Cron Job: Sync Test Data
 *
 * This endpoint simulates the Growatt data sync by inserting mock data
 * into the growatt_data_cache table. This is for testing the cron job
 * functionality without requiring actual Growatt credentials.
 *
 * URL: /api/cron/sync-test
 * Schedule: Daily at 10 PM (22:00) Mexico time via cron-job.org
 */

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    // Get all clients to generate test data for
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: 10, // Process up to 10 clients
    })

    console.log(`[Cron Test] Starting data sync for ${clients.length} clients`)

    const results = {
      total: clients.length,
      success: 0,
      failed: 0,
      timestamp: now.toISOString(),
      message: 'Test data sync completed',
    }

    // Generate mock data for each client
    for (const client of clients) {
      try {
        // Generate realistic mock data
        const mockData = {
          plantId: `PLANT_${client.id.substring(0, 8)}`,
          plantName: `${client.firstName} ${client.lastName} Solar Plant`,
          dailyGeneration: Math.random() * 50 + 10, // 10-60 kWh
          monthlyGeneration: Math.random() * 1500 + 300, // 300-1800 kWh
          yearlyGeneration: Math.random() * 18000 + 3600, // 3600-21600 kWh
          totalGeneration: Math.random() * 90000 + 18000, // 18000-108000 kWh
          currentPower: Math.random() * 8 + 2, // 2-10 kW
          co2Reduction: Math.random() * 15000 + 3000, // 3000-18000 kg CO2
          revenue: Math.random() * 50000 + 10000, // 10000-60000 MXN
          status: Math.random() > 0.2 ? 'online' : 'offline', // 80% online
        }

        await prisma.growattDataCache.upsert({
          where: { clientId: client.id },
          create: {
            clientId: client.id,
            plantId: mockData.plantId,
            plantName: mockData.plantName,
            dailyGeneration: mockData.dailyGeneration,
            monthlyGeneration: mockData.monthlyGeneration,
            yearlyGeneration: mockData.yearlyGeneration,
            totalGeneration: mockData.totalGeneration,
            currentPower: mockData.currentPower,
            co2Reduction: mockData.co2Reduction,
            revenue: mockData.revenue,
            status: mockData.status,
            lastUpdateFromGrowatt: now,
            cachedAt: now,
            expiresAt,
            isStale: false,
            errorCount: 0,
            fetchError: null,
            lastErrorAt: null,
          },
          update: {
            plantId: mockData.plantId,
            plantName: mockData.plantName,
            dailyGeneration: mockData.dailyGeneration,
            monthlyGeneration: mockData.monthlyGeneration,
            yearlyGeneration: mockData.yearlyGeneration,
            totalGeneration: mockData.totalGeneration,
            currentPower: mockData.currentPower,
            co2Reduction: mockData.co2Reduction,
            revenue: mockData.revenue,
            status: mockData.status,
            lastUpdateFromGrowatt: now,
            cachedAt: now,
            expiresAt,
            isStale: false,
            errorCount: 0,
            fetchError: null,
            lastErrorAt: null,
          },
        })

        results.success++
        console.log(`[Cron Test] ✓ Cached test data for client ${client.id}`)

        // Small delay to simulate real API calls
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        results.failed++
        console.error(`[Cron Test] ✗ Failed to cache data for client ${client.id}:`, error)
      }
    }

    console.log(`[Cron Test] Sync complete: ${results.success} success, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('[Cron Test] Fatal error during sync:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/sync-test
 * Alternative endpoint for manual triggers
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
