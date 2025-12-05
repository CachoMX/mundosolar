'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, User, Shield, Edit, Trash2, ArrowLeft, Loader2, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  name: string | null
  email: string
  role: string
  department: string | null
  employeeId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface UserStats {
  total: number
  active: number
  admins: number
  employees: number
  regularUsers: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, admins: 0, employees: 0, regularUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    department: '',
    employeeId: ''
  })

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users')

      if (!response.ok) {
        throw new Error('Error al obtener usuarios')
      }

      const result = await response.json()

      if (result.success) {
        setUsers(result.data.users)
        setStats(result.data.stats)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500'
      case 'EMPLOYEE': return 'bg-blue-500'
      case 'USER': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'ADMIN': 'Administrador',
      'EMPLOYEE': 'Empleado',
      'USER': 'Usuario',
      'VIEWER': 'Visualizador'
    }
    return labels[role] || role
  }

  const openDialog = (user?: UserData) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name || '',
        email: user.email,
        password: '',
        role: user.role,
        department: user.department || '',
        employeeId: user.employeeId || ''
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        department: '',
        employeeId: ''
      })
    }
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'USER',
      department: '',
      employeeId: ''
    })
  }

  const handleSaveUser = async () => {
    setSaving(true)

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        closeDialog()
        fetchUsers()
      } else {
        alert(result.error || 'Error al guardar usuario')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este usuario?')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        fetchUsers()
      } else {
        alert(result.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error al eliminar usuario')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar usuarios</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchUsers}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* User Dialog Modal */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <Button variant="ghost" size="sm" onClick={closeDialog}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@example.com"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Contraseña {editingUser && '(dejar en blanco para no cambiar)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                />
              </div>

              <div>
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="USER">Usuario</option>
                  <option value="EMPLOYEE">Empleado</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="VIEWER">Visualizador</option>
                </select>
              </div>

              <div>
                <Label htmlFor="department">Departamento (opcional)</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ventas, Técnico, etc."
                />
              </div>

              <div>
                <Label htmlFor="employeeId">ID Empleado (opcional)</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="EMP001"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={closeDialog} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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
        <Button onClick={() => openDialog()}>
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
            <div className="text-2xl font-bold">{stats.total}</div>
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
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
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
            <div className="text-2xl font-bold text-red-500">{stats.admins}</div>
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
            <div className="text-2xl font-bold text-blue-500">{stats.employees}</div>
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
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p>No hay usuarios registrados</p>
              <Button className="mt-4" onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Usuario
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{user.name || 'Sin nombre'}</h3>
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        {user.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.department || 'Sin departamento'} {user.employeeId && `• ID: ${user.employeeId}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openDialog(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={!user.isActive}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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