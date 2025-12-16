import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/clients/[id]/maintenances - Get all maintenances for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    const maintenances = await withRetry(() => prisma.maintenanceRecord.findMany({
      where: { clientId },
      include: {
        technicians: {
          include: {
            technician: {
              select: {
                name: true,
              }
            }
          }
        },
        solarSystem: {
          select: {
            systemName: true,
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    }))

    return NextResponse.json({
      success: true,
      data: maintenances
    })
  } catch (error) {
    console.error('Error fetching client maintenances:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar mantenimientos' },
      { status: 500 }
    )
  }
}
