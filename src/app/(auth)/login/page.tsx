'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sun, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Helper to detect if input is email or phone
function isEmail(input: string): boolean {
  return input.includes('@')
}

// Validate phone: must be exactly 10 digits, no spaces, dashes, or special characters
function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone)
}

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('') // Can be email or phone
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const inputIsEmail = isEmail(identifier)

      if (inputIsEmail) {
        // Login with Supabase Auth for admin/staff users
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: identifier,
          password
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        if (data.user) {
          router.push('/')
          router.refresh()
        }
      } else {
        // Login with phone number for clients
        // Validate phone format before sending
        if (!isValidPhone(identifier)) {
          setError('El teléfono debe ser exactamente 10 dígitos sin espacios, guiones ni +52')
          return
        }

        const response = await fetch('/api/auth/client-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: identifier, password })
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Error al iniciar sesión')
          return
        }

        if (result.requirePasswordChange) {
          // Redirect to password change page
          router.push(`/cambiar-contrasenia?clientId=${result.clientId}`)
        } else {
          // Redirect to client dashboard
          router.push('/cliente')
        }
        router.refresh()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img
              src="/assets/logos/logo.svg"
              alt="MundoSolar Logo"
              className="h-16 w-auto"
            />
          </div>
          <div className="text-center">
            <CardDescription>Sistema de Gestión Solar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error de autenticación</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">Email o Teléfono</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="tu@email.com o 3121234567"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
