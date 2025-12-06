import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

// Helper function to get Supabase admin client (lazy initialization)
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

// GET - Fetch all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get count by role
    const adminCount = users.filter(u => u.role === 'ADMIN').length
    const employeeCount = users.filter(u => u.role === 'EMPLOYEE').length
    const userCount = users.filter(u => u.role === 'USER').length
    const activeCount = users.filter(u => u.isActive).length

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats: {
          total: users.length,
          active: activeCount,
          admins: adminCount,
          employees: employeeCount,
          regularUsers: userCount
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener usuarios'
      },
      { status: 500 }
    )
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, department, employeeId } = body

    // Validate required fields
    if (!name || !email || !role || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nombre, email, contraseña y rol son requeridos'
        },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'El email ya está registrado'
        },
        { status: 400 }
      )
    }

    // Get Supabase admin client
    const supabaseAdmin = getSupabaseAdmin()

    // Create user in Supabase Auth first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
        department,
        employeeId
      }
    })

    if (authError) {
      console.error('Supabase Auth error:', authError)
      return NextResponse.json(
        {
          success: false,
          error: `Error al crear usuario en Supabase: ${authError.message}`
        },
        { status: 400 }
      )
    }

    // Create user in Prisma database
    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id, // Use same ID from Supabase Auth
        name,
        email,
        role,
        department: department || null,
        employeeId: employeeId || null,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        isActive: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear usuario'
      },
      { status: 500 }
    )
  }
}
