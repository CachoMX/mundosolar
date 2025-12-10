import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
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

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Prisma user by email to get the correct ID
    const user = await prisma.user.findFirst({
      where: { email: authUser.email! },
      select: { id: true }
    })

    // If user not found in our DB, return empty notifications (user exists in Supabase but not synced)
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0
        }
      })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly && { read: false })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
