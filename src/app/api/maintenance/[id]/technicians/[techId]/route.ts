import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// DELETE /api/maintenance/[id]/technicians/[techId] - Remove technician
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; techId: string } }
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

    await prisma.maintenanceTechnician.delete({
      where: {
        maintenanceId_technicianId: {
          maintenanceId: params.id,
          technicianId: params.techId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Technician removed successfully'
    })
  } catch (error) {
    console.error('Error removing technician:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
