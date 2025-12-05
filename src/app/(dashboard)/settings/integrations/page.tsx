'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Zap, MessageSquare, FileText, CheckCircle, XCircle, Settings, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'growatt',
      name: 'Growatt Solar',
      description: 'Monitoreo en tiempo real de sistemas solares',
      icon: Zap,
      status: 'disconnected',
      config: {
        username: '',
        password: '',
        endpoint: 'https://openapi.growatt.com'
      },
      isEditing: false,
      isTesting: false
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Notificaciones automáticas a clientes',
      icon: MessageSquare,
      status: 'disconnected',
      config: {
        phoneId: '',
        token: ''
      },
      isEditing: false,
      isTesting: false
    },
    {
      id: 'pac',
      name: 'PAC para Facturación',
      description: 'Timbrado automático de facturas SAT',
      icon: FileText,
      status: 'disconnected',
      config: {
        provider: 'CFDIMax',
        rfc: 'MSO123456XXX'
      },
      isEditing: false,
      isTesting: false
    }
  ])

  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: string}>({})

  // Load saved configurations on component mount
  useEffect(() => {
    const savedConfigs = localStorage.getItem('mundosolar_integrations')
    if (savedConfigs) {
      try {
        const parsed = JSON.parse(savedConfigs)
        setIntegrations(prev => prev.map(integration => ({
          ...integration,
          ...parsed[integration.id],
          isEditing: false,
          isTesting: false
        })))
      } catch (error) {
        console.error('Error loading saved configurations:', error)
      }
    }
  }, [])

  const getStatusColor = (status: string) => {
    return status === 'connected' ? 'text-green-500' : 'text-red-500'
  }

  const getStatusIcon = (status: string) => {
    return status === 'connected' ? CheckCircle : XCircle
  }

  // Save configurations to localStorage
  const saveConfigurations = (updatedIntegrations: typeof integrations) => {
    const configsToSave = updatedIntegrations.reduce((acc, integration) => {
      acc[integration.id] = {
        status: integration.status,
        config: integration.config
      }
      return acc
    }, {} as any)
    localStorage.setItem('mundosolar_integrations', JSON.stringify(configsToSave))
  }

  // Test API connection
  const testConnection = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId)
    if (!integration) return

    // Update state to show loading
    setIntegrations(prev => prev.map(i => 
      i.id === integrationId ? { ...i, isTesting: true } : i
    ))

    try {
      let testResult = false
      
      if (integrationId === 'growatt') {
        // Test Growatt Login
        const { username, password, endpoint } = integration.config as { username: string, password: string, endpoint: string }
        if (!username.trim() || !password.trim()) {
          setConnectionStatus(prev => ({ ...prev, [integrationId]: 'Error: Usuario y contraseña requeridos' }))
          return
        }

        let apiToken = null
        try {
          const response = await fetch('/api/integrations/growatt/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, endpoint })
          })
          
          if (response.ok) {
            const data = await response.json()
            testResult = data.success
            if (data.success && data.data?.token) {
              apiToken = data.data.token
            }
            setConnectionStatus(prev => ({ 
              ...prev, 
              [integrationId]: testResult ? `Conexión exitosa - Sesión iniciada como ${username}` : `Error: ${data.error || 'Credenciales inválidas'}`
            }))
          } else {
            setConnectionStatus(prev => ({ 
              ...prev, 
              [integrationId]: 'Error: No se pudo conectar con el servidor Growatt'
            }))
          }
        } catch (error) {
          // Simulate login test for demo purposes since we don't have the API endpoint yet
          testResult = username.trim().length > 0 && password.trim().length >= 6
          if (testResult) {
            apiToken = `demo_token_${Date.now()}`
          }
          setConnectionStatus(prev => ({ 
            ...prev, 
            [integrationId]: testResult ? `Conexión simulada exitosa - Usuario: ${username} (Demo)` : 'Error: Usuario o contraseña inválidos'
          }))
        }

        // Store the token for later use
        if (testResult && apiToken) {
          setIntegrations(prev => {
            const updated = prev.map(i => {
              if (i.id === integrationId) {
                return { 
                  ...i, 
                  status: 'connected' as const,
                  token: apiToken
                }
              }
              return i
            })
            // Save with token
            const configsToSave = updated.reduce((acc, integration) => {
              acc[integration.id] = {
                status: integration.status,
                config: integration.config,
                token: (integration as any).token
              }
              return acc
            }, {} as any)
            localStorage.setItem('mundosolar_integrations', JSON.stringify(configsToSave))
            return updated
          })
        }
      } else if (integrationId === 'whatsapp') {
        const { phoneId, token } = integration.config as { phoneId: string, token: string }
        testResult = phoneId.trim().length > 0 && token.trim().length > 0
        setConnectionStatus(prev => ({ 
          ...prev, 
          [integrationId]: testResult ? 'Configuración válida (Demo)' : 'Error: Phone ID y Token requeridos'
        }))
      } else if (integrationId === 'pac') {
        const { rfc } = integration.config as { provider: string, rfc: string }
        testResult = rfc.length === 12 || rfc.length === 13
        setConnectionStatus(prev => ({ 
          ...prev, 
          [integrationId]: testResult ? 'RFC válido (Demo)' : 'Error: RFC inválido'
        }))
      }


    } catch (error) {
      setConnectionStatus(prev => ({ 
        ...prev, 
        [integrationId]: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }))
    } finally {
      // Remove loading state
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId ? { ...i, isTesting: false } : i
      ))
    }
  }

  // Toggle connection
  const toggleConnection = (integrationId: string) => {
    setIntegrations(prev => {
      const updated = prev.map(i => {
        if (i.id === integrationId) {
          const newStatus = i.status === 'connected' ? 'disconnected' : 'connected'
          if (newStatus === 'disconnected') {
            setConnectionStatus(prevStatus => ({ ...prevStatus, [integrationId]: '' }))
          }
          return { ...i, status: newStatus }
        }
        return i
      })
      saveConfigurations(updated)
      return updated
    })
  }

  // Toggle edit mode
  const toggleEditMode = (integrationId: string) => {
    setIntegrations(prev => prev.map(i => 
      i.id === integrationId ? { ...i, isEditing: !i.isEditing } : i
    ))
  }

  // Update configuration
  const updateConfig = (integrationId: string, key: string, value: string) => {
    setIntegrations(prev => {
      const updated = prev.map(i => 
        i.id === integrationId 
          ? { ...i, config: { ...i.config, [key]: value } }
          : i
      )
      saveConfigurations(updated)
      return updated
    })
  }

  // Save configuration and exit edit mode
  const saveConfiguration = (integrationId: string) => {
    setIntegrations(prev => {
      const updated = prev.map(i => 
        i.id === integrationId ? { ...i, isEditing: false, status: 'disconnected' as const } : i
      )
      saveConfigurations(updated)
      return updated
    })
    setConnectionStatus(prev => ({ ...prev, [integrationId]: 'Configuración guardada. Prueba la conexión.' }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Integraciones</h2>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integraciones</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">
              APIs configuradas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conectadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {integrations.filter(i => i.status === 'connected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Funcionando correctamente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconectadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {integrations.filter(i => i.status === 'disconnected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren configuración
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {integrations.map((integration, index) => {
          const IconComponent = integration.icon
          const StatusIcon = getStatusIcon(integration.status)
          
          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{integration.name}</span>
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(integration.status)}`} />
                      </CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={integration.status === 'connected' ? 'default' : 'destructive'}>
                    {integration.status === 'connected' ? 'Conectada' : 'Desconectada'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(integration.config).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      <Input
                        type={key.includes('key') || key.includes('token') || key === 'password' ? 'password' : 'text'}
                        value={value as string}
                        onChange={(e) => updateConfig(integration.id, key, e.target.value)}
                        className="font-mono text-sm border-input focus:border-blue-500 bg-white"
                        placeholder={`Ingrese ${key}`}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Connection status message */}
                {connectionStatus[integration.id] && (
                  <div className={`mt-3 p-2 rounded text-sm ${
                    connectionStatus[integration.id].includes('Error') 
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : connectionStatus[integration.id].includes('exitosa') || connectionStatus[integration.id].includes('válido')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {connectionStatus[integration.id]}
                  </div>
                )}

                <div className="mt-4 flex space-x-2">
                  <Button 
                    variant={integration.status === 'connected' ? 'destructive' : 'default'} 
                    size="sm"
                    onClick={() => toggleConnection(integration.id)}
                  >
                    {integration.status === 'connected' ? 'Desconectar' : 'Conectar'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testConnection(integration.id)}
                    disabled={integration.isTesting}
                  >
                    {integration.isTesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="mr-2 h-4 w-4" />
                    )}
                    {integration.isTesting ? 'Probando...' : 'Probar Conexión'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de Integraciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <Zap className="mr-2 h-4 w-4" />
                API Growatt
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Permite el monitoreo en tiempo real de la generación de energía solar y el estado de los inversores.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Datos de generación en tiempo real</li>
                <li>Alertas de mal funcionamiento</li>
                <li>Reportes automáticos de rendimiento</li>
                <li>Historial de generación</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp Business
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Envío automático de notificaciones a clientes sobre mantenimientos, facturas y alertas del sistema.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Recordatorios de mantenimiento</li>
                <li>Notificaciones de facturación</li>
                <li>Alertas de sistema</li>
                <li>Confirmaciones automáticas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}