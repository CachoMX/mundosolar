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
 * Hash password for Growatt API
 */
function hashPassword(password: string): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(password).digest('hex').toLowerCase()
  const chars = hash.split('')
  for (let i = 0; i < chars.length; i += 2) {
    if (chars[i] === '0') {
      chars[i] = 'c'
    }
  }
  return chars.join('')
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
    const endpoint = process.env.GROWATT_API_URL || 'https://openapi.growatt.com'

    // Step 1: Login to get fresh token
    const hashedPassword = hashPassword(password)
    const loginUrl = `${endpoint}/newTwoLoginAPI.do`

    const formData = new URLSearchParams()
    formData.append('userName', username)
    formData.append('password', hashedPassword)

    let freshToken: string | null = null
    let sessionCookies: string = ''

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'MundoSolar/1.0'
      },
      body: formData.toString()
    })

    if (!loginResponse.ok) {
      throw new Error(`Growatt login failed for client ${clientId}: ${loginResponse.status}`)
    }

    const loginResult = await loginResponse.json()
    if (!loginResult.back || !loginResult.back.success) {
      throw new Error(`Growatt login failed for client ${clientId}: ${loginResult.back?.msg || 'Unknown error'}`)
    }

    freshToken = loginResult.back.user?.cpowerToken

    // Capture session cookies
    const setCookieHeaders = loginResponse.headers.get('set-cookie')
    if (setCookieHeaders) {
      sessionCookies = setCookieHeaders.split(',').map(cookie => {
        const [nameValue] = cookie.trim().split(';')
        return nameValue.trim()
      }).join('; ')
    }

    if (!freshToken) {
      throw new Error(`No token received for client ${clientId}`)
    }

    // Step 2: Get plant list
    const plantListUrl = `${endpoint}/PlantListAPI.do?token=${encodeURIComponent(freshToken)}`
    const headers: Record<string, string> = {
      'User-Agent': 'MundoSolar/1.0',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    }

    if (sessionCookies) {
      headers['Cookie'] = sessionCookies
    }

    const plantsResponse = await fetch(plantListUrl, {
      method: 'GET',
      headers
    })

    if (!plantsResponse.ok) {
      throw new Error(`Failed to fetch plants for client ${clientId}: ${plantsResponse.status}`)
    }

    const plantsResult = await plantsResponse.json()

    if (!plantsResult.back || plantsResult.back.success === false) {
      throw new Error(`Failed to fetch plants for client ${clientId}: ${plantsResult.back?.msg || 'Unknown error'}`)
    }

    const plantsData = plantsResult.back?.data || []
    const totalData = plantsResult.back?.totalData || {}

    // Get the first plant (primary one)
    const plant = plantsData[0]

    if (!plant) {
      throw new Error(`No plants found for client ${clientId}`)
    }

    // Parse totals from Growatt
    const totalTodayEnergy = parseFloat(totalData.todayEnergySum?.replace(/[^\d.-]/g, '')) || 0
    let totalEnergy = parseFloat(totalData.totalEnergySum?.replace(/[^\d.-]/g, '')) || 0

    // Convert MWh to kWh if needed
    if (totalData.totalEnergySum?.includes('MWh')) {
      totalEnergy = totalEnergy * 1000
    }

    const co2Saved = parseFloat(totalData.CO2Sum?.replace(/[^\d.-]/g, '')) || 0

    // Map to our interface
    return {
      plantId: plant.plantId || plant.id,
      plantName: plant.plantName || 'Planta Sin Nombre',
      currentPower: parseFloat(plant.currentPower) || 0,
      dailyEnergy: totalTodayEnergy,
      monthlyEnergy: parseFloat(plant.monthEnergy) || 0,
      yearlyEnergy: parseFloat(plant.yearEnergy) || 0,
      totalEnergy: totalEnergy,
      co2Reduction: co2Saved,
      revenue: parseFloat(plant.revenue) || 0,
      status: plant.status === '1' ? 'online' : 'offline',
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
          { growattUsername: { not: '' } },
          { growattPassword: { not: null } },
          { growattPassword: { not: '' } },
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

    // Process in batches of 5 clients in parallel to speed up while respecting rate limits
    const BATCH_SIZE = 5
    const BATCH_DELAY = 3000 // 3 seconds between batches

    for (let i = 0; i < clientsWithCredentials.length; i += BATCH_SIZE) {
      const batch = clientsWithCredentials.slice(i, i + BATCH_SIZE)

      console.log(`[Cron] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(clientsWithCredentials.length / BATCH_SIZE)} (${batch.length} clients)`)

      // Process batch in parallel
      await Promise.all(
        batch.map(async (client) => {
          try {
            console.log(`[Cron] Fetching data for client ${client.firstName} ${client.lastName}`)

            const data = await fetchGrowattDataForClient(
              client.id,
              client.growattUsername!,
              client.growattPassword!
            )

            if (data) {
              await cacheGrowattData(client.id, data)
              results.success++
              console.log(`[Cron] ✓ Successfully cached data for ${client.firstName} ${client.lastName}`)
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
              console.log(`[Cron] ✗ Failed to fetch data for ${client.firstName} ${client.lastName}`)
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            await cacheGrowattData(client.id, null, errorMessage)
            results.failed++
            results.errors.push({
              clientId: client.id,
              error: errorMessage,
            })
            console.error(`[Cron] Error processing client ${client.firstName} ${client.lastName}:`, error)
          }
        })
      )

      // Wait between batches to avoid overwhelming Growatt API
      if (i + BATCH_SIZE < clientsWithCredentials.length) {
        console.log(`[Cron] Waiting ${BATCH_DELAY}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
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
