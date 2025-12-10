import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// GET /api/admin/solar-systems - Fetch all client solar systems (admin only)
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for server-side authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Not needed for GET requests
          },
          remove(name: string, options: CookieOptions) {
            // Not needed for GET requests
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if requesting solar systems for a specific client
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    // If clientId is provided, return solar systems for that client only
    if (clientId) {
      const solarSystems = await prisma.solarSystem.findMany({
        where: {
          clientId: clientId,
          isActive: true
        },
        select: {
          id: true,
          systemName: true,
          capacity: true,
          installationDate: true,
          isActive: true,
          estimatedGeneration: true
        }
      })

      return NextResponse.json({
        success: true,
        data: solarSystems,
        count: solarSystems.length
      })
    }

    // Otherwise, return all clients with Growatt credentials
    const clientsWithGrowatt = await prisma.client.findMany({
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
        growattPassword: true,
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
        },
        growattCredentials: {
          select: {
            id: true,
            isActive: true,
            lastSync: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: clientsWithGrowatt,
      count: clientsWithGrowatt.length
    })
  } catch (error: any) {
    console.error('Error fetching client solar systems:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}