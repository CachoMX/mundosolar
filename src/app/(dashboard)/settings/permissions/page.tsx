import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield, User, Settings, Eye, Edit, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'

export default function PermissionsPage() {
  const permissions = [
    {
      module: 'Clientes',
      role: 'ADMIN',
      permissions: ['crear', 'leer', 'actualizar', 'eliminar'],
      description: 'Control total sobre gestión de clientes'
    },
    {
      module: 'Clientes',
      role: 'EMPLOYEE',
      permissions: ['leer', 'actualizar'],
      description: 'Visualización y edición de clientes existentes'
    },
    {
      module: 'Clientes',
      role: 'USER',
      permissions: ['leer'],
      description: 'Solo visualización de información de clientes'
    },
    {
      module: 'Inventario',
      role: 'ADMIN',
      permissions: ['crear', 'leer', 'actualizar', 'eliminar'],
      description: 'Control total del inventario'
    },
    {
      module: 'Inventario',
      role: 'EMPLOYEE',
      permissions: ['leer', 'actualizar'],
      description: 'Consulta y actualización de stock'
    },
    {
      module: 'Facturación',
      role: 'ADMIN',
      permissions: ['crear', 'leer', 'actualizar', 'eliminar'],
      description: 'Control total de facturación y SAT'
    },
    {
      module: 'Facturación',
      role: 'EMPLOYEE',
      permissions: ['crear', 'leer'],
      description: 'Creación y consulta de facturas'
    },
    {
      module: 'Reportes',
      role: 'ADMIN',
      permissions: ['leer', 'exportar'],
      description: 'Acceso completo a reportes y exportación'
    },
    {
      module: 'Reportes',
      role: 'EMPLOYEE',
      permissions: ['leer'],
      description: 'Consulta de reportes operativos'
    }
  ]

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
            <div className="text-2xl font-bold">4</div>
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
            <div className="text-2xl font-bold">6</div>
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
            <div className="text-2xl font-bold">5</div>
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
            {['Clientes', 'Inventario', 'Facturación', 'Reportes'].map((module) => {
              const modulePermissions = permissions.filter(p => p.module === module)
              
              return (
                <div key={module} className="space-y-3">
                  <h3 className="font-semibold text-lg">{module}</h3>
                  <div className="space-y-2">
                    {modulePermissions.map((permission, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge className={getRoleColor(permission.role)}>
                            {permission.role}
                          </Badge>
                          <div>
                            <div className="font-medium">{permission.description}</div>
                            <div className="flex space-x-1 mt-1">
                              {permission.permissions.map((perm) => (
                                <Badge key={perm} variant="outline" className={`text-xs ${getPermissionColor(perm)}`}>
                                  {perm}
                                </Badge>
                              ))}
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
              )
            })}
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
                <Badge className="bg-red-500">Todos los permisos</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">EMPLOYEE</div>
                  <div className="text-sm text-muted-foreground">Personal técnico</div>
                </div>
                <Badge className="bg-blue-500">Permisos operativos</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">USER</div>
                  <div className="text-sm text-muted-foreground">Usuario estándar</div>
                </div>
                <Badge className="bg-green-500">Solo lectura</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">VIEWER</div>
                  <div className="text-sm text-muted-foreground">Solo visualización</div>
                </div>
                <Badge variant="outline">Consulta únicamente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}