'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Zap, Sun, Battery, TrendingUp, Loader2, RefreshCw, AlertCircle, Users, User, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Plant {
  plantName: string
  todayEnergy: string
  totalEnergy: string
  co2Saved?: string
  plantId?: string
  capacity?: string
  status?: string
}

interface GrowattData {
  plants: Plant[]
  totalPlants: number
  totalTodayEnergy: number
  totalEnergy: number
  co2Saved?: number
}

interface ClientSolarSystem {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  city?: string
  state?: string
  growattUsername: string
  growattPassword: string
  expectedDailyGeneration: number
  createdAt: string
  solarSystems: {
    id: string
    systemName: string
    capacity: number
    installationDate: string
    isActive: boolean
    estimatedGeneration: number
  }[]
  growattCredentials: {
    id: string
    isActive: boolean
    lastSync: string
  }[]
}

interface ClientGrowattData {
  clientInfo: ClientSolarSystem
  growattData: GrowattData | null
  lastUpdated: string
  status: 'loading' | 'success' | 'error'
  error?: string
}

export default function SolarSystemsPage() {
  const [growattData, setGrowattData] = useState<GrowattData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("mi-sistema")
  
  // Admin client systems data
  const [clientSystems, setClientSystems] = useState<ClientGrowattData[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const fetchGrowattData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    
    setError(null)

    try {
      // First check if we have a saved Growatt token
      const savedConfigs = localStorage.getItem('mundosolar_integrations')
      let token = null
      
      console.log('🔍 Saved configs:', savedConfigs)
      
      if (savedConfigs) {
        const parsed = JSON.parse(savedConfigs)
        const growattConfig = parsed.growatt
        
        console.log('🔍 Growatt config:', growattConfig)
        
        if (growattConfig?.status === 'connected' && growattConfig?.token) {
          token = growattConfig.token
          console.log('✅ Found saved token:', token ? '***' + token.slice(-8) : 'null')
        }
      }

      if (!token) {
        // If no token, try to get one using saved credentials
        const parsed = savedConfigs ? JSON.parse(savedConfigs) : {}
        const growattIntegration = parsed.growatt
        
        if (growattIntegration?.config?.username && growattIntegration?.config?.password) {
          const loginResponse = await fetch('/api/integrations/growatt/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: growattIntegration.config.username,
              password: growattIntegration.config.password
            })
          })
          
          if (loginResponse.ok) {
            const loginResult = await loginResponse.json()
            if (loginResult.success) {
              token = loginResult.data.token
              
              // Update saved config with new token
              const updatedConfigs = {
                ...parsed,
                growatt: {
                  ...growattIntegration,
                  token: token,
                  status: 'connected'
                }
              }
              localStorage.setItem('mundosolar_integrations', JSON.stringify(updatedConfigs))
            }
          }
        }
      }

      // Get fresh credentials instead of using old token
      let username, password
      if (savedConfigs) {
        const parsed = JSON.parse(savedConfigs)
        const growattConfig = parsed.growatt
        username = growattConfig?.config?.username
        password = growattConfig?.config?.password
      }

      if (!username || !password) {
        throw new Error('No hay credenciales de Growatt configuradas. Configure la integración primero.')
      }

      // Fetch plant data with fresh login (like C# code)
      console.log('🌞 Fetching plants with fresh login for user:', username)
      
      const response = await fetch('/api/integrations/growatt/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      console.log('🌞 Plants API response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('🌞 Plants API result:', result)
        if (result.success) {
          console.log('✅ Using real Growatt data:', result.data)
          setGrowattData(result.data)
        } else {
          throw new Error(result.error)
        }
      } else {
        throw new Error('Error al conectar con la API de Growatt')
      }

    } catch (err) {
      console.error('Error fetching Growatt data:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchAllClientSystems = async () => {
    setClientsLoading(true)
    setClientsError(null)

    try {
      // Fetch all clients with Growatt credentials
      const clientsResponse = await fetch('/api/admin/solar-systems')
      
      if (!clientsResponse.ok) {
        throw new Error('Error al obtener sistemas de clientes')
      }

      const clientsResult = await clientsResponse.json()
      
      if (!clientsResult.success) {
        throw new Error(clientsResult.error || 'Error al obtener sistemas de clientes')
      }

      // Initialize client systems data
      const initialClientData: ClientGrowattData[] = clientsResult.data.map((client: ClientSolarSystem) => ({
        clientInfo: client,
        growattData: null,
        lastUpdated: new Date().toISOString(),
        status: 'loading' as const
      }))

      setClientSystems(initialClientData)

      // Fetch Growatt data for each client
      for (let i = 0; i < clientsResult.data.length; i++) {
        const client = clientsResult.data[i]
        
        try {
          console.log(`🔄 Fetching Growatt data for ${client.firstName} (${client.growattUsername})`)
          
          const growattResponse = await fetch('/api/integrations/growatt/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: client.growattUsername,
              password: client.growattPassword
            })
          })

          if (growattResponse.ok) {
            const growattResult = await growattResponse.json()
            
            setClientSystems(prevData => 
              prevData.map((item, index) => 
                index === i 
                  ? {
                      ...item,
                      growattData: growattResult.success ? growattResult.data : null,
                      status: growattResult.success ? 'success' : 'error',
                      error: growattResult.success ? undefined : growattResult.error,
                      lastUpdated: new Date().toISOString()
                    }
                  : item
              )
            )
          } else {
            setClientSystems(prevData => 
              prevData.map((item, index) => 
                index === i 
                  ? {
                      ...item,
                      status: 'error',
                      error: 'Error de conexión con Growatt',
                      lastUpdated: new Date().toISOString()
                    }
                  : item
              )
            )
          }
        } catch (clientError) {
          console.error(`Error fetching Growatt data for client ${client.firstName}:`, clientError)
          setClientSystems(prevData => 
            prevData.map((item, index) => 
              index === i 
                ? {
                    ...item,
                    status: 'error',
                    error: 'Error al conectar con Growatt',
                    lastUpdated: new Date().toISOString()
                  }
                : item
            )
          )
        }
      }

    } catch (err) {
      console.error('Error fetching client systems:', err)
      setClientsError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    fetchGrowattData()
    fetchAllClientSystems()
  }, [])

  const handleRefresh = () => {
    if (activeTab === 'mi-sistema') {
      fetchGrowattData(true)
    } else {
      fetchAllClientSystems()
    }
  }

  // Function to determine alert level based on generation performance
  const getAlertLevel = (actualGeneration: number, expectedGeneration: number) => {
    if (!expectedGeneration || expectedGeneration <= 0) return null
    
    const performanceRatio = actualGeneration / expectedGeneration
    
    if (performanceRatio < 0.3) {
      return {
        level: 'critical',
        label: 'Generación Crítica',
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-500',
        priority: 1
      }
    } else if (performanceRatio < 0.5) {
      return {
        level: 'warning',
        label: 'Generación Muy Baja',
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-500',
        priority: 2
      }
    } else if (performanceRatio < 0.7) {
      return {
        level: 'low',
        label: 'Generación Baja',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-500',
        priority: 3
      }
    }
    
    return null // No alert needed
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando datos de Growatt...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Sistemas Solares</h2>
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Sistemas Solares</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing || clientsLoading}>
            {(refreshing || clientsLoading) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Sistema
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="mi-sistema">Mi Sistema</TabsTrigger>
          <TabsTrigger value="todos-sistemas">Todos los Sistemas</TabsTrigger>
        </TabsList>

        <TabsContent value="mi-sistema" className="space-y-4">
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plantas Activas</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{growattData?.totalPlants || 0}</div>
            <p className="text-xs text-muted-foreground">
              Conectadas a Growatt
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generación Hoy</CardTitle>
            <Sun className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {growattData?.totalTodayEnergy?.toFixed(1) || '0'} kWh
            </div>
            <p className="text-xs text-muted-foreground">
              Energía generada hoy
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generado</CardTitle>
            <Battery className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {(growattData?.totalEnergy ? growattData.totalEnergy / 1000 : 0).toFixed(1)} MWh
            </div>
            <p className="text-xs text-muted-foreground">
              Energía total histórica
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO₂ Evitado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {growattData?.co2Saved?.toFixed(1) || '0.0'} ton
            </div>
            <p className="text-xs text-muted-foreground">
              Impacto ambiental
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plants List */}
      <Card>
        <CardHeader>
          <CardTitle>Plantas Solares Monitoreadas</CardTitle>
          <CardDescription>
            Datos en tiempo real desde la plataforma Growatt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {growattData?.plants && growattData.plants.length > 0 ? (
            <div className="space-y-4">
              {growattData.plants.map((plant, index) => (
                <div key={plant.plantId || index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50">
                      <Sun className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{plant.plantName}</h3>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {plant.status || 'Activo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Capacidad: {plant.capacity || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Hoy: {plant.todayEnergy}</div>
                    <div className="text-sm text-muted-foreground">Total: {plant.totalEnergy}</div>
                    {plant.co2Saved && plant.co2Saved !== 'N/A' && (
                      <div className="text-xs text-green-600">CO₂: {plant.co2Saved}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sun className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No hay plantas configuradas</h3>
              <p>Configure la integración con Growatt para ver los datos de las plantas.</p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="todos-sistemas" className="space-y-4">
          {/* Summary Cards for All Systems */}
          {!clientsError && clientSystems.length > 0 && (() => {
            const alertCounts = clientSystems.reduce((counts, client) => {
              const alert = getAlertLevel(
                client.growattData?.totalTodayEnergy || 0,
                client.clientInfo.expectedDailyGeneration || 0
              )
              if (alert) {
                const level = alert.level as 'critical' | 'warning' | 'low'
                counts[level] = (counts[level] || 0) + 1
                counts.total++
              }
              return counts
            }, { critical: 0, warning: 0, low: 0, total: 0 })
            
            return (
              <div className="space-y-4">
                {/* Alert Summary */}
                {alertCounts.total > 0 && (
                  <div className="grid gap-4 md:grid-cols-3">
                    {alertCounts.critical > 0 && (
                      <Card className="border-red-200 bg-red-50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-red-800">Sistemas Críticos</CardTitle>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">{alertCounts.critical}</div>
                          <p className="text-xs text-red-600">Requieren atención inmediata</p>
                        </CardContent>
                      </Card>
                    )}
                    {alertCounts.warning > 0 && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-orange-800">Sistemas con Alerta</CardTitle>
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">{alertCounts.warning}</div>
                          <p className="text-xs text-orange-600">Generación muy baja</p>
                        </CardContent>
                      </Card>
                    )}
                    {alertCounts.low > 0 && (
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-yellow-800">Generación Baja</CardTitle>
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-yellow-600">{alertCounts.low}</div>
                          <p className="text-xs text-yellow-600">Bajo rendimiento</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                {/* Performance Stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Plantas Activas</CardTitle>
                  <Sun className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientSystems.reduce((total, client) => {
                      return total + (client.growattData?.plants?.length || 0)
                    }, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sistemas en operación
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Generación Hoy</CardTitle>
                  <Zap className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientSystems.reduce((total, client) => {
                      const todayEnergy = client.growattData?.totalTodayEnergy || 0
                      return total + (typeof todayEnergy === 'number' ? todayEnergy : parseFloat(todayEnergy) || 0)
                    }, 0).toFixed(1)} kWh
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Energía generada hoy
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Generado</CardTitle>
                  <Battery className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(clientSystems.reduce((total, client) => {
                      const totalEnergy = client.growattData?.totalEnergy || 0
                      return total + (typeof totalEnergy === 'number' ? totalEnergy : parseFloat(totalEnergy) || 0)
                    }, 0) / 1000).toFixed(1)} MWh
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Energía total histórica
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CO₂ Evitado</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {clientSystems.reduce((total, client) => {
                      const co2Saved = client.growattData?.totalCo2Saved || client.growattData?.co2Saved || 0
                      return total + (typeof co2Saved === 'number' ? co2Saved : parseFloat(co2Saved) || 0)
                    }, 0).toFixed(1)} ton
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Impacto ambiental total
                  </p>
                </CardContent>
              </Card>
                </div>
              </div>
            )
          })()}

          {clientsError ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Error al cargar sistemas de clientes</h3>
                  <p className="text-sm text-muted-foreground mb-4">{clientsError}</p>
                  <Button onClick={() => fetchAllClientSystems()} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {clientSystems
                .map(clientData => ({
                  ...clientData,
                  alert: getAlertLevel(
                    clientData.growattData?.totalTodayEnergy || 0,
                    clientData.clientInfo.expectedDailyGeneration || 0
                  )
                }))
                .sort((a, b) => {
                  // Sort by alert priority (critical first, then warning, low, normal)
                  const priorityA = a.alert?.priority || 99
                  const priorityB = b.alert?.priority || 99
                  return priorityA - priorityB
                })
                .map((clientData, index) => (
                <Card key={clientData.clientInfo.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                          <Users className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle>{clientData.clientInfo.firstName} {clientData.clientInfo.lastName}</CardTitle>
                          <CardDescription>
                            {clientData.clientInfo.email} • {clientData.clientInfo.city || 'Ciudad no especificada'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          clientData.status === 'success' ? 'default' : 
                          clientData.status === 'loading' ? 'secondary' : 'destructive'
                        }>
                          {clientData.status === 'success' ? 'Conectado' : 
                           clientData.status === 'loading' ? 'Cargando...' : 'Error'}
                        </Badge>
                        {clientData.clientInfo.expectedDailyGeneration && (
                          <div className="text-right text-sm text-muted-foreground">
                            Esperado: {clientData.clientInfo.expectedDailyGeneration} kWh/día
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clientData.status === 'loading' ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mr-4" />
                        <span>Obteniendo datos de Growatt...</span>
                      </div>
                    ) : clientData.status === 'error' ? (
                      <div className="flex items-center justify-center py-8 text-center">
                        <div>
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">{clientData.error}</p>
                        </div>
                      </div>
                    ) : clientData.growattData ? (
                      <div className="space-y-4">
                        {/* Client Summary Stats */}
                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-500">
                              {clientData.growattData.totalTodayEnergy?.toFixed(1) || '0.0'} kWh
                            </div>
                            <p className="text-xs text-muted-foreground">Hoy</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-500">
                              {(clientData.growattData.totalEnergy ? clientData.growattData.totalEnergy / 1000 : 0).toFixed(1)} MWh
                            </div>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">{clientData.growattData.totalPlants || 0}</div>
                            <p className="text-xs text-muted-foreground">Plantas</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-500">
                              {clientData.growattData.co2Saved?.toFixed(1) || '0.0'} ton
                            </div>
                            <p className="text-xs text-muted-foreground">CO₂ evitado</p>
                          </div>
                        </div>

                        {/* Performance Alert */}
                        {clientData.alert && (
                          <div className={`flex items-center p-3 ${clientData.alert.bgColor} rounded-lg border ${clientData.alert.borderColor}`}>
                            <AlertCircle className={`h-5 w-5 ${clientData.alert.iconColor} mr-2`} />
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${clientData.alert.textColor}`}>{clientData.alert.label}</p>
                              <p className={`text-xs ${clientData.alert.textColor.replace('800', '600')}`}>
                                Generación actual ({(clientData.growattData?.totalTodayEnergy || 0).toFixed(1)} kWh) 
                                está por debajo de lo esperado ({clientData.clientInfo.expectedDailyGeneration} kWh)
                                {clientData.alert.level === 'critical' && ' - ¡Requiere atención inmediata!'}
                                {clientData.alert.level === 'warning' && ' - Revisar sistema pronto'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Plants List */}
                        {clientData.growattData.plants && clientData.growattData.plants.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Plantas:</h4>
                            {clientData.growattData.plants.map((plant, plantIndex) => (
                              <div key={plant.plantId || plantIndex} 
                                   className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <Sun className="h-4 w-4 text-yellow-500" />
                                  <div>
                                    <span className="text-sm font-medium">{plant.plantName}</span>
                                    <p className="text-xs text-muted-foreground">
                                      Capacidad: {plant.capacity || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Hoy: {plant.todayEnergy}</div>
                                  <div className="text-xs text-muted-foreground">Total: {plant.totalEnergy}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sun className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                        <p>No hay datos disponibles</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {clientSystems.length === 0 && !clientsLoading && (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay clientes con Growatt configurado</h3>
                      <p className="text-sm text-muted-foreground">
                        Agregue credenciales de Growatt a los clientes para ver sus sistemas solares aquí.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}