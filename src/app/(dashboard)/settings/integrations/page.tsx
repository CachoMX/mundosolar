'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Zap, MessageSquare, FileText, CheckCircle, XCircle, Settings, Loader2, CreditCard, AlertCircle, Building2 } from 'lucide-react'
import Link from 'next/link'

type IntegrationConfig = {
  [key: string]: string | undefined
}

type Integration = {
  id: string
  name: string
  description: string
  icon: typeof Zap
  status: string
  config: IntegrationConfig
  isEditing: boolean
  isTesting: boolean
}

interface BillingStatus {
  isConfigured: boolean
  missingConfig: string[]
  emisor: {
    rfc: string | null
    nombre: string | null
    codigoPostal: string | null
  }
  apiKeySet: boolean
  csdConfigured: boolean
  credits: number | null
  creditsError: string | null
  mode: 'production' | 'demo'
}

const fetchBillingStatus = async (): Promise<BillingStatus> => {
  const response = await fetch('/api/billing/status')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener estado de facturación')
  }
  return result.data
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
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
    }
  ])

  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: string}>({})

  // Fetch billing status
  const { data: billingStatus, isLoading: billingLoading, refetch: refetchBilling } = useQuery({
    queryKey: ['billing-status'],
    queryFn: fetchBillingStatus,
  })

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
  const saveConfigurations = (updatedIntegrations: Integration[]) => {
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

  const connectedCount = integrations.filter(i => i.status === 'connected').length + (billingStatus?.isConfigured ? 1 : 0)
  const disconnectedCount = integrations.filter(i => i.status === 'disconnected').length + (billingStatus?.isConfigured ? 0 : 1)

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
            <div className="text-2xl font-bold">{integrations.length + 1}</div>
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
              {connectedCount}
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
              {disconnectedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren configuración
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Factura-lo Plus Integration Card */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Factura-lo Plus</span>
                  {billingLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : billingStatus?.isConfigured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription>Facturación electrónica CFDI 4.0 - Timbrado automático con el SAT</CardDescription>
              </div>
            </div>
            <Badge variant={billingStatus?.isConfigured ? 'default' : billingStatus?.mode === 'demo' ? 'secondary' : 'destructive'}>
              {billingStatus?.isConfigured ? 'Configurada' : billingStatus?.mode === 'demo' ? 'Modo Demo' : 'No Configurada'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {billingLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Verificando configuración...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Configuration Status */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Emisor</span>
                  </div>
                  {billingStatus?.emisor.rfc ? (
                    <>
                      <p className="text-sm font-mono">{billingStatus.emisor.rfc}</p>
                      <p className="text-xs text-muted-foreground truncate">{billingStatus.emisor.nombre || 'Sin nombre'}</p>
                    </>
                  ) : (
                    <p className="text-sm text-yellow-600">No configurado</p>
                  )}
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">API Key</span>
                  </div>
                  {billingStatus?.apiKeySet ? (
                    <p className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Configurada
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      No configurada
                    </p>
                  )}
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Certificados CSD</span>
                  </div>
                  {billingStatus?.csdConfigured ? (
                    <p className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Configurados
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      No configurados
                    </p>
                  )}
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Créditos</span>
                  </div>
                  {billingStatus?.credits !== null && billingStatus?.credits !== undefined ? (
                    <p className={`text-lg font-bold ${(billingStatus?.credits ?? 0) < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {billingStatus?.credits} timbres
                    </p>
                  ) : billingStatus?.creditsError ? (
                    <p className="text-sm text-yellow-600">Error al consultar</p>
                  ) : (
                    <p className="text-sm text-gray-500">--</p>
                  )}
                </div>
              </div>

              {/* Missing Configuration Alert */}
              {billingStatus && !billingStatus.isConfigured && billingStatus.missingConfig.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Configuración incompleta</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Falta configurar: <span className="font-mono">{billingStatus.missingConfig.join(', ')}</span>
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">
                        Configure las variables de entorno en su servidor para habilitar la facturación real.
                        Mientras tanto, el sistema funcionará en modo demo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Instructions */}
              <div className="p-4 bg-gray-50 border rounded-lg">
                <h4 className="font-semibold mb-2">Variables de Entorno Requeridas</h4>
                <div className="grid gap-2 text-sm font-mono">
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">FACTURALO_API_KEY</code>
                    <span className="text-gray-600">- API Key de Factura-lo Plus</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">EMISOR_RFC</code>
                    <span className="text-gray-600">- RFC del emisor</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">EMISOR_NOMBRE</code>
                    <span className="text-gray-600">- Razón social del emisor</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">EMISOR_REGIMEN_FISCAL</code>
                    <span className="text-gray-600">- Código de régimen fiscal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">EMISOR_CODIGO_POSTAL</code>
                    <span className="text-gray-600">- Código postal del domicilio fiscal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">CSD_KEY_PEM</code>
                    <span className="text-gray-600">- Certificado de Sello Digital (llave privada)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-200 px-2 py-1 rounded">CSD_CER_PEM</code>
                    <span className="text-gray-600">- Certificado de Sello Digital (certificado)</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchBilling()}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Verificar Configuración
                </Button>
                <Link href="https://panel.facturaloplus.com/usuarios/login" target="_blank">
                  <Button variant="outline" size="sm">
                    Ir al Panel de Factura-lo Plus
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Factura-lo Plus
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Sistema de facturación electrónica CFDI 4.0 que cumple con la normatividad del SAT.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Timbrado automático de facturas</li>
                <li>Cancelación con motivo</li>
                <li>Generación de XML y PDF</li>
                <li>Consulta de estado en SAT</li>
              </ul>
            </div>
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
