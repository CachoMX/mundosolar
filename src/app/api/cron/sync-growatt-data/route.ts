import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Cron Job: Sync Growatt Data
 *
 * This endpoint is designed to be called by a cron scheduler (e.g., Vercel Cron)
 * to pre-fetch and cache Growatt API data for all clients.
 *
 * Schedule: Daily at 10 PM (22:00) Mexico time
 * Purpose: Cache data overnight so dashboard loads are fast during business hours
 *
 * To enable this cron job:
 * 1. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/sync-growatt-data",
 *        "schedule": "0 22 * * *"
 *      }]
 *    }
 *
 * 2. Set CRON_SECRET in Vercel environment variables
 * 3. Deploy to Vercel
 */

interface GrowattPlantData {
  plantId: string
  plantName: string
  currentPower: number
  dailyEnergy: number
  monthlyEnergy: number
  yearlyEnergy: number
  totalEnergy: number
  co2Reduction: number
  revenue: number
  status: 'online' | 'offline' | 'error'
}

interface GrowattApiResponse {
  success: boolean
  data?: GrowattPlantData
  error?: string
}

/**
 * Fetch data from Growatt API for a specific client
 */
async function fetchGrowattDataForClient(
  clientId: string,
  username: string,
  password: string
): Promise<GrowattPlantData | null> {
  try {
    // TODO: Replace with actual Growatt API implementation
    // This is a placeholder for the actual API call

    const growattApiUrl = process.env.GROWATT_API_URL || 'https://openapi.growatt.com'

    // Step 1: Login to Growatt
    const loginResponse = await fetch(`${growattApiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!loginResponse.ok) {
      throw new Error(`Growatt login failed for client ${clientId}`)
    }

    const loginData = await loginResponse.json()
    const token = loginData.token

    // Step 2: Get plant list
    const plantsResponse = await fetch(`${growattApiUrl}/plants`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!plantsResponse.ok) {
      throw new Error(`Failed to fetch plants for client ${clientId}`)
    }

    const plantsData = await plantsResponse.json()

    // Assuming the first plant is the primary one
    const plant = plantsData.plants?.[0]

    if (!plant) {
      throw new Error(`No plants found for client ${clientId}`)
    }

    // Step 3: Get plant details and energy data
    const plantDetailsResponse = await fetch(
      `${growattApiUrl}/plants/${plant.plantId}/data`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!plantDetailsResponse.ok) {
      throw new Error(`Failed to fetch plant details for client ${clientId}`)
    }

    const plantDetails = await plantDetailsResponse.json()

    // Map Growatt response to our interface
    return {
      plantId: plant.plantId,
      plantName: plant.plantName,
      currentPower: plantDetails.currentPower || 0,
      dailyEnergy: plantDetails.todayEnergy || 0,
      monthlyEnergy: plantDetails.monthEnergy || 0,
      yearlyEnergy: plantDetails.yearEnergy || 0,
      totalEnergy: plantDetails.totalEnergy || 0,
      co2Reduction: plantDetails.co2Reduction || 0,
      revenue: plantDetails.revenue || 0,
      status: plantDetails.status || 'offline',
    }
  } catch (error) {
    console.error(`Error fetching Growatt data for client ${clientId}:`, error)
    return null
  }
}

/**
 * Cache Growatt data in the database
 */
async function cacheGrowattData(
  clientId: string,
  data: GrowattPlantData | null,
  error?: string
) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  if (data) {
    // Successfully fetched data - cache it
    await prisma.growattDataCache.upsert({
      where: { clientId },
      create: {
        clientId,
        plantId: data.plantId,
        plantName: data.plantName,
        dailyGeneration: data.dailyEnergy,
        monthlyGeneration: data.monthlyEnergy,
        yearlyGeneration: data.yearlyEnergy,
        totalGeneration: data.totalEnergy,
        currentPower: data.currentPower,
        co2Reduction: data.co2Reduction,
        revenue: data.revenue,
        status: data.status,
        lastUpdateFromGrowatt: now,
        cachedAt: now,
        expiresAt,
        isStale: false,
        errorCount: 0,
        fetchError: null,
        lastErrorAt: null,
      },
      update: {
        plantId: data.plantId,
        plantName: data.plantName,
        dailyGeneration: data.dailyEnergy,
        monthlyGeneration: data.monthlyEnergy,
        yearlyGeneration: data.yearlyEnergy,
        totalGeneration: data.totalEnergy,
        currentPower: data.currentPower,
        co2Reduction: data.co2Reduction,
        revenue: data.revenue,
        status: data.status,
        lastUpdateFromGrowatt: now,
        cachedAt: now,
        expiresAt,
        isStale: false,
        errorCount: 0,
        fetchError: null,
        lastErrorAt: null,
      },
    })
  } else {
    // Failed to fetch - update error tracking
    const existing = await prisma.growattDataCache.findUnique({
      where: { clientId },
      select: { errorCount: true },
    })

    await prisma.growattDataCache.upsert({
      where: { clientId },
      create: {
        clientId,
        cachedAt: now,
        expiresAt,
        isStale: true,
        fetchError: error || 'Unknown error',
        errorCount: 1,
        lastErrorAt: now,
      },
      update: {
        isStale: true,
        fetchError: error || 'Unknown error',
        errorCount: (existing?.errorCount || 0) + 1,
        lastErrorAt: now,
        expiresAt,
      },
    })
  }
}

/**
 * GET /api/cron/sync-growatt-data
 *
 * Fetches Growatt data for all clients with credentials and caches it
 */
export async function GET(request: NextRequest) {
  // Security: Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Get all clients with Growatt credentials from the clients table
    const clientsWithCredentials = await prisma.client.findMany({
      where: {
        AND: [
          { growattUsername: { not: null } },
          { growattPassword: { not: null } },
          { isActive: true },
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        growattUsername: true,
        growattPassword: true,
      },
    })

    console.log(`[Cron] Starting Growatt data sync for ${clientsWithCredentials.length} clients`)

    const results = {
      total: clientsWithCredentials.length,
      success: 0,
      failed: 0,
      errors: [] as { clientId: string; error: string }[],
    }

    // Process each client sequentially to avoid rate limiting
    for (const client of clientsWithCredentials) {
      try {
        console.log(`[Cron] Fetching data for client ${client.id}`)

        const data = await fetchGrowattDataForClient(
          client.id,
          client.growattUsername!,
          client.growattPassword!
        )

        if (data) {
          await cacheGrowattData(client.id, data)
          results.success++
          console.log(`[Cron] ✓ Successfully cached data for client ${client.id}`)
        } else {
          await cacheGrowattData(
            client.id,
            null,
            'Failed to fetch data from Growatt API'
          )
          results.failed++
          results.errors.push({
            clientId: client.id,
            error: 'Failed to fetch data from Growatt API',
          })
          console.log(`[Cron] ✗ Failed to fetch data for client ${client.id}`)
        }

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await cacheGrowattData(client.id, null, errorMessage)
        results.failed++
        results.errors.push({
          clientId: client.id,
          error: errorMessage,
        })
        console.error(`[Cron] Error processing client ${client.id}:`, error)
      }
    }

    console.log(`[Cron] Sync complete: ${results.success} success, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Growatt data sync completed',
      results,
    })
  } catch (error) {
    console.error('[Cron] Fatal error during sync:', error)
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
 * POST /api/cron/sync-growatt-data
 *
 * Alternative endpoint for manual triggers or testing
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
