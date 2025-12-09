'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Settings, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface MaintenanceConfig {
  id: string
  equipmentType: string
  intervalDays: number
  notifyDaysBefore: number
  autoSchedule: boolean
}

export default function MaintenanceConfigPage() {
  const [configs, setConfigs] = useState<MaintenanceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/maintenance/config')
      const data = await response.json()

      if (data.success) {
        setConfigs(data.data)
      }
    } catch (error) {
      console.error('Error loading configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (type: string, field: string, value: any) => {
    const config = configs.find((c) => c.equipmentType === type)
    if (!config) return

    const updatedConfig = { ...config, [field]: value }
    setConfigs(configs.map((c) => (c.equipmentType === type ? updatedConfig : c)))
  }

  const saveConfig = async (type: string) => {
    const config = configs.find((c) => c.equipmentType === type)
    if (!config) return

    try {
      setSaving(type)

      const response = await fetch(`/api/maintenance/config/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervalDays: config.intervalDays,
          notifyDaysBefore: config.notifyDaysBefore,
          autoSchedule: config.autoSchedule,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Configuración guardada exitosamente')
      } else {
        alert(data.error || 'Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Error al guardar configuración')
    } finally {
      setSaving(null)
    }
  }

  const getEquipmentLabel = (type: string) => {
    const labels: Record<string, string> = {
      solar_panels: 'Paneles Solares',
      solar_heater: 'Calentadores Solares',
      general: 'General (Todos los Equipos)',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración de Mantenimientos</h1>
            <p className="text-muted-foreground">
              Configura intervalos y notificaciones para mantenimientos automáticos
            </p>
          </div>
        </div>
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-6">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle>{getEquipmentLabel(config.equipmentType)}</CardTitle>
              <CardDescription>
                Configuración de mantenimiento automático para {getEquipmentLabel(config.equipmentType).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interval Days */}
              <div className="space-y-2">
                <Label htmlFor={`interval-${config.equipmentType}`}>
                  Intervalo de Mantenimiento (días)
                </Label>
                <Input
                  id={`interval-${config.equipmentType}`}
                  type="number"
                  min="1"
                  value={config.intervalDays}
                  onChange={(e) =>
                    updateConfig(config.equipmentType, 'intervalDays', parseInt(e.target.value))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Cada cuántos días se debe realizar el mantenimiento preventivo
                </p>
              </div>

              {/* Notification Days */}
              <div className="space-y-2">
                <Label htmlFor={`notification-${config.equipmentType}`}>
                  Días de Anticipación para Notificación
                </Label>
                <Input
                  id={`notification-${config.equipmentType}`}
                  type="number"
                  min="1"
                  value={config.notifyDaysBefore}
                  onChange={(e) =>
                    updateConfig(
                      config.equipmentType,
                      'notifyDaysBefore',
                      parseInt(e.target.value)
                    )
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Con cuántos días de anticipación se debe notificar el próximo mantenimiento
                </p>
              </div>

              {/* Auto Schedule Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor={`auto-${config.equipmentType}`}>
                    Programación Automática
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Crear mantenimientos automáticamente según el intervalo configurado
                  </p>
                </div>
                <Switch
                  id={`auto-${config.equipmentType}`}
                  checked={config.autoSchedule}
                  onCheckedChange={(checked) =>
                    updateConfig(config.equipmentType, 'autoSchedule', checked)
                  }
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => saveConfig(config.equipmentType)}
                  disabled={saving === config.equipmentType}
                >
                  {saving === config.equipmentType && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}