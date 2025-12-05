import { NextRequest, NextResponse } from 'next/server'

interface GrowattPlantsRequest {
  token: string
  endpoint?: string
}

interface Plant {
  plantName: string
  todayEnergy: string
  totalEnergy: string
  co2Saved?: string
  plantId?: string
  capacity?: string
  status?: string
}

interface GrowattPlantsRequestWithCredentials {
  username: string
  password: string
  endpoint?: string
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, endpoint = 'https://openapi.growatt.com' }: GrowattPlantsRequestWithCredentials = await request.json()

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username y password requeridos para obtener datos frescos' 
      }, { status: 400 })
    }

    console.log('🔐 Getting fresh token for user:', username)

    // First, login to get fresh token (just like C# code) - do it directly
    const hashPassword = (password: string): string => {
      const crypto = require('crypto')
      const hash = crypto.createHash('md5').update(password).digest('hex').toLowerCase()
      const chars = hash.split('')
      for (let i = 0; i < chars.length; i += 2) {
        if (chars[i] === '0') {
          chars[i] = 'c'
        }
      }
      return chars.join('')
    }

    const hashedPassword = hashPassword(password)
    const loginUrl = `${endpoint}/newTwoLoginAPI.do`
    
    const formData = new URLSearchParams()
    formData.append('userName', username)
    formData.append('password', hashedPassword)

    let freshToken: string | null = null
    let sessionCookies: string = ''
    try {
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MundoSolar/1.0'
        },
        body: formData.toString()
      })

      if (loginResponse.ok) {
        const loginResult = await loginResponse.json()
        if (loginResult.back && loginResult.back.success) {
          freshToken = loginResult.back.user?.cpowerToken
          // Capture session cookies from login response
          const setCookieHeaders = loginResponse.headers.get('set-cookie')
          if (setCookieHeaders) {
            // Parse Set-Cookie header to extract cookie name=value pairs
            sessionCookies = setCookieHeaders.split(',').map(cookie => {
              const [nameValue] = cookie.trim().split(';')
              return nameValue.trim()
            }).join('; ')
            console.log('🍪 Captured and parsed session cookies:', sessionCookies)
          }
        }
      }
    } catch (loginError) {
      console.error('🚨 Login error:', loginError)
    }

    if (!freshToken) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo autenticar con Growatt para obtener token fresco'
      }, { status: 401 })
    }
    console.log('✅ Got fresh token:', freshToken ? '***' + freshToken.slice(-8) : 'null')

    // Now use fresh token for plant list (just like C# code)
    const plantListUrl = `${endpoint}/PlantListAPI.do`

    try {
      console.log('🌱 Making request to:', plantListUrl)
      console.log('🌱 Fresh token being used:', freshToken ? '***' + freshToken.slice(-8) : 'null')
      
      // Use the working GET approach with proper cookies
      const plantUrl = `${plantListUrl}?token=${encodeURIComponent(freshToken)}`
      const headers: Record<string, string> = {
        'User-Agent': 'MundoSolar/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
      
      if (sessionCookies) {
        headers['Cookie'] = sessionCookies
        console.log('🍪 Using parsed session cookies for plant request')
      }

      const response = await fetch(plantUrl, {
        method: 'GET',
        headers
      })

      console.log('🌱 Response status:', response.status)
      console.log('🌱 Response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const responseText = await response.text()
        console.log('🌱 Raw response:', responseText.substring(0, 500) + '...')
        
        let result
        try {
          result = JSON.parse(responseText)
        } catch (parseError) {
          console.error('🚨 JSON Parse error:', parseError)
          throw new Error('Invalid JSON response from Growatt')
        }

        console.log('🌱 Parsed result:', result)

        // Check for success using the same structure as C# code
        if (result.back && result.back.success !== false) {
          const plantsData = result.back?.data || []
          const totalData = result.back?.totalData || {}
          console.log('🌱 Plants data from Growatt:', plantsData)
          console.log('🌱 Total data from Growatt:', totalData)
          
          const plants: Plant[] = plantsData.map((plant: any) => ({
            plantName: plant.plantName || 'Planta Sin Nombre',
            todayEnergy: plant.todayEnergy || '0',
            totalEnergy: plant.totalEnergy || '0',
            co2Saved: plant.co2Saved || 'N/A',
            plantId: plant.plantId || plant.id,
            capacity: plant.nominalPower || plant.capacity,
            status: plant.status || 'activo'
          }))

          // Use Growatt's calculated totals instead of recalculating
          const growattTotalTodayEnergy = parseFloat(totalData.todayEnergySum?.replace(/[^\d.-]/g, '')) || 0
          let growattTotalEnergy = parseFloat(totalData.totalEnergySum?.replace(/[^\d.-]/g, '')) || 0
          
          // Convert MWh to kWh if needed
          if (totalData.totalEnergySum?.includes('MWh')) {
            growattTotalEnergy = growattTotalEnergy * 1000
          }
          
          const growattCO2 = parseFloat(totalData.CO2Sum?.replace(/[^\d.-]/g, '')) || 0

          return NextResponse.json({
            success: true,
            message: 'Datos de plantas obtenidos exitosamente desde Growatt',
            data: {
              plants: plants,
              totalPlants: plants.length,
              totalTodayEnergy: growattTotalTodayEnergy,
              totalEnergy: growattTotalEnergy,
              co2Saved: growattCO2
            }
          })
        } else {
          console.log('🚨 Growatt API returned error:', result)
          return NextResponse.json({
            success: false,
            error: result.back?.msg || result.msg || 'No se pudieron obtener los datos de las plantas'
          }, { status: 400 })
        }
      } else {
        const errorText = await response.text()
        console.error('🚨 HTTP Error:', response.status, errorText)
        return NextResponse.json({
          success: false,
          error: `Error de conexión con Growatt: ${response.status} - ${errorText}`
        }, { status: response.status })
      }

    } catch (fetchError) {
      console.error('🚨 Growatt Plants API error:', fetchError)
      
      // Return demo data for testing if API is not accessible
      const demoPlants: Plant[] = [
        {
          plantName: 'Casa Rodriguez - Residencial',
          todayEnergy: '45.7 kWh',
          totalEnergy: '12,456.3 kWh',
          co2Saved: '8.2 ton',
          plantId: 'demo_001',
          capacity: '10 kW',
          status: 'activo'
        },
        {
          plantName: 'Empresa Solar Tech',
          todayEnergy: '128.9 kWh',
          totalEnergy: '34,567.8 kWh',
          co2Saved: '22.1 ton',
          plantId: 'demo_002',
          capacity: '25 kW',
          status: 'activo'
        },
        {
          plantName: 'Granja Los Girasoles',
          todayEnergy: '234.5 kWh',
          totalEnergy: '78,901.2 kWh',
          co2Saved: '51.3 ton',
          plantId: 'demo_003',
          capacity: '50 kW',
          status: 'activo'
        }
      ]

      return NextResponse.json({
        success: true,
        message: 'Datos de demostración (API Growatt no disponible)',
        data: {
          plants: demoPlants,
          totalPlants: demoPlants.length,
          totalTodayEnergy: 409.1,
          totalEnergy: 125925.3
        }
      })
    }

  } catch (error: any) {
    console.error('Plants API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}