import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

function hashPassword(password: string): string {
  const hash = crypto.createHash('md5').update(password).digest('hex').toLowerCase()
  const chars = hash.split('')
  for (let i = 0; i < chars.length; i += 2) {
    if (chars[i] === '0') {
      chars[i] = 'c'
    }
  }
  return chars.join('')
}

// GET /api/cliente/sistemas - Get all solar systems for the client
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const clientId = payload.clientId as string

    // First try to get plants from Growatt (matches what dashboard shows)
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        growattUsername: true,
        growattPassword: true
      }
    })

    if (client?.growattUsername && client?.growattPassword) {
      try {
        const endpoint = process.env.GROWATT_API_URL || 'https://openapi.growatt.com'
        const hashedPassword = hashPassword(client.growattPassword)

        const formData = new URLSearchParams()
        formData.append('userName', client.growattUsername)
        formData.append('password', hashedPassword)

        const loginResponse = await fetch(`${endpoint}/newTwoLoginAPI.do`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'MundoSolar/1.0'
          },
          body: formData.toString()
        })

        if (loginResponse.ok) {
          const loginResult = await loginResponse.json()
          if (loginResult.back?.success) {
            const freshToken = loginResult.back.user?.cpowerToken

            let sessionCookies = ''
            const setCookieHeaders = loginResponse.headers.get('set-cookie')
            if (setCookieHeaders) {
              sessionCookies = setCookieHeaders.split(',').map(cookie => {
                const [nameValue] = cookie.trim().split(';')
                return nameValue.trim()
              }).join('; ')
            }

            const headers: Record<string, string> = {
              'User-Agent': 'MundoSolar/1.0',
              'Accept': 'application/json'
            }
            if (sessionCookies) {
              headers['Cookie'] = sessionCookies
            }

            const plantsResponse = await fetch(
              `${endpoint}/PlantListAPI.do?token=${encodeURIComponent(freshToken)}`,
              { method: 'GET', headers }
            )

            if (plantsResponse.ok) {
              const plantsResult = await plantsResponse.json()
              const plantsData = plantsResult.back?.data || []

              if (plantsData.length > 0) {
                return NextResponse.json({
                  success: true,
                  data: plantsData.map((p: any) => ({
                    id: p.plantId || p.id || p.plantName,
                    name: p.plantName,
                    capacity: null
                  }))
                })
              }
            }
          }
        }
      } catch (growattError) {
        console.warn('Growatt fetch failed, falling back to database:', growattError)
      }
    }

    // Fallback: Get systems from database
    const systems = await prisma.solarSystem.findMany({
      where: {
        clientId,
        isActive: true
      },
      select: {
        id: true,
        systemName: true,
        capacity: true
      },
      orderBy: {
        systemName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: systems.map(s => ({
        id: s.id,
        name: s.systemName,
        capacity: s.capacity ? Number(s.capacity) : null
      }))
    })
  } catch (error) {
    console.error('Error fetching client solar systems:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar sistemas solares' },
      { status: 500 }
    )
  }
}
