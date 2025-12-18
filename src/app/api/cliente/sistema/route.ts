import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

/**
 * Hash password for Growatt API
 */
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

/**
 * Fetch live data from Growatt API
 */
async function fetchLiveGrowattData(username: string, password: string) {
  const endpoint = process.env.GROWATT_API_URL || 'https://openapi.growatt.com'

  // Step 1: Login to get fresh token
  const hashedPassword = hashPassword(password)
  const loginUrl = `${endpoint}/newTwoLoginAPI.do`

  const formData = new URLSearchParams()
  formData.append('userName', username)
  formData.append('password', hashedPassword)

  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MundoSolar/1.0'
    },
    body: formData.toString()
  })

  if (!loginResponse.ok) {
    throw new Error('Error de conexión con Growatt')
  }

  const loginResult = await loginResponse.json()
  if (!loginResult.back || !loginResult.back.success) {
    throw new Error('Credenciales de Growatt inválidas')
  }

  const freshToken = loginResult.back.user?.cpowerToken

  // Capture session cookies
  let sessionCookies = ''
  const setCookieHeaders = loginResponse.headers.get('set-cookie')
  if (setCookieHeaders) {
    sessionCookies = setCookieHeaders.split(',').map(cookie => {
      const [nameValue] = cookie.trim().split(';')
      return nameValue.trim()
    }).join('; ')
  }

  if (!freshToken) {
    throw new Error('No se recibió token de Growatt')
  }

  // Step 2: Get plant list with totals
  const plantListUrl = `${endpoint}/PlantListAPI.do?token=${encodeURIComponent(freshToken)}`
  const headers: Record<string, string> = {
    'User-Agent': 'MundoSolar/1.0',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache'
  }

  if (sessionCookies) {
    headers['Cookie'] = sessionCookies
  }

  const plantsResponse = await fetch(plantListUrl, {
    method: 'GET',
    headers
  })

  if (!plantsResponse.ok) {
    throw new Error('Error al obtener plantas de Growatt')
  }

  const plantsResult = await plantsResponse.json()

  if (!plantsResult.back || plantsResult.back.success === false) {
    throw new Error('Error al obtener datos de plantas')
  }

  const plantsData = plantsResult.back?.data || []
  const totalData = plantsResult.back?.totalData || {}

  // Debug: Log the first plant data to see available fields
  if (plantsData.length > 0) {
    console.log('[Cliente Sistema] First plant data fields:', JSON.stringify(plantsData[0], null, 2))
    console.log('[Cliente Sistema] Total data fields:', JSON.stringify(totalData, null, 2))
  }

  // Parse totals from Growatt (aggregated across all plants)
  const totalTodayEnergy = parseFloat(totalData.todayEnergySum?.replace(/[^\d.-]/g, '')) || 0
  let totalEnergy = parseFloat(totalData.totalEnergySum?.replace(/[^\d.-]/g, '')) || 0

  // Convert MWh to kWh if needed
  if (totalData.totalEnergySum?.includes('MWh')) {
    totalEnergy = totalEnergy * 1000
  }

  const co2Saved = parseFloat(totalData.CO2Sum?.replace(/[^\d.-]/g, '')) || 0

  // Calculate current power from all plants
  let totalCurrentPower = 0
  let hasOnlinePlant = false

  for (const plant of plantsData) {
    totalCurrentPower += parseFloat(plant.currentPower) || 0
    if (plant.status === '1') {
      hasOnlinePlant = true
    }
  }

  // Consider "online" if we have plants with data (even if offline due to night time)
  // This matches the admin panel behavior
  const hasValidData = plantsData.length > 0 && totalEnergy > 0

  // Try different field names for current power
  // Growatt API might use: currentPower, pac, power, nominalPower
  let totalCurrentPowerFromPlants = 0
  for (const plant of plantsData) {
    const power = parseFloat(plant.currentPower) ||
                  parseFloat(plant.pac) ||
                  parseFloat(plant.power) ||
                  parseFloat(plant.nominalPower) || 0
    totalCurrentPowerFromPlants += power
  }

  // Also check totalData for current power
  const currentPowerFromTotals = parseFloat(totalData.currentPowerSum?.replace(/[^\d.-]/g, '')) ||
                                  parseFloat(totalData.pSum?.replace(/[^\d.-]/g, '')) ||
                                  totalCurrentPower

  const finalCurrentPower = totalCurrentPowerFromPlants || currentPowerFromTotals || totalCurrentPower

  return {
    status: hasValidData ? 'online' : 'offline',
    currentPower: finalCurrentPower,
    dailyGeneration: totalTodayEnergy,
    monthlyGeneration: 0, // Growatt doesn't provide this in totals
    totalGeneration: totalEnergy,
    co2Saved,
    plantCount: plantsData.length,
    plants: plantsData.map((p: any) => ({
      name: p.plantName,
      todayEnergy: parseFloat(p.todayEnergy) || 0,
      totalEnergy: parseFloat(p.totalEnergy) || 0,
      status: p.status === '1' ? 'online' : 'offline'
    })),
    lastUpdate: new Date().toISOString(),
    // Debug info - remove later
    _debug: {
      plantFields: plantsData[0] ? Object.keys(plantsData[0]) : [],
      totalDataFields: Object.keys(totalData),
      rawCurrentPower: plantsData[0]?.currentPower,
      rawPac: plantsData[0]?.pac,
      rawPower: plantsData[0]?.power
    }
  }
}

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

    // Get client's Growatt credentials
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        growattUsername: true,
        growattPassword: true
      }
    })

    if (!client?.growattUsername || !client?.growattPassword) {
      // No credentials - return empty data
      return NextResponse.json({
        success: true,
        data: {
          status: 'offline',
          currentPower: 0,
          dailyGeneration: 0,
          monthlyGeneration: 0,
          totalGeneration: 0,
          co2Saved: 0,
          plantCount: 0,
          plants: [],
          lastUpdate: null,
          error: 'No hay credenciales de Growatt configuradas'
        }
      })
    }

    // Fetch live data from Growatt
    const liveData = await fetchLiveGrowattData(
      client.growattUsername,
      client.growattPassword
    )

    return NextResponse.json({
      success: true,
      data: liveData
    })
  } catch (error) {
    console.error('Client system error:', error)

    // Return error but with structure
    return NextResponse.json({
      success: true,
      data: {
        status: 'offline',
        currentPower: 0,
        dailyGeneration: 0,
        monthlyGeneration: 0,
        totalGeneration: 0,
        co2Saved: 0,
        plantCount: 0,
        plants: [],
        lastUpdate: null,
        error: error instanceof Error ? error.message : 'Error al conectar con Growatt'
      }
    })
  }
}
