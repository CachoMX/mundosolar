'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, AlertCircle, Building2, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'

interface ContactSettings {
  contact_name: string
  contact_position: string
  contact_address: string
  contact_neighborhood: string
  contact_city: string
  contact_state: string
  contact_postal_code: string
  contact_phone: string
  contact_email: string
}

export default function ContactSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<ContactSettings>({
    contact_name: '',
    contact_position: '',
    contact_address: '',
    contact_neighborhood: '',
    contact_city: '',
    contact_state: '',
    contact_postal_code: '',
    contact_phone: '',
    contact_email: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/contact')
      const result = await response.json()

      if (result.success) {
        setFormData(result.data)
      } else {
        throw new Error(result.error || 'Error al cargar configuración')
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        throw new Error(result.error || 'Error al guardar configuración')
      }
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof ContactSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando configuración...</p>
          </div>
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
          <h2 className="text-3xl font-bold tracking-tight">Configuración de Contacto</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">Configuración guardada exitosamente</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Información del Representante
              </CardTitle>
              <CardDescription>
                Datos del contacto que aparece en los documentos de clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact_name">Nombre Completo</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="Nombre del representante"
                />
              </div>
              <div>
                <Label htmlFor="contact_position">Puesto</Label>
                <Input
                  id="contact_position"
                  value={formData.contact_position}
                  onChange={(e) => handleChange('contact_position', e.target.value)}
                  placeholder="Puesto o cargo"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Contacto
              </CardTitle>
              <CardDescription>
                Teléfono y correo electrónico de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="Número de teléfono"
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Correo Electrónico</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Dirección
              </CardTitle>
              <CardDescription>
                Dirección física del contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="contact_address">Domicilio</Label>
                <Input
                  id="contact_address"
                  value={formData.contact_address}
                  onChange={(e) => handleChange('contact_address', e.target.value)}
                  placeholder="Calle y número"
                />
              </div>
              <div>
                <Label htmlFor="contact_neighborhood">Colonia</Label>
                <Input
                  id="contact_neighborhood"
                  value={formData.contact_neighborhood}
                  onChange={(e) => handleChange('contact_neighborhood', e.target.value)}
                  placeholder="Colonia"
                />
              </div>
              <div>
                <Label htmlFor="contact_city">Municipio/Ciudad</Label>
                <Input
                  id="contact_city"
                  value={formData.contact_city}
                  onChange={(e) => handleChange('contact_city', e.target.value)}
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <Label htmlFor="contact_state">Estado</Label>
                <Input
                  id="contact_state"
                  value={formData.contact_state}
                  onChange={(e) => handleChange('contact_state', e.target.value)}
                  placeholder="Estado"
                />
              </div>
              <div>
                <Label htmlFor="contact_postal_code">Código Postal</Label>
                <Input
                  id="contact_postal_code"
                  value={formData.contact_postal_code}
                  onChange={(e) => handleChange('contact_postal_code', e.target.value)}
                  placeholder="C.P."
                  maxLength={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/settings">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
