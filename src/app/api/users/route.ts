import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Supabase admin client (server-side only with service role key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

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
    const managerCount = users.filter(u => u.role === 'MANAGER').length
    const technicianCount = users.filter(u => u.role === 'TECHNICIAN').length
    const clientCount = users.filter(u => u.role === 'CLIENT').length
    const activeCount = users.filter(u => u.isActive).length

    return NextResponse.json({
      success: true,
      data: {
        users,
        stats: {
          total: users.length,
          active: activeCount,
          admins: adminCount,
          managers: managerCount,
          technicians: technicianCount,
          clients: clientCount
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
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, newPassword, role, department, employeeId } = body

    // Validate required fields
    if (!name || !email || !role || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nombre, email, contraseña y rol son requeridos'
        },
        { status: 400 }
      )
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres'
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

    // Create user in Supabase Auth first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: newPassword,
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
  } finally {
    await prisma.$disconnect()
  }
}
