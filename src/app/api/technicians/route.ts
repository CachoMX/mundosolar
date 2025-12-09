import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/technicians - Get all active technicians
export async function GET(request: NextRequest) {
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

    // Get current user to check permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Only ADMIN, MANAGER, and TECHNICIAN can see technician list
    if (!user || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: true
      },
      orderBy: {
        name: 'asc'
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
