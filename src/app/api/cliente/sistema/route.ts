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
 * Parse power value from various formats and convert to kW
 * Growatt API returns power in Watts (e.g., 1454.5 for 1.45 kW)
 */
function parsePower(value: any): number {
  if (value === null || value === undefined) return 0

  let num: number

  if (typeof value === 'number') {
    num = value
  } else if (typeof value === 'string') {
    // Remove units like 'kW', 'W', etc.
    const cleaned = value.replace(/[^\d.-]/g, '')
    num = parseFloat(cleaned)

    if (isNaN(num)) return 0

    // If original string explicitly contains 'kW', it's already in kW
    if (value.toLowerCase().includes('kw')) {
      return num
    }
    // If original string contains 'W' (but not 'kW'), convert to kW
    if (value.toLowerCase().includes('w')) {
      return num / 1000
    }
  } else {
    return 0
  }

  // If the value is greater than 100, assume it's in Watts and convert to kW
  // (No typical solar installation produces more than 100 kW per inverter)
  if (num > 100) {
    return num / 1000
  }

  return num
}

/**
 * Fetch device list with real-time power for a plant
 */
async function fetchPlantDevices(endpoint: string, token: string, plantId: string, headers: Record<string, string>) {
  // Try multiple device list endpoints - prioritize API endpoints that work with token auth
  const deviceEndpoints = [
    // API endpoints (work with token auth, no web session needed)
    { url: `${endpoint}/newTwoPlantAPI.do?op=getAllDeviceList&plantId=${plantId}&token=${token}`, method: 'GET', body: '' },
    { url: `${endpoint}/newPlantAPI.do?op=getAllDeviceList&plantId=${plantId}&token=${token}`, method: 'GET', body: '' },
    { url: `${endpoint}/newPlantAPI.do?op=getAllDeviceListThree&plantId=${plantId}&token=${token}`, method: 'GET', body: '' },
    // POST endpoints (may need web session)
    { url: `${endpoint}/panel/getDevicesByPlantList`, method: 'POST', body: `plantId=${plantId}&currPage=1` },
  ]

  for (const { url, method, body } of deviceEndpoints) {
    try {
      console.log(`[Growatt] Trying device endpoint: ${url.split('?')[0]} (${method})`)
      const requestHeaders = method === 'POST'
        ? { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }
        : headers

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        ...(method === 'POST' && body ? { body } : {})
      })

      if (!response.ok) {
        console.log(`[Growatt] Device endpoint failed: ${response.status}`)
        continue
      }

      const text = await response.text()
      const trimmedText = text.trim()
      if (trimmedText.startsWith('<') || trimmedText.startsWith('<!')) {
        console.log(`[Growatt] Device endpoint returned HTML`)
        continue
      }

      const result = JSON.parse(trimmedText)
      console.log(`[Growatt] Device list response:`, JSON.stringify(result, null, 2).slice(0, 3000))

      // Check if we got valid data
      if (result.obj || result.back || result.result === 1 || result.datas || result.deviceList) {
        return result
      }
    } catch (error) {
      console.log(`[Growatt] Device endpoint error:`, error)
      continue
    }
  }
  return null
}

/**
 * Fetch Mix system status (for MIX inverters with battery)
 */
async function fetchMixStatus(endpoint: string, token: string, plantId: string, mixSn: string, headers: Record<string, string>) {
  try {
    const mixUrl = `${endpoint}/newMixApi.do?op=getMIXTotalData&plantId=${encodeURIComponent(plantId)}&mixSn=${encodeURIComponent(mixSn)}&token=${encodeURIComponent(token)}`
    const response = await fetch(mixUrl, { method: 'GET', headers })

    if (!response.ok) return null

    const result = await response.json()
    console.log(`[Growatt] Mix status for ${mixSn}:`, JSON.stringify(result, null, 2).slice(0, 1000))
    return result
  } catch (error) {
    return null
  }
}

/**
 * Fetch inverter real-time data using various API endpoints
 */
async function fetchInverterData(endpoint: string, token: string, plantId: string, inverterSn: string, deviceType: string, headers: Record<string, string>) {
  // Build list of endpoints to try based on device type
  const endpoints: string[] = []

  // Type-specific endpoints first
  if (deviceType === 'mix' || deviceType === 'MIX') {
    endpoints.push(`${endpoint}/panel/mix/getMIXTotalData?mixSn=${inverterSn}`)
    endpoints.push(`${endpoint}/newMixApi.do?op=getMIXTotalData&plantId=${plantId}&mixSn=${inverterSn}&token=${token}`)
  } else if (deviceType === 'tlx' || deviceType === 'TLX') {
    endpoints.push(`${endpoint}/panel/tlx/getTLXTotalData?tlxSn=${inverterSn}`)
    endpoints.push(`${endpoint}/newTlxApi.do?op=getTLXTotalData&plantId=${plantId}&tlxSn=${inverterSn}&token=${token}`)
  } else if (deviceType === 'min' || deviceType === 'MIN') {
    endpoints.push(`${endpoint}/panel/min/getMinTotalData?minSn=${inverterSn}`)
    endpoints.push(`${endpoint}/newMinApi.do?op=getMinTotalData&plantId=${plantId}&minSn=${inverterSn}&token=${token}`)
  } else if (deviceType === 'spa' || deviceType === 'SPA') {
    endpoints.push(`${endpoint}/panel/spa/getSPATotalData?spaSn=${inverterSn}`)
    endpoints.push(`${endpoint}/newSpaApi.do?op=getSPATotalData&plantId=${plantId}&spaSn=${inverterSn}&token=${token}`)
  } else if (deviceType === 'inv' || deviceType === 'INV' || deviceType === 'inverter') {
    endpoints.push(`${endpoint}/panel/inverter/getInverterTotalData?inverterId=${inverterSn}`)
    endpoints.push(`${endpoint}/newInverterAPI.do?op=getInverterData&plantId=${plantId}&inverterId=${inverterSn}&token=${token}`)
  } else if (deviceType === 'max' || deviceType === 'MAX') {
    endpoints.push(`${endpoint}/panel/max/getMAXTotalData?maxSn=${inverterSn}`)
    endpoints.push(`${endpoint}/newMaxApi.do?op=getMAXTotalData&plantId=${plantId}&maxSn=${inverterSn}&token=${token}`)
  }

  // Generic fallback endpoints
  endpoints.push(`${endpoint}/device/getInverterTotalData?plantId=${plantId}&inverterId=${inverterSn}`)
  endpoints.push(`${endpoint}/newInverterAPI.do?op=getInverterData&plantId=${plantId}&inverterId=${inverterSn}&token=${token}`)

  for (const url of endpoints) {
    try {
      console.log(`[Growatt] Trying inverter endpoint: ${url.split('?')[0]}`)
      const response = await fetch(url, { method: 'GET', headers })

      if (!response.ok) {
        console.log(`[Growatt] Inverter endpoint failed: ${response.status}`)
        continue
      }

      const text = await response.text()
      const trimmedText = text.trim()
      if (trimmedText.startsWith('<') || trimmedText.startsWith('<!')) {
        console.log(`[Growatt] Inverter endpoint returned HTML`)
        continue
      }

      const result = JSON.parse(trimmedText)
      console.log(`[Growatt] Inverter data for ${inverterSn}:`, JSON.stringify(result, null, 2).slice(0, 1500))

      // Check if we got valid data with power info
      if (result.obj || result.back?.success || result.result === 1 || result.data) {
        return result
      }
    } catch (error) {
      console.log(`[Growatt] Inverter endpoint error:`, error)
      continue
    }
  }
  return null
}

/**
 * Fetch devices by plant (web dashboard endpoint with real-time power)
 */
async function fetchDevicesByPlant(endpoint: string, plantId: string, headers: Record<string, string>) {
  try {
    // This is the endpoint the web interface uses to get device data with real-time power
    const url = `${endpoint}/panel/getDevicesByPlant`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `plantId=${encodeURIComponent(plantId)}`
    })

    if (!response.ok) {
      console.log(`[Growatt] getDevicesByPlant failed for ${plantId}: ${response.status}`)
      return null
    }

    const text = await response.text()
    const trimmedText = text.trim()
    // Check if response is HTML (error page) vs JSON
    if (trimmedText.startsWith('<') || trimmedText.startsWith('<!')) {
      console.log(`[Growatt] getDevicesByPlant returned HTML for ${plantId}`)
      return null
    }

    const result = JSON.parse(trimmedText)
    console.log(`[Growatt] getDevicesByPlant for ${plantId}:`, JSON.stringify(result, null, 2).slice(0, 2000))
    return result
  } catch (error) {
    console.error(`Error fetching devices by plant for ${plantId}:`, error)
    return null
  }
}

/**
 * Fetch plant data from web panel
 */
async function fetchPlantOverview(endpoint: string, plantId: string, headers: Record<string, string>) {
  try {
    const url = `${endpoint}/panel/getPlantData`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `plantId=${encodeURIComponent(plantId)}`
    })

    if (!response.ok) {
      console.log(`[Growatt] Plant overview failed for ${plantId}: ${response.status}`)
      return null
    }

    const text = await response.text()
    const trimmedText = text.trim()
    if (trimmedText.startsWith('<') || trimmedText.startsWith('<!')) {
      console.log(`[Growatt] Plant overview returned HTML for ${plantId}`)
      return null
    }

    const result = JSON.parse(trimmedText)
    console.log(`[Growatt] Plant overview for ${plantId}:`, JSON.stringify(result, null, 2).slice(0, 2000))
    return result
  } catch (error) {
    console.error(`Error fetching plant overview for ${plantId}:`, error)
    return null
  }
}

/**
 * Fetch plant detail to get real-time power
 */
async function fetchPlantDetail(endpoint: string, token: string, plantId: string, headers: Record<string, string>) {
  try {
    const detailUrl = `${endpoint}/PlantDetailAPI.do?token=${encodeURIComponent(token)}&plantId=${encodeURIComponent(plantId)}`
    const response = await fetch(detailUrl, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      console.log(`[Growatt] PlantDetailAPI failed for ${plantId}: ${response.status}`)
      return null
    }

    const result = await response.json()
    console.log(`[Growatt] PlantDetailAPI response for ${plantId}:`, JSON.stringify(result, null, 2).slice(0, 2000))

    if (result.back?.success) {
      return result.back
    }
    return result // Return full result for debugging
  } catch (error) {
    console.error(`Error fetching plant detail for ${plantId}:`, error)
    return null
  }
}

/**
 * Fetch device list from OpenAPI endpoint (official Growatt API)
 */
async function fetchDevicesFromOpenAPI(token: string, plantId: string): Promise<any> {
  const openApiEndpoint = 'https://openapi.growatt.com'

  // Try multiple OpenAPI endpoints for device list
  const endpoints = [
    `${openApiEndpoint}/newTwoPlantAPI.do?op=getAllDeviceList&plantId=${plantId}&token=${token}`,
    `${openApiEndpoint}/newPlantAPI.do?op=getAllDeviceList&plantId=${plantId}&token=${token}`,
    `${openApiEndpoint}/PlantDetailAPI.do?token=${token}&plantId=${plantId}`,
  ]

  for (const url of endpoints) {
    try {
      console.log(`[Growatt] Trying OpenAPI: ${url.split('?')[0]}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        console.log(`[Growatt] OpenAPI endpoint failed: ${response.status}`)
        continue
      }

      const text = await response.text()
      const trimmedText = text.trim()
      if (trimmedText.startsWith('<')) {
        console.log(`[Growatt] OpenAPI endpoint returned HTML`)
        continue
      }

      const result = JSON.parse(trimmedText)
      console.log(`[Growatt] OpenAPI response:`, JSON.stringify(result, null, 2).slice(0, 2000))

      // Check if we got valid data
      if (result.obj || result.back?.success || result.back?.data) {
        return result
      }
    } catch (error) {
      console.log(`[Growatt] OpenAPI endpoint error:`, error)
      continue
    }
  }
  return null
}

/**
 * Fetch plant info from index which includes real-time power
 * This is what the Growatt dashboard displays on the main page
 */
async function fetchPlantIndexInfo(endpoint: string, plantId: string, headers: Record<string, string>) {
  const indexEndpoints = [
    `${endpoint}/index/getPlantListTitle`,
    `${endpoint}/panel/getPlantData?plantId=${plantId}`,
    `${endpoint}/indexbC/getPlantListTitle`,
  ]

  for (const url of indexEndpoints) {
    try {
      console.log(`[Growatt] Trying index endpoint: ${url.split('?')[0]}`)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `plantId=${plantId}`
      })

      if (!response.ok) {
        console.log(`[Growatt] Index endpoint failed: ${response.status}`)
        continue
      }

      const text = await response.text()
      const trimmedText = text.trim()
      if (trimmedText.startsWith('<') || trimmedText.startsWith('<!')) {
        console.log(`[Growatt] Index endpoint returned HTML`)
        continue
      }

      const result = JSON.parse(trimmedText)
      console.log(`[Growatt] Index data for ${plantId}:`, JSON.stringify(result, null, 2).slice(0, 2000))

      // Look for power data in various formats
      const powerValue = parsePower(result.powerValue) ||
                         parsePower(result.obj?.powerValue) ||
                         parsePower(result.obj?.pac) ||
                         parsePower(result.obj?.currentPower) ||
                         parsePower(result.obj?.nowPower) ||
                         parsePower(result.pac) ||
                         parsePower(result.currentPower) ||
                         parsePower(result.nowPower) ||
                         0

      if (powerValue > 0) {
        return { power: powerValue, raw: result }
      }
    } catch (error) {
      console.log(`[Growatt] Index endpoint error:`, error)
      continue
    }
  }
  return null
}

/**
 * Fetch live data from Growatt API
 * Note: server.growatt.com has real-time power, openapi.growatt.com does not
 */
async function fetchLiveGrowattData(username: string, password: string) {
  // ALWAYS use server.growatt.com for real-time data (same as web interface)
  // The openapi.growatt.com endpoint doesn't support web panel endpoints needed for real-time power
  const endpoint = 'https://server.growatt.com'
  console.log('[Growatt] Using endpoint:', endpoint)

  // Step 1: Login using the web login endpoint (same as browser)
  const hashedPassword = hashPassword(password)

  // Try old login API first - it sets better session cookies
  const loginUrl = `${endpoint}/newLoginAPI.do`

  const formData = new URLSearchParams()
  formData.append('userName', username)
  formData.append('password', hashedPassword)

  console.log('[Growatt] Attempting web login to:', loginUrl)

  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Origin': endpoint,
      'Referer': `${endpoint}/login`,
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: formData.toString()
  })

  let loginResult: any = null
  let sessionCookies = ''
  let loginSuccessResponse = loginResponse

  // Helper to capture cookies
  const captureCookies = (response: Response): string => {
    let cookies = ''
    try {
      const setCookieArray = response.headers.getSetCookie?.() || []
      if (setCookieArray.length > 0) {
        cookies = setCookieArray.map((cookie: string) => {
          const [nameValue] = cookie.trim().split(';')
          return nameValue.trim()
        }).join('; ')
      }
    } catch {
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        cookies = setCookieHeader.split(/,(?=\s*\w+=)/).map((cookie: string) => {
          const [nameValue] = cookie.trim().split(';')
          return nameValue.trim()
        }).join('; ')
      }
    }
    return cookies
  }

  // Try old login API first
  if (loginResponse.ok) {
    loginResult = await loginResponse.json()
    console.log('[Growatt] newLoginAPI response:', JSON.stringify(loginResult, null, 2).slice(0, 1000))
    sessionCookies = captureCookies(loginResponse)
  }

  // If old API fails, try the newer API
  if (!loginResult?.back?.success) {
    console.log('[Growatt] newLoginAPI failed, trying newTwoLoginAPI.do...')
    const loginUrl2 = `${endpoint}/newTwoLoginAPI.do`

    const loginResponse2 = await fetch(loginUrl2, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Origin': endpoint,
        'Referer': `${endpoint}/login`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: formData.toString()
    })

    if (loginResponse2.ok) {
      loginResult = await loginResponse2.json()
      console.log('[Growatt] newTwoLoginAPI response:', JSON.stringify(loginResult, null, 2).slice(0, 1000))
      sessionCookies = captureCookies(loginResponse2)
      loginSuccessResponse = loginResponse2
    }
  }

  if (!loginResult?.back?.success) {
    throw new Error('Credenciales de Growatt inválidas')
  }

  const freshToken = loginResult.back.user?.cpowerToken
  const userId = loginResult.back.user?.id

  console.log('[Growatt] Session cookies captured:', sessionCookies ? sessionCookies.slice(0, 150) + '...' : 'NONE')

  if (!freshToken) {
    throw new Error('No se recibió token de Growatt')
  }

  console.log('[Growatt] Got token:', freshToken.slice(0, 10) + '...')
  console.log('[Growatt] User ID:', userId)

  // Step 2: Build headers for subsequent requests
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${endpoint}/index`,
    'Origin': endpoint
  }

  if (sessionCookies) {
    headers['Cookie'] = sessionCookies
  }

  // Step 2.5: Try to get real-time power from the dashboard index first
  // This is the call made when you load the main Growatt dashboard
  let indexPowerData: { [plantId: string]: number } = {}
  try {
    const indexUrl = `${endpoint}/index/getPlantListTitle`
    console.log('[Growatt] Fetching index plant list from:', indexUrl)

    const indexResponse = await fetch(indexUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: ''
    })

    if (indexResponse.ok) {
      const indexText = await indexResponse.text()
      const trimmedIndexText = indexText.trim()
      if (!trimmedIndexText.startsWith('<') && !trimmedIndexText.startsWith('<!')) {
        const indexResult = JSON.parse(trimmedIndexText)
        console.log('[Growatt] Index plant list response:', JSON.stringify(indexResult, null, 2).slice(0, 3000))

        // The index response typically has plants with real-time power
        const plants = indexResult.datas || indexResult.obj?.datas || indexResult.data || []
        if (Array.isArray(plants)) {
          for (const plant of plants) {
            const id = plant.plantId || plant.id
            const power = parsePower(plant.powerValue) ||
                         parsePower(plant.currentPower) ||
                         parsePower(plant.pac) ||
                         parsePower(plant.nowPower) ||
                         0
            if (id && power > 0) {
              indexPowerData[id] = power
              console.log(`[Growatt] Index power for plant ${id}:`, power)
            }
          }
        }
      }
    }
  } catch (indexError) {
    console.log('[Growatt] Index endpoint error:', indexError)
  }

  // Step 3: Get plant list with totals (standard API)
  const plantListUrl = `${endpoint}/PlantListAPI.do?token=${encodeURIComponent(freshToken)}`

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

  // Debug: Log full response to see all available fields
  console.log('[Growatt] Full PlantListAPI response:', JSON.stringify(plantsResult, null, 2).slice(0, 5000))
  if (plantsData.length > 0) {
    console.log('[Growatt] First plant ALL fields:', Object.keys(plantsData[0]))
    console.log('[Growatt] First plant data:', JSON.stringify(plantsData[0], null, 2))
  }
  console.log('[Growatt] Total data ALL fields:', Object.keys(totalData))
  console.log('[Growatt] Total data:', JSON.stringify(totalData, null, 2))

  // Parse totals from Growatt (aggregated across all plants)
  const totalTodayEnergy = parseFloat(totalData.todayEnergySum?.replace(/[^\d.-]/g, '')) || 0
  let totalEnergy = parseFloat(totalData.totalEnergySum?.replace(/[^\d.-]/g, '')) || 0

  // Convert MWh to kWh if needed
  if (totalData.totalEnergySum?.includes('MWh')) {
    totalEnergy = totalEnergy * 1000
  }

  const co2Saved = parseFloat(totalData.CO2Sum?.replace(/[^\d.-]/g, '')) || 0

  // Consider "online" if we have plants with data
  const hasValidData = plantsData.length > 0 && totalEnergy > 0

  // Step 3: For each plant, fetch detailed data including real-time power
  let totalCurrentPower = 0
  const plantsWithDetails = await Promise.all(
    plantsData.map(async (plant: any) => {
      const plantId = plant.plantId || plant.id
      let currentPower = 0
      let detailData = null

      if (plantId) {
        // First check if we got power from the index dashboard call
        if (indexPowerData[plantId] && indexPowerData[plantId] > 0) {
          currentPower = indexPowerData[plantId]
          console.log(`[Growatt] Using index power for ${plant.plantName}:`, currentPower)
        }

        // If no power from index, try device list
        let deviceData = currentPower === 0 ? await fetchPlantDevices(endpoint, freshToken, plantId, headers) : null

        // If server.growatt.com failed, try OpenAPI
        if (!deviceData && currentPower === 0) {
          deviceData = await fetchDevicesFromOpenAPI(freshToken, plantId)
        }

        const deviceSerials: { type: string; sn: string }[] = []

        if (deviceData && currentPower === 0) {
          // Log the device data structure to understand it
          console.log('[Growatt] Device data keys:', Object.keys(deviceData))
          if (deviceData.obj) {
            console.log('[Growatt] Device data obj keys:', Object.keys(deviceData.obj))
          }

          // Device list may contain inverters with pac (power AC) values
          // Structure can be: { obj: { mix: [...], inv: [...], tlx: [...], ... } } or { result: 1, obj: {...} }
          const deviceTypes = ['deviceList', 'inv', 'mix', 'tlx', 'spa', 'min', 'max', 'storage', 'pcs', 'hps', 'pbd']

          // Try both direct access and through obj
          const dataSource = deviceData.obj || deviceData.back?.obj || deviceData

          for (const deviceType of deviceTypes) {
            const devices = dataSource[deviceType] || deviceData[deviceType] || deviceData.back?.[deviceType] || []
            if (Array.isArray(devices) && devices.length > 0) {
              console.log(`[Growatt] Found ${devices.length} devices in ${deviceType}`)
              console.log(`[Growatt] First device in ${deviceType}:`, JSON.stringify(devices[0], null, 2).slice(0, 500))

              for (const device of devices) {
                // Collect device serial numbers for later queries
                const sn = device.sn || device.deviceSn || device.serialNum || device.alias
                if (sn) {
                  deviceSerials.push({ type: deviceType, sn })
                }

                // Each device may have pac, power, or other power fields
                const devicePower = parsePower(device.pac) ||
                                   parsePower(device.power) ||
                                   parsePower(device.ppv) ||
                                   parsePower(device.activePower) ||
                                   parsePower(device.outPutPower) ||
                                   parsePower(device.ppv1) ||
                                   parsePower(device.ppv2) ||
                                   parsePower(device.eToday) || // Some devices use eToday
                                   0
                currentPower += devicePower

                if (devicePower > 0) {
                  console.log(`[Growatt] Found power in ${deviceType}:`, { sn, power: devicePower })
                }
              }
            }
          }

          // If no power found in device list, try to fetch from specific inverter APIs
          if (currentPower === 0 && deviceSerials.length > 0) {
            console.log(`[Growatt] Trying specific APIs for ${deviceSerials.length} devices:`, deviceSerials)

            for (const { type, sn } of deviceSerials) {
              let inverterResult = null
              let foundPower = 0

              // Try type-specific API
              inverterResult = await fetchInverterData(endpoint, freshToken, plantId, sn, type, headers)

              if (inverterResult) {
                // Try to extract power from various locations in the response
                foundPower = parsePower(inverterResult.obj?.pac) ||
                            parsePower(inverterResult.obj?.ppv) ||
                            parsePower(inverterResult.obj?.activePower) ||
                            parsePower(inverterResult.obj?.outPutPower) ||
                            parsePower(inverterResult.back?.data?.pac) ||
                            parsePower(inverterResult.data?.pac) ||
                            parsePower(inverterResult.pac) ||
                            parsePower(inverterResult.ppv) ||
                            0

                if (foundPower > 0) {
                  currentPower += foundPower
                  console.log(`[Growatt] Got power from ${type} API for ${sn}:`, foundPower)
                } else {
                  console.log(`[Growatt] No power found in ${type} API response for ${sn}`)
                }
              }
            }
          }
        }

        // Try plant index info (dashboard main page data)
        if (currentPower === 0) {
          const indexInfo = await fetchPlantIndexInfo(endpoint, plantId, headers)
          if (indexInfo && indexInfo.power > 0) {
            currentPower = indexInfo.power
            console.log(`[Growatt] Got power from plant index for ${plant.plantName}:`, currentPower)
          }
        }

        // Try web panel endpoints for real-time power
        if (currentPower === 0) {
          // Try getDevicesByPlant first (what the web dashboard uses)
          const devicesData = await fetchDevicesByPlant(endpoint, plantId, headers)
          if (devicesData) {
            // The response may have device arrays with pac/power values
            const deviceArrays = devicesData.obj || devicesData.data || devicesData
            if (deviceArrays) {
              // Check for arrays of devices
              for (const key of Object.keys(deviceArrays)) {
                const arr = deviceArrays[key]
                if (Array.isArray(arr)) {
                  for (const device of arr) {
                    const devPower = parsePower(device.pac) ||
                                    parsePower(device.power) ||
                                    parsePower(device.ppv) ||
                                    parsePower(device.nowPower) ||
                                    parsePower(device.activePower) ||
                                    0
                    if (devPower > 0) {
                      currentPower += devPower
                      console.log(`[Growatt] Got power from getDevicesByPlant device:`, devPower)
                    }
                  }
                }
              }
            }
          }
        }

        if (currentPower === 0) {
          const overviewData = await fetchPlantOverview(endpoint, plantId, headers)
          if (overviewData) {
            // The overview typically has powerValue or similar
            currentPower = parsePower(overviewData.powerValue) ||
                          parsePower(overviewData.obj?.powerValue) ||
                          parsePower(overviewData.data?.powerValue) ||
                          parsePower(overviewData.currentPower) ||
                          parsePower(overviewData.obj?.currentPower) ||
                          parsePower(overviewData.pac) ||
                          parsePower(overviewData.obj?.pac) ||
                          parsePower(overviewData.obj?.nowPower) ||
                          0

            if (currentPower > 0) {
              console.log(`[Growatt] Got power from overview for ${plant.plantName}:`, currentPower)
            }
          }
        }

        // If still no power, try plant detail API
        if (currentPower === 0) {
          detailData = await fetchPlantDetail(endpoint, freshToken, plantId, headers)
          if (detailData) {
            // Real-time power can be in various fields - try all common ones
            currentPower = parsePower(detailData.data?.currentPower) ||
                          parsePower(detailData.data?.pac) ||
                          parsePower(detailData.data?.power) ||
                          parsePower(detailData.data?.psum) ||
                          parsePower(detailData.plantData?.currentPower) ||
                          parsePower(detailData.plantData?.pac) ||
                          parsePower(detailData.currentPower) ||
                          parsePower(detailData.pac) ||
                          parsePower(detailData.power) ||
                          parsePower(detailData.back?.data?.currentPower) ||
                          parsePower(detailData.back?.data?.pac) ||
                          0

            console.log(`[Growatt] Plant ${plant.plantName} detail:`, {
              plantId,
              currentPower,
              dataFields: detailData.data ? Object.keys(detailData.data) : [],
              rootFields: Object.keys(detailData)
            })
          }
        }
      }

      // Fallback: try to get power from plant list data
      if (currentPower === 0) {
        currentPower = parsePower(plant.currentPower) ||
                      parsePower(plant.pac) ||
                      parsePower(plant.power) ||
                      parsePower(plant.psum) ||
                      0
      }

      totalCurrentPower += currentPower

      return {
        name: plant.plantName,
        plantId,
        todayEnergy: parseFloat(plant.todayEnergy) || 0,
        totalEnergy: parseFloat(plant.totalEnergy) || 0,
        currentPower,
        status: plant.status === '1' ? 'online' : 'offline'
      }
    })
  )

  // Also check totalData for current power as fallback
  if (totalCurrentPower === 0) {
    // Log totalData to see all available fields
    console.log('[Growatt] Total data fields:', JSON.stringify(totalData, null, 2))

    totalCurrentPower = parsePower(totalData.currentPowerSum) ||
                        parsePower(totalData.pSum) ||
                        parsePower(totalData.powerSum) ||
                        parsePower(totalData.pac) ||
                        parsePower(totalData.power) ||
                        parsePower(totalData.currentPower) ||
                        0

    if (totalCurrentPower > 0) {
      console.log('[Growatt] Got power from totalData:', totalCurrentPower)
    }
  }

  return {
    status: hasValidData ? 'online' : 'offline',
    currentPower: totalCurrentPower,
    dailyGeneration: totalTodayEnergy,
    monthlyGeneration: 0, // Growatt doesn't provide this in totals
    totalGeneration: totalEnergy,
    co2Saved,
    plantCount: plantsData.length,
    plants: plantsWithDetails,
    lastUpdate: new Date().toISOString()
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
