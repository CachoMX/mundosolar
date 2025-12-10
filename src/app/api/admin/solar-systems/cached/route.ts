import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/solar-systems/cached
 *
 * Returns all clients with their cached Growatt data.
 * This is much faster than fetching from Growatt API directly.
 * Data is populated by the cron job at /api/cron/sync-growatt-data
 */
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
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all clients with Growatt credentials
    const clients = await prisma.client.findMany({
      where: {
        AND: [
          { growattUsername: { not: null } },
          { growattUsername: { not: '' } },
          { isActive: true }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        growattUsername: true,
        expectedDailyGeneration: true,
        createdAt: true,
        solarSystems: {
          select: {
            id: true,
            systemName: true,
            capacity: true,
            installationDate: true,
            isActive: true,
            estimatedGeneration: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    // Get cached data for all clients
    const clientIds = clients.map(c => c.id)
    const cachedData = await prisma.growattDataCache.findMany({
      where: {
        clientId: { in: clientIds }
      }
    })

    // Create a map for quick lookup
    const cacheMap = new Map(cachedData.map(c => [c.clientId, c]))

    // Get the most recent sync time
    let lastSyncTime: Date | null = null
    for (const cache of cachedData) {
      if (cache.cachedAt && (!lastSyncTime || cache.cachedAt > lastSyncTime)) {
        lastSyncTime = cache.cachedAt
      }
    }

    // Transform data to match the UI expected format
    const clientsWithData = clients.map(client => {
      const cache = cacheMap.get(client.id)

      if (!cache) {
        // No cached data for this client
        return {
          clientInfo: {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            city: client.city,
            state: client.state,
            growattUsername: client.growattUsername,
            expectedDailyGeneration: client.expectedDailyGeneration?.toNumber() || 0,
            createdAt: client.createdAt.toISOString(),
            solarSystems: client.solarSystems.map(s => ({
              ...s,
              capacity: s.capacity?.toNumber() || 0,
              estimatedGeneration: s.estimatedGeneration?.toNumber() || 0,
              installationDate: s.installationDate?.toISOString() || null
            }))
          },
          growattData: null,
          lastUpdated: null,
          status: 'no_cache' as const,
          error: 'Sin datos en cache - Esperando sincronización'
        }
      }

      // Transform cache to GrowattData format expected by UI
      const dailyGeneration = cache.dailyGeneration?.toNumber() || 0
      const totalGeneration = cache.totalGeneration?.toNumber() || 0
      const co2Reduction = cache.co2Reduction?.toNumber() || 0
      const monthlyGeneration = cache.monthlyGeneration?.toNumber() || 0

      const growattData = {
        plants: [{
          plantId: cache.plantId || 'cached-plant',
          plantName: cache.plantName || `Sistema de ${client.firstName}`,
          todayEnergy: `${dailyGeneration.toFixed(1)} kWh`,
          totalEnergy: totalGeneration >= 1000
            ? `${(totalGeneration / 1000).toFixed(1)} MWh`
            : `${totalGeneration.toFixed(1)} kWh`,
          co2Saved: `${co2Reduction.toFixed(1)} ton`,
          capacity: client.solarSystems[0]?.capacity
            ? `${client.solarSystems[0].capacity.toNumber()} kW`
            : 'N/A',
          status: cache.status || 'online'
        }],
        totalPlants: 1,
        totalTodayEnergy: dailyGeneration,
        totalEnergy: totalGeneration,
        co2Saved: co2Reduction,
        totalCo2Saved: co2Reduction,
        monthlyEnergy: monthlyGeneration
      }

      // Check if cache is stale
      const now = new Date()
      const isExpired = cache.expiresAt ? now > cache.expiresAt : false
      const isStale = cache.isStale || isExpired

      return {
        clientInfo: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          city: client.city,
          state: client.state,
          growattUsername: client.growattUsername,
          expectedDailyGeneration: client.expectedDailyGeneration?.toNumber() || 0,
          createdAt: client.createdAt.toISOString(),
          solarSystems: client.solarSystems.map(s => ({
            ...s,
            capacity: s.capacity?.toNumber() || 0,
            estimatedGeneration: s.estimatedGeneration?.toNumber() || 0,
            installationDate: s.installationDate?.toISOString() || null
          }))
        },
        growattData,
        lastUpdated: cache.lastUpdateFromGrowatt?.toISOString() || cache.cachedAt?.toISOString() || null,
        status: isStale ? 'stale' as const : 'success' as const,
        cacheAge: cache.cachedAt
          ? Math.floor((now.getTime() - cache.cachedAt.getTime()) / (1000 * 60))
          : null
      }
    })

    // Calculate totals from cache
    const totals = {
      totalClients: clients.length,
      clientsWithCache: cachedData.length,
      clientsWithoutCache: clients.length - cachedData.length,
      totalTodayEnergy: cachedData.reduce((sum, c) => sum + (c.dailyGeneration?.toNumber() || 0), 0),
      totalEnergy: cachedData.reduce((sum, c) => sum + (c.totalGeneration?.toNumber() || 0), 0),
      totalCo2Saved: cachedData.reduce((sum, c) => sum + (c.co2Reduction?.toNumber() || 0), 0)
    }

    return NextResponse.json({
      success: true,
      data: clientsWithData,
      totals,
      lastSync: lastSyncTime?.toISOString() || null,
      cacheStats: {
        total: cachedData.length,
        stale: cachedData.filter(c => c.isStale || (c.expiresAt && new Date() > c.expiresAt)).length,
        fresh: cachedData.filter(c => !c.isStale && c.expiresAt && new Date() <= c.expiresAt).length
      }
    })
  } catch (error: any) {
    console.error('Error fetching cached solar systems:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos del cache' },
      { status: 500 }
    )
  }
}
