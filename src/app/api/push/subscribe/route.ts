import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// POST /api/push/subscribe
export async function POST(request: NextRequest) {
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

    const subscription = await request.json()

    // Store subscription in database
    // First, check if user already has a push subscription record
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Store the subscription data
    // You might want to create a PushSubscription model in Prisma
    // For now, we'll store it in user metadata or a separate table
    // This is a simplified version - you should create a proper table

    console.log('Push subscription registered for user:', session.user.id)
    console.log('Subscription:', subscription)

    // TODO: Store in database
    // For now, just acknowledge
    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully'
    })
  } catch (error: any) {
    console.error('Error registering push subscription:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
