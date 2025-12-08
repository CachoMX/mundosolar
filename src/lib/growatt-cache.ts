/**
 * Growatt Data Cache Helper
 *
 * This module provides functions to read cached Growatt data
 * instead of making slow API calls in real-time.
 *
 * The cache is populated by the cron job at /api/cron/sync-growatt-data
 */

import { prisma } from '@/lib/prisma'

export interface CachedGrowattData {
  plantId: string | null
  plantName: string | null
  dailyGeneration: number
  monthlyGeneration: number
  yearlyGeneration: number
  totalGeneration: number
  currentPower: number
  co2Reduction: number
  revenue: number
  status: string | null
  lastUpdate: Date | null
  isCached: boolean
  isStale: boolean
  cacheAge: number // in minutes
}

/**
 * Get cached Growatt data for a specific client
 *
 * @param clientId - The client ID
 * @returns Cached data or null if not available
 */
export async function getCachedGrowattData(
  clientId: string
): Promise<CachedGrowattData | null> {
  try {
    const cached = await prisma.growattDataCache.findUnique({
      where: { clientId },
    })

    if (!cached) {
      return null
    }

    const now = new Date()
    const cacheAgeMs = now.getTime() - cached.cachedAt.getTime()
    const cacheAgeMinutes = Math.floor(cacheAgeMs / (1000 * 60))

    // Check if cache is expired
    const isExpired = now > cached.expiresAt
    const isStale = cached.isStale || isExpired

    return {
      plantId: cached.plantId,
      plantName: cached.plantName,
      dailyGeneration: Number(cached.dailyGeneration || 0),
      monthlyGeneration: Number(cached.monthlyGeneration || 0),
      yearlyGeneration: Number(cached.yearlyGeneration || 0),
      totalGeneration: Number(cached.totalGeneration || 0),
      currentPower: Number(cached.currentPower || 0),
      co2Reduction: Number(cached.co2Reduction || 0),
      revenue: Number(cached.revenue || 0),
      status: cached.status,
      lastUpdate: cached.lastUpdateFromGrowatt,
      isCached: true,
      isStale,
      cacheAge: cacheAgeMinutes,
    }
  } catch (error) {
    console.error(`Error fetching cached Growatt data for client ${clientId}:`, error)
    return null
  }
}

/**
 * Get cached Growatt data for multiple clients
 *
 * @param clientIds - Array of client IDs
 * @returns Map of clientId to cached data
 */
export async function getBulkCachedGrowattData(
  clientIds: string[]
): Promise<Map<string, CachedGrowattData>> {
  try {
    const cached = await prisma.growattDataCache.findMany({
      where: {
        clientId: { in: clientIds },
      },
    })

    const now = new Date()
    const result = new Map<string, CachedGrowattData>()

    for (const item of cached) {
      const cacheAgeMs = now.getTime() - item.cachedAt.getTime()
      const cacheAgeMinutes = Math.floor(cacheAgeMs / (1000 * 60))
      const isExpired = now > item.expiresAt
      const isStale = item.isStale || isExpired

      result.set(item.clientId, {
        plantId: item.plantId,
        plantName: item.plantName,
        dailyGeneration: Number(item.dailyGeneration || 0),
        monthlyGeneration: Number(item.monthlyGeneration || 0),
        yearlyGeneration: Number(item.yearlyGeneration || 0),
        totalGeneration: Number(item.totalGeneration || 0),
        currentPower: Number(item.currentPower || 0),
        co2Reduction: Number(item.co2Reduction || 0),
        revenue: Number(item.revenue || 0),
        status: item.status,
        lastUpdate: item.lastUpdateFromGrowatt,
        isCached: true,
        isStale,
        cacheAge: cacheAgeMinutes,
      })
    }

    return result
  } catch (error) {
    console.error('Error fetching bulk cached Growatt data:', error)
    return new Map()
  }
}

/**
 * Get cache statistics
 *
 * @returns Statistics about the cache
 */
export async function getCacheStatistics() {
  try {
    const now = new Date()

    const [total, stale, withErrors] = await Promise.all([
      prisma.growattDataCache.count(),
      prisma.growattDataCache.count({
        where: {
          OR: [{ isStale: true }, { expiresAt: { lt: now } }],
        },
      }),
      prisma.growattDataCache.count({
        where: { errorCount: { gt: 0 } },
      }),
    ])

    const fresh = total - stale

    return {
      total,
      fresh,
      stale,
      withErrors,
      healthPercent: total > 0 ? Math.round((fresh / total) * 100) : 0,
    }
  } catch (error) {
    console.error('Error fetching cache statistics:', error)
    return {
      total: 0,
      fresh: 0,
      stale: 0,
      withErrors: 0,
      healthPercent: 0,
    }
  }
}

/**
 * Mark cache as stale for a specific client
 * Useful when you know the data has changed
 *
 * @param clientId - The client ID
 */
export async function invalidateCache(clientId: string): Promise<void> {
  try {
    await prisma.growattDataCache.update({
      where: { clientId },
      data: { isStale: true },
    })
  } catch (error) {
    console.error(`Error invalidating cache for client ${clientId}:`, error)
  }
}

/**
 * Delete cache for a specific client
 *
 * @param clientId - The client ID
 */
export async function deleteCache(clientId: string): Promise<void> {
  try {
    await prisma.growattDataCache.delete({
      where: { clientId },
    })
  } catch (error) {
    console.error(`Error deleting cache for client ${clientId}:`, error)
  }
}

/**
 * Clean up expired cache entries
 * This can be run periodically to keep the database clean
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = new Date()
    const result = await prisma.growattDataCache.deleteMany({
      where: {
        AND: [
          { expiresAt: { lt: now } },
          { isStale: true },
        ],
      },
    })

    return result.count
  } catch (error) {
    console.error('Error cleaning up expired cache:', error)
    return 0
  }
}
