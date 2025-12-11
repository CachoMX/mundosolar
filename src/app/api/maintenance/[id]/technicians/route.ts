import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/maintenance/[id]/technicians - List assigned technicians
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const technicians = await prisma.maintenanceTechnician.findMany({
      where: {
        maintenanceId: params.id
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: technicians
    })
  } catch (error) {
    console.error('Error fetching technicians:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance/[id]/technicians - Assign technician
export async function POST(
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { technicianId, role } = body

    if (!technicianId) {
      return NextResponse.json(
        { success: false, error: 'technicianId is required' },
        { status: 400 }
      )
    }

    const assignment = await prisma.maintenanceTechnician.create({
      data: {
        maintenanceId: params.id,
        technicianId,
        role: role || null
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: assignment
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Technician already assigned' },
        { status: 400 }
      )
    }
    console.error('Error assigning technician:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
