'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield, User, Settings, Eye, Edit, Trash2, Plus, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface RolePermission {
  role: string
  permissions: string[]
  description: string
}

interface ModulePermission {
  module: string
  roles: RolePermission[]
}

interface PermissionsData {
  stats: {
    activeRoles: number
    modulesWithPermissions: number
    uniquePermissions: number
  }
  roleCount: {
    ADMIN: number
    EMPLOYEE: number
    USER: number
    VIEWER: number
  }
  permissionMatrix: ModulePermission[]
}

export default function PermissionsPage() {
  const [data, setData] = useState<PermissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/settings/permissions')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Error al cargar permisos')
      }
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'crear': return 'bg-green-500'
      case 'leer': return 'bg-blue-500'
      case 'actualizar': return 'bg-yellow-500'
      case 'eliminar': return 'bg-red-500'
      case 'exportar': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500'
      case 'EMPLOYEE': return 'bg-blue-500'
      case 'USER': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar permisos</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchPermissions}>Reintentar</Button>
        </div>
      </div>
    )
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
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Permisos</h2>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Rol
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles Activos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.activeRoles || 0}</div>
            <p className="text-xs text-muted-foreground">
              Configurados en el sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.modulesWithPermissions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Con permisos configurados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permisos Únicos</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.uniquePermissions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tipos de acceso disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de Permisos por Módulo</CardTitle>
          <CardDescription>
            Control granular de accesos según roles de usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data?.permissionMatrix.map((moduleData) => (
              <div key={moduleData.module} className="space-y-3">
                <h3 className="font-semibold text-lg">{moduleData.module}</h3>
                <div className="space-y-2">
                  {moduleData.roles.map((roleData, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={getRoleColor(roleData.role)}>
                          {roleData.role}
                        </Badge>
                        <div>
                          <div className="font-medium">{roleData.description}</div>
                          <div className="flex space-x-1 mt-1">
                            {roleData.permissions.length > 0 ? (
                              roleData.permissions.map((perm) => (
                                <Badge key={perm} variant="outline" className={`text-xs ${getPermissionColor(perm)}`}>
                                  {perm}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-400">
                                Sin acceso
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Definición de Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-500">crear</Badge>
                <span className="text-sm">Agregar nuevos registros</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-500">leer</Badge>
                <span className="text-sm">Visualizar información existente</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-yellow-500">actualizar</Badge>
                <span className="text-sm">Modificar registros existentes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-red-500">eliminar</Badge>
                <span className="text-sm">Borrar registros del sistema</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-purple-500">exportar</Badge>
                <span className="text-sm">Descargar datos en formatos externos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jerarquía de Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">ADMIN</div>
                  <div className="text-sm text-muted-foreground">Administrador del sistema</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-red-500">Todos los permisos</Badge>
                  <span className="text-sm text-muted-foreground">({data?.roleCount.ADMIN || 0} usuarios)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">EMPLOYEE</div>
                  <div className="text-sm text-muted-foreground">Personal técnico</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-500">Permisos operativos</Badge>
                  <span className="text-sm text-muted-foreground">({data?.roleCount.EMPLOYEE || 0} usuarios)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">USER</div>
                  <div className="text-sm text-muted-foreground">Usuario estándar</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-500">Solo lectura</Badge>
                  <span className="text-sm text-muted-foreground">({data?.roleCount.USER || 0} usuarios)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">VIEWER</div>
                  <div className="text-sm text-muted-foreground">Solo visualización</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Consulta únicamente</Badge>
                  <span className="text-sm text-muted-foreground">({data?.roleCount.VIEWER || 0} usuarios)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
