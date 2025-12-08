'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface GrowattCredential {
  id: string
  clientId: string
  username: string
  isActive: boolean
  lastSync: Date | null
  client: {
    firstName: string
    lastName: string
  }
}

export default function GrowattCredentialsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [credentials, setCredentials] = useState<GrowattCredential[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadClients()
    loadCredentials()
  }, [])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/admin/growatt-credentials')
      if (response.ok) {
        const data = await response.json()
        setCredentials(data.credentials || [])
      }
    } catch (error) {
      console.error('Error loading credentials:', error)
    }
  }

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/growatt-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          username,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Credenciales agregadas exitosamente' })
        setSelectedClientId('')
        setUsername('')
        setPassword('')
        loadCredentials()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al agregar credenciales' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al agregar credenciales' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCredential = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar estas credenciales?')) return

    try {
      const response = await fetch(`/api/admin/growatt-credentials/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Credenciales eliminadas' })
        loadCredentials()
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar credenciales' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar credenciales' })
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/growatt-credentials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Estado actualizado' })
        loadCredentials()
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar estado' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar estado' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credenciales de Growatt</h1>
        <p className="text-muted-foreground">
          Administra las credenciales de acceso a Growatt para cada cliente
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Agregar Credenciales</CardTitle>
          <CardDescription>
            Agrega las credenciales de Growatt para un cliente. Estas se usarán en el cron job nocturno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCredential} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuario de Growatt</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario@growatt.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña de Growatt</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? 'Agregando...' : 'Agregar Credenciales'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciales Existentes ({credentials.length})</CardTitle>
          <CardDescription>
            Lista de todos los clientes con credenciales de Growatt configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay credenciales configuradas. Agrega la primera credencial arriba.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Usuario Growatt</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Sincronización</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-medium">
                      {cred.client.firstName} {cred.client.lastName}
                    </TableCell>
                    <TableCell>{cred.username}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(cred.id, cred.isActive)}
                      >
                        <Badge variant={cred.isActive ? 'default' : 'secondary'}>
                          {cred.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      {cred.lastSync
                        ? new Date(cred.lastSync).toLocaleString('es-MX')
                        : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCredential(cred.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Configuración del Cron Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>URL del Cron Job:</strong>{' '}
            <code className="bg-blue-100 px-2 py-1 rounded">
              https://mundosolar.vercel.app/api/cron/sync-growatt-data
            </code>
          </p>
          <p>
            <strong>Horario:</strong> Todos los días a las 10 PM (22:00) hora de México
          </p>
          <p>
            <strong>Función:</strong> Descarga automáticamente los datos de generación de energía de
            Growatt para todos los clientes con credenciales activas
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
