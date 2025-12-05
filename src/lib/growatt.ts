import crypto from 'crypto'

export interface GrowattPlant {
  plantName: string
  todayEnergy: string
  totalEnergy: string
  currentPower?: string
  co2Saved?: string
}

export interface GrowattLoginResponse {
  success: boolean
  token?: string
  message?: string
}

export class GrowattApi {
  private httpClient: any
  private token: string | null = null
  private readonly baseUrl = 'https://openapi.growatt.com'

  constructor() {
    // Initialize HTTP client (can use fetch in Next.js)
  }

  private hashPassword(password: string): string {
    const md5Hash = crypto.createHash('md5').update(password).digest('hex')
    
    // Replace every even '0' with 'c' (Growatt's specific requirement)
    const result = md5Hash.split('').map((char, index) => {
      if (char === '0' && index % 2 === 0) {
        return 'c'
      }
      return char
    }).join('')
    
    return result
  }

  async login(username: string, password: string): Promise<GrowattLoginResponse> {
    try {
      const hashedPassword = this.hashPassword(password)
      
      const formData = new URLSearchParams()
      formData.append('userName', username)
      formData.append('password', hashedPassword)

      const response = await fetch(`${this.baseUrl}/newTwoLoginAPI.do`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      })

      if (!response.ok) {
        return { success: false, message: 'Network error' }
      }

      const data = await response.json()

      if (data.back?.success) {
        this.token = data.back.user.cpowerToken
        return { success: true, token: this.token }
      } else {
        return { success: false, message: data.back?.msg || 'Login failed' }
      }
    } catch (error) {
      return { success: false, message: 'Connection error' }
    }
  }

  async getPlantList(): Promise<GrowattPlant[]> {
    if (!this.token) {
      throw new Error('Not logged in. Call login() first.')
    }

    try {
      const response = await fetch(`${this.baseUrl}/PlantListAPI.do?token=${this.token}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch plant data')
      }

      const data = await response.json()
      
      if (data.back?.success && data.back.data) {
        return data.back.data.map((plant: any) => ({
          plantName: plant.plantName,
          todayEnergy: plant.todayEnergy,
          totalEnergy: plant.totalEnergy,
          currentPower: plant.currentPower,
          co2Saved: plant.co2Reduction || 'N/A'
        }))
      }

      return []
    } catch (error) {
      throw new Error('Failed to fetch plant list')
    }
  }

  async getPlantData(plantId: string): Promise<any> {
    if (!this.token) {
      throw new Error('Not logged in. Call login() first.')
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/PlantDetailAPI.do?token=${this.token}&plantId=${plantId}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch plant details')
      }

      const data = await response.json()
      
      if (data.back?.success) {
        return data.back
      }

      throw new Error('Invalid response from Growatt API')
    } catch (error) {
      throw new Error('Failed to fetch plant details')
    }
  }

  async getEnergyData(plantId: string, date?: string): Promise<any> {
    if (!this.token) {
      throw new Error('Not logged in. Call login() first.')
    }

    const targetDate = date || new Date().toISOString().split('T')[0]

    try {
      const response = await fetch(
        `${this.baseUrl}/PlantEnergyAPI.do?token=${this.token}&plantId=${plantId}&date=${targetDate}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch energy data')
      }

      const data = await response.json()
      
      if (data.back?.success) {
        return data.back.data
      }

      throw new Error('Invalid response from Growatt API')
    } catch (error) {
      throw new Error('Failed to fetch energy data')
    }
  }

  // Utility method to test credentials without storing them
  static async testCredentials(username: string, password: string): Promise<boolean> {
    const api = new GrowattApi()
    const result = await api.login(username, password)
    return result.success
  }
}