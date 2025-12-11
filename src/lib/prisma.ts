import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Force load .env.local with override to fix inherited environment variables
config({ path: resolve(process.cwd(), '.env.local'), override: true })
config({ path: resolve(process.cwd(), '.env'), override: true })

/**
 * Prisma Client Singleton
 *
 * Best practice for Next.js to avoid creating multiple instances
 * in development due to hot reloading.
 *
 * In production: Creates a single instance
 * In development: Reuses the same instance across hot reloads
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper function to execute with retry for connection issues
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  delay: number = 500
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const isConnectionError =
        error.message?.includes("Can't reach database server") ||
        error.message?.includes('Connection refused') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('Connection reset') ||
        error.code === 'P1001' ||
        error.code === 'P1002' ||
        error.code === 'P1008' ||
        error.code === 'P1017'

      if (isConnectionError && attempt < maxRetries) {
        console.log(`Database connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        // Faster backoff: 500ms, 750ms, 1125ms, 1687ms (total ~4s max wait)
        delay = Math.min(delay * 1.5, 2000)
      } else {
        throw error
      }
    }
  }

  throw lastError
}
