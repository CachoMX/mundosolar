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

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
