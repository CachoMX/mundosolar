import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// PATCH /api/maintenance/config/[type] - Update configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const cookieStore = cookies()
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { intervalDays, notifyDaysBefore, autoSchedule } = body

    const config = await prisma.maintenanceConfig.upsert({
      where: {
        equipmentType: params.type
      },
      update: {
        ...(intervalDays !== undefined && { intervalDays }),
        ...(notifyDaysBefore !== undefined && { notifyDaysBefore }),
        ...(autoSchedule !== undefined && { autoSchedule }),
      },
      create: {
        equipmentType: params.type,
        intervalDays: intervalDays || 90,
        notifyDaysBefore: notifyDaysBefore || 7,
        autoSchedule: autoSchedule !== undefined ? autoSchedule : true,
      }
    })

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
