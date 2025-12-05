'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Building, MapPin, Phone, Mail, FileText, Loader2, Sun, Key } from 'lucide-react'
import Link from 'next/link'

interface ClientFormData {
  // Basic Info
  type: 'personal' | 'business'
  firstName: string
  lastName: string
  businessName: string
  email: string
  phone: string
  
  // Tax/Fiscal Info
  rfc: string
  curp: string
  regimenFiscal: string
  
  // Address
  address: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  country: string
  
  // Status and Notes
  notes: string
  isActive: boolean
  
  // Growatt Integration
  growattUsername: string
  growattPassword: string
  expectedDailyGeneration: number // kWh expected per day
}

const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
]

const REGIMEN_FISCAL = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606 - Arrendamiento',
  '607 - Régimen de Enajenación o Adquisición de Bienes',
  '608 - Demás ingresos',
  '610 - Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611 - Ingresos por Dividendos (socios y accionistas)',
  '612 - Personas Físicas con Actividades Empresariales y Profesionales',
  '614 - Ingresos por intereses',
  '615 - Régimen de los ingresos por obtención de premios',
  '616 - Sin obligaciones fiscales',
  '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621 - Incorporación Fiscal',
  '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623 - Opcional para Grupos de Sociedades',
  '624 - Coordinados',
  '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626 - Régimen Simplificado de Confianza'
]

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<ClientFormData>({
    type: 'personal',
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    rfc: '',
    curp: '',
    regimenFiscal: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'México',
    notes: '',
    isActive: true,
    growattUsername: '',
    growattPassword: '',
    expectedDailyGeneration: 0
  })

  useEffect(() => {
    fetchClient()
  }, [clientId])

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      const result = await response.json()
      
      if (result.success) {
        const client = result.data
        
        // Determine if this is a business (heuristic: if lastName is empty, it's probably business)
        const isBusinessType = !client.lastName || client.lastName.trim() === ''
        
        setFormData({
          type: isBusinessType ? 'business' : 'personal',
          firstName: isBusinessType ? client.firstName : (client.firstName || ''),
          lastName: isBusinessType ? '' : (client.lastName || ''),
          businessName: isBusinessType ? client.firstName : '',
          email: client.email || '',
          phone: client.phone || '',
          rfc: client.rfc || '',
          curp: client.curp || '',
          regimenFiscal: client.regimenFiscal || '',
          address: client.address || '',
          neighborhood: client.neighborhood || '',
          city: client.city || '',
          state: client.state || '',
          postalCode: client.postalCode || '',
          country: 'México',
          notes: client.notes || '',
          isActive: client.isActive,
          growattUsername: client.growattUsername || '',
          growattPassword: client.growattPassword || '',
          expectedDailyGeneration: client.expectedDailyGeneration || 0
        })
      } else {
        throw new Error(result.error || 'Cliente no encontrado')
      }
    } catch (error) {
      console.error('Error fetching client:', error)
      alert(error instanceof Error ? error.message : 'Error al cargar cliente')
      router.push('/clients')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ClientFormData, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email) {
        throw new Error('Nombre, apellido y email son requeridos')
      }

      // Update client via API
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar cliente')
      }

      // Redirect back to clients list
      router.push('/clients')
      
    } catch (error) {
      console.error('Error updating client:', error)
      alert(error instanceof Error ? error.message : 'Error al actualizar cliente')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando cliente...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Clientes
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Editar Cliente</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Type */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Tipo de Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.type} onValueChange={(value: 'personal' | 'business') => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Persona Física</SelectItem>
                  <SelectItem value="business">Persona Moral (Empresa)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Personal/Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {formData.type === 'business' ? <Building className="mr-2 h-5 w-5" /> : <User className="mr-2 h-5 w-5" />}
                Información {formData.type === 'business' ? 'Empresarial' : 'Personal'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.type === 'personal' ? (
                <>
                  <div>
                    <Label htmlFor="firstName">Nombre *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Ingrese el nombre"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellido *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Ingrese el apellido"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="businessName">Razón Social *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Ingrese la razón social"
                    required
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="55 1234 5678"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Información Fiscal
              </CardTitle>
              <CardDescription>
                Datos necesarios para facturación SAT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  value={formData.rfc}
                  onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
                  placeholder={formData.type === 'personal' ? 'ABCD123456EFG' : 'ABC123456EFG'}
                  maxLength={formData.type === 'personal' ? 13 : 12}
                />
              </div>
              {formData.type === 'personal' && (
                <div>
                  <Label htmlFor="curp">CURP</Label>
                  <Input
                    id="curp"
                    value={formData.curp}
                    onChange={(e) => handleInputChange('curp', e.target.value.toUpperCase())}
                    placeholder="ABCD123456HDFMNR01"
                    maxLength={18}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="regimenFiscal">Régimen Fiscal</Label>
                <Select value={formData.regimenFiscal} onValueChange={(value) => handleInputChange('regimenFiscal', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar régimen fiscal" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMEN_FISCAL.map((regimen) => (
                      <SelectItem key={regimen} value={regimen}>
                        {regimen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="address">Calle y Número</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Av. Reforma 123"
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Colonia</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  placeholder="Centro"
                />
              </div>
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Ciudad de México"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEXICAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="06000"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Growatt Integration */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sun className="mr-2 h-5 w-5" />
                Integración Growatt
              </CardTitle>
              <CardDescription>
                Credenciales para monitoreo automático del sistema solar
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="growattUsername">Usuario Growatt</Label>
                <Input
                  id="growattUsername"
                  value={formData.growattUsername}
                  onChange={(e) => handleInputChange('growattUsername', e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="growattPassword">Contraseña Growatt</Label>
                <Input
                  id="growattPassword"
                  type="password"
                  value={formData.growattPassword}
                  onChange={(e) => handleInputChange('growattPassword', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="expectedDailyGeneration">Generación Esperada (kWh/día)</Label>
                <Input
                  id="expectedDailyGeneration"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.expectedDailyGeneration}
                  onChange={(e) => handleInputChange('expectedDailyGeneration', parseFloat(e.target.value) || 0)}
                  placeholder="50.0"
                />
              </div>
              <div className="md:col-span-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Key className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Monitoreo Inteligente</p>
                    <p className="text-xs text-blue-600">
                      Con estas credenciales, el sistema monitoreará automáticamente la generación solar 
                      y enviará alertas de mantenimiento cuando la producción esté por debajo de lo esperado.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status and Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Estado y Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="isActive">Estado del Cliente</Label>
                <Select 
                  value={formData.isActive ? 'active' : 'inactive'} 
                  onValueChange={(value) => handleInputChange('isActive', value === 'active')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Notas adicionales sobre el cliente..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/clients">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}