'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Building, MapPin, Phone, Mail, FileText, Sun } from 'lucide-react'
import Link from 'next/link'

interface ClientFormData {
  // Personal/Business Info
  type: 'personal' | 'business'
  firstName: string
  lastName: string
  businessName: string
  email: string
  phone: string
  
  // Tax Info (Mexican)
  rfc: string
  curp: string
  regimenFiscal: string
  
  // Address
  street: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
  
  // Notes
  notes: string
  
  // Growatt Integration
  growattUsername: string
  growattPassword: string
  expectedDailyGeneration: string
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

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'México',
    notes: '',
    growattUsername: '',
    growattPassword: '',
    expectedDailyGeneration: ''
  })

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateRFC = (rfc: string): boolean => {
    // Basic RFC validation for Mexico
    // Personal: 4 letters + 6 digits + 3 alphanumeric (13 chars)
    // Business: 3 letters + 6 digits + 3 alphanumeric (12 chars)
    const personalRFC = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/
    const businessRFC = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/
    
    return personalRFC.test(rfc) || businessRFC.test(rfc)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (formData.type === 'personal') {
        if (!formData.firstName || !formData.lastName) {
          throw new Error('Nombre y apellido son requeridos')
        }
      } else {
        if (!formData.businessName) {
          throw new Error('Razón social es requerida')
        }
      }

      if (!formData.email || !formData.phone) {
        throw new Error('Email y teléfono son requeridos')
      }

      if (formData.rfc && !validateRFC(formData.rfc)) {
        throw new Error('RFC inválido')
      }

      // Prepare data for API
      const apiData = {
        ...formData,
        expectedDailyGeneration: formData.expectedDailyGeneration ? parseFloat(formData.expectedDailyGeneration) : null
      }

      // Save to database via API
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear cliente')
      }

      // Redirect back to clients list
      router.push('/clients')
      
    } catch (error) {
      console.error('Error creating client:', error)
      alert(error instanceof Error ? error.message : 'Error al crear cliente')
    } finally {
      setLoading(false)
    }
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
          <h2 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h2>
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
                <Label htmlFor="street">Calle y Número</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
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
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
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
                Credenciales para monitoreo de paneles solares (opcional)
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
                  placeholder="Contraseña"
                />
              </div>
              <div>
                <Label htmlFor="expectedDailyGeneration">Generación Esperada Diaria (kWh)</Label>
                <Input
                  id="expectedDailyGeneration"
                  type="number"
                  value={formData.expectedDailyGeneration}
                  onChange={(e) => handleInputChange('expectedDailyGeneration', e.target.value)}
                  placeholder="25.5"
                  step="0.1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notas</CardTitle>
              <CardDescription>
                Información adicional sobre el cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre el cliente..."
                rows={3}
              />
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
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Guardando...' : 'Guardar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}