import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Contact settings keys
const CONTACT_KEYS = [
  'contact_name',
  'contact_position',
  'contact_address',
  'contact_neighborhood',
  'contact_city',
  'contact_state',
  'contact_postal_code',
  'contact_phone',
  'contact_email'
]

// Default values
const DEFAULT_VALUES: Record<string, string> = {
  contact_name: 'CORINA DENISSE GOMEZ SANTOS',
  contact_position: 'ADMINISTRADORA GENERAL',
  contact_address: 'ALLENDE #128',
  contact_neighborhood: 'CENTRO',
  contact_city: 'COLIMA',
  contact_state: 'COLIMA',
  contact_postal_code: '28000',
  contact_phone: '3121545172',
  contact_email: 'proyectosmundosolar@gmail.com'
}

// GET - Fetch contact settings (public)
export async function GET() {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: CONTACT_KEYS
        }
      }
    })

    // Convert to object with defaults
    const contactData: Record<string, string> = { ...DEFAULT_VALUES }
    settings.forEach(setting => {
      contactData[setting.key] = setting.value
    })

    return NextResponse.json({
      success: true,
      data: contactData
    })
  } catch (error: any) {
    console.error('Error fetching contact settings:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración de contacto' },
      { status: 500 }
    )
  }
}

// PUT - Update contact settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Check if user is admin (lookup by email since Supabase Auth ID differs from Prisma User ID)
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { role: true }
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo los administradores pueden modificar esta configuración' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update each setting
    const updatePromises = CONTACT_KEYS.map(key => {
      const value = body[key]
      if (value !== undefined) {
        return prisma.systemSettings.upsert({
          where: { key },
          update: { value: String(value) },
          create: {
            key,
            value: String(value),
            type: 'string',
            description: `Configuración de contacto: ${key}`
          }
        })
      }
      return null
    }).filter(Boolean)

    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      message: 'Configuración de contacto actualizada exitosamente'
    })
  } catch (error: any) {
    console.error('Error updating contact settings:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración de contacto' },
      { status: 500 }
    )
  }
}
