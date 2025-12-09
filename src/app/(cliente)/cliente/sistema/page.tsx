'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Sun, TrendingUp, Activity, Loader2, Leaf, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlantData {
  name: string
  todayEnergy: number
  totalEnergy: number
  status: string
}

interface SystemData {
  status: string
  currentPower: number
  dailyGeneration: number
  monthlyGeneration: number
  totalGeneration: number
  co2Saved?: number
  plantCount?: number
  plants?: PlantData[]
  lastUpdate: string | null
  error?: string
}

export default function SistemaPage() {
  const [loading, setLoading] = useState(true)
  const [systemData, setSystemData] = useState<SystemData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSystemData()
  }, [])

  const loadSystemData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/cliente/sistema')
      const result = await response.json()

      if (result.success) {
        setSystemData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Error al cargar datos del sistema')
      }
    } catch (err) {
      console.error('Error loading system data:', err)
      setError('Error al cargar datos del sistema')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadSystemData(false)
  }

  // Format total energy (convert to MWh if > 1000 kWh)
  const formatTotalEnergy = (kwh: number) => {
    if (kwh >= 1000) {
      return `${(kwh / 1000).toFixed(2)} MWh`
    }
    return `${kwh.toFixed(2)} kWh`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500">En línea</Badge>
      case 'offline':
        return <Badge variant="secondary">Sin conexión</Badge>
      case 'warning':
        return <Badge className="bg-yellow-500">Advertencia</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistemas Solares</h1>
          <p className="text-muted-foreground">Monitoreo de tu sistema de energía solar</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistemas Solares</h1>
          <p className="text-muted-foreground">Monitoreo de tu sistema de energía solar</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {systemData && getStatusBadge(systemData.status)}
        </div>
      </div>

      {systemData?.error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-800">{systemData.error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potencia Actual</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemData?.currentPower?.toFixed(2) || '0.00'} kW
            </div>
            <p className="text-xs text-muted-foreground">
              Generación en tiempo real
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energía Hoy</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {systemData?.dailyGeneration?.toFixed(1) || '0.0'} kWh
            </div>
            <p className="text-xs text-muted-foreground">
              Generación del día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energía Total</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatTotalEnergy(systemData?.totalGeneration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Generación histórica
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CO2 Evitado</CardTitle>
            <Leaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemData?.co2Saved?.toFixed(1) || '0.0'} ton
            </div>
            <p className="text-xs text-muted-foreground">
              Impacto ambiental
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plants list */}
      {systemData?.plants && systemData.plants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plantas ({systemData.plantCount || systemData.plants.length})</CardTitle>
            <CardDescription>Detalle por planta de tu sistema solar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemData.plants.map((plant, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${plant.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">{plant.name}</p>
                      <p className="text-xs text-muted-foreground">Capacidad: N/A</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Hoy: {plant.todayEnergy?.toFixed(1) || '0.0'} kWh</p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatTotalEnergy(plant.totalEnergy || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
          <CardDescription>Información detallada de tu instalación solar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Estado de conexión</span>
              <span className="font-medium">
                {systemData?.status === 'online' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Número de plantas</span>
              <span className="font-medium">
                {systemData?.plantCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Última actualización</span>
              <span className="font-medium">
                {systemData?.lastUpdate
                  ? new Date(systemData.lastUpdate).toLocaleString('es-MX')
                  : 'Sin datos'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
