import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, User, Shield, Edit, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function UsersPage() {
  const users = [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@mundosolar.com',
      role: 'ADMIN',
      department: 'Administración',
      isActive: true,
      lastLogin: '2024-08-28'
    },
    {
      id: 2,
      name: 'Carlos Técnico',
      email: 'carlos.tecnico@mundosolar.com',
      role: 'EMPLOYEE',
      department: 'Técnico',
      isActive: true,
      lastLogin: '2024-08-27'
    },
    {
      id: 3,
      name: 'María Ventas',
      email: 'maria.ventas@mundosolar.com',
      role: 'USER',
      department: 'Ventas',
      isActive: true,
      lastLogin: '2024-08-26'
    }
  ]

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
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{users.filter(u => u.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{users.filter(u => u.role === 'ADMIN').length}</div>
            <p className="text-xs text-muted-foreground">
              Con permisos completos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{users.filter(u => u.role === 'EMPLOYEE').length}</div>
            <p className="text-xs text-muted-foreground">
              Personal técnico
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Gestión de usuarios del sistema MundoSolar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                      {user.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Activo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.department} • Último acceso: {user.lastLogin}
                    </p>
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
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles y Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">ADMIN</div>
                  <div className="text-sm text-muted-foreground">Acceso completo al sistema</div>
                </div>
                <Badge className="bg-red-500">Todos los permisos</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">EMPLOYEE</div>
                  <div className="text-sm text-muted-foreground">Personal técnico y operativo</div>
                </div>
                <Badge className="bg-blue-500">Permisos limitados</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">USER</div>
                  <div className="text-sm text-muted-foreground">Usuario básico</div>
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

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">admin@mundosolar.com</span>
                <span className="text-muted-foreground"> inició sesión hace 2 horas</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">carlos.tecnico@mundosolar.com</span>
                <span className="text-muted-foreground"> completó mantenimiento ayer</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">maria.ventas@mundosolar.com</span>
                <span className="text-muted-foreground"> creó nueva orden hace 1 día</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}