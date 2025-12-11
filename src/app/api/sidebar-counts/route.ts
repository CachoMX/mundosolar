import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/sidebar-counts - Get counts for sidebar badges
export async function GET() {
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts in parallel
    const [
      totalClients,
      pendingMaintenance,
      pendingOrders,
    ] = await Promise.all([
      // Total active clients
      prisma.client.count({
        where: { isActive: true }
      }),
      // Maintenance that needs attention (pending approval + scheduled for today/overdue)
      prisma.maintenanceRecord.count({
        where: {
          status: {
            in: ['PENDING_APPROVAL', 'SCHEDULED', 'IN_PROGRESS']
          }
        }
      }),
      // Pending orders
      prisma.order.count({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      }).catch(() => 0)
    ])

    return NextResponse.json({
      success: true,
      data: {
        clients: totalClients,
        maintenance: pendingMaintenance,
        orders: pendingOrders || 0
      }
    })
  } catch (error) {
    console.error('Error fetching sidebar counts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
