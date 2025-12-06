'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, User, Building, Bell, Shield, Database, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface SettingsData {
  userStats: {
    total: number
    active: number
    admins: number
    employees: number
    regularUsers: number
  }
  modulesActive: number
  companySettings: {
    name: string
    rfc: string
    currency: string
    currencyName: string
    ivaRate: number
    timezone: string
    timezoneDisplay: string
    language: string
  }
  systemInfo: {
    lastBackup: string
    backupEnabled: boolean
    emailNotifications: boolean
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Error al cargar configuración')
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const formatBackupDate = (isoDate: string) => {
    const date = new Date(isoDate)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return {
        label: 'Hoy',
        time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      }
    }

    return {
      label: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar configuración</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchSettings}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const backupInfo = data?.systemInfo.lastBackup
    ? formatBackupDate(data.systemInfo.lastBackup)
    : { label: 'N/A', time: '' }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.userStats.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              De {data?.userStats.total || 0} usuarios en total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos Activos</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.modulesActive || 0}</div>
            <p className="text-xs text-muted-foreground">
              Funcionalidades habilitadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Backup</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupInfo.label}</div>
            <p className="text-xs text-muted-foreground">
              {backupInfo.time}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Empresa</CardTitle>
            <CardDescription>Información básica de la empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Empresa</label>
              <div className="text-sm text-muted-foreground">{data?.companySettings.name || 'No configurado'}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">RFC</label>
              <div className="text-sm text-muted-foreground">{data?.companySettings.rfc || 'No configurado'}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Moneda por Defecto</label>
              <div className="text-sm text-muted-foreground">
                {data?.companySettings.currency} ({data?.companySettings.currencyName})
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IVA por Defecto</label>
              <div className="text-sm text-muted-foreground">{data?.companySettings.ivaRate || 16}%</div>
            </div>
            <Button>
              <Building className="mr-2 h-4 w-4" />
              Editar Información
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
            <CardDescription>Parámetros generales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notificaciones por Email</span>
              <Button variant="outline" size="sm">
                {data?.systemInfo.emailNotifications ? 'Activado' : 'Desactivado'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Backup Automático</span>
              <Button variant="outline" size="sm">
                {data?.systemInfo.backupEnabled ? 'Activado' : 'Desactivado'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zona Horaria</span>
              <Button variant="outline" size="sm">{data?.companySettings.timezoneDisplay || 'GMT-6'}</Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Idioma</span>
              <Button variant="outline" size="sm">{data?.companySettings.language || 'Español'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/settings/users">
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Usuarios y Roles
                </Button>
              </Link>
              <Link href="/settings/permissions">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Permisos
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Configurar Accesos
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integraciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/settings/integrations">
                <Button variant="outline" className="w-full justify-start">
                  API Growatt
                </Button>
              </Link>
              <Link href="/settings/integrations">
                <Button variant="outline" className="w-full justify-start">
                  WhatsApp Business
                </Button>
              </Link>
              <Link href="/settings/integrations">
                <Button variant="outline" className="w-full justify-start">
                  PAC para Facturación
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/settings/maintenance">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="mr-2 h-4 w-4" />
                  Backup Manual
                </Button>
              </Link>
              <Link href="/settings/maintenance">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Limpiar Cache
                </Button>
              </Link>
              <Link href="/settings/maintenance">
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="mr-2 h-4 w-4" />
                  Logs del Sistema
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Centro de Configuración</CardTitle>
          <CardDescription>
            Personalización completa del sistema MundoSolar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuraciones Disponibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Gestión de usuarios y permisos</li>
                <li>Configuración de empresa y facturación</li>
                <li>Integración con APIs externas</li>
                <li>Notificaciones y alertas</li>
              </ul>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Backup y restauración de datos</li>
                <li>Configuración de reportes</li>
                <li>Personalización de interfaz</li>
                <li>Mantenimiento del sistema</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
