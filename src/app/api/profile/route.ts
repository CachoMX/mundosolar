import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Helper to get current user from Supabase session
async function getCurrentUser() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper function to get Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// GET /api/profile - Get current user's profile
export async function GET() {
  try {
    const authUser = await getCurrentUser()

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        image: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      // If user exists in Supabase but not in our DB, create them
      const newUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email,
          role: authUser.user_metadata?.role || 'USER',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          employeeId: true,
          image: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return NextResponse.json({
        success: true,
        data: newUser
      })
    }

    return NextResponse.json({
      success: true,
      data: user
    })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener perfil' },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getCurrentUser()

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, department, employeeId, image } = body

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name: name || undefined,
        department: department !== undefined ? department : undefined,
        employeeId: employeeId !== undefined ? employeeId : undefined,
        image: image !== undefined ? image : undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        image: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Also update user metadata in Supabase
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        name: name || updatedUser.name,
        department: department || updatedUser.department,
        employeeId: employeeId || updatedUser.employeeId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: updatedUser
    })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar perfil' },
      { status: 500 }
    )
  }
}
