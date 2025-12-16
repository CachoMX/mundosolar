'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, User, Building, MapPin, FileText, Sun, Plus, Trash2, Upload, Eye, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PanelRow {
  id: string
  cantidad: string
  marca: string
  modelo: string
  potencia: string
}

interface InverterRow {
  id: string
  cantidad: string
  marca: string
  modelo: string
  potencia: string
}

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
  identificationNumber: string

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

  // CFE Data
  cfeRpu: string
  cfeMeterNumber: string
  cfeRmu: string
  cfeAccountNumber: string
  cfeMeterType: string
  cfeTariff: string
  cfePhases: string
  cfeWires: string
  cfeInstalledLoad: string
  cfeContractedDemand: string
  cfeVoltageLevel: string
  cfeMediumVoltage: boolean
  cfeBranch: string
  cfeFolio: string
  cfeReceiptFileUrl: string
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

const CFE_TARIFFS = [
  '1 - Doméstico',
  '1A - Doméstico (Temp. Cálido)',
  '1B - Doméstico (Temp. Cálido)',
  '1C - Doméstico (Temp. Cálido)',
  '1D - Doméstico (Temp. Cálido)',
  '1E - Doméstico (Temp. Cálido)',
  '1F - Doméstico (Temp. Cálido)',
  'DAC - Doméstico Alto Consumo',
  'PDBT - Pequeña Demanda Baja Tensión',
  'GDBT - Gran Demanda Baja Tensión',
  'GDMTH - Gran Demanda Media Tensión Horaria',
  'GDMTO - Gran Demanda Media Tensión Ordinaria',
  'DIST - Distribución',
  'DIT - Transmisión'
]

const INVERTER_BRANDS = [
  'N/A',
  'APS',
  'Chint Power Systems',
  'Connera',
  'Enphase',
  'Fronius',
  'Goodwe',
  'Growatt',
  'Hoymiles',
  'Huawei',
  'NEP',
  'Solar Factory',
  'Solis',
  'Trannergy'
]

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
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
    identificationNumber: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'México',
    notes: '',
    growattUsername: '',
    growattPassword: '',
    expectedDailyGeneration: '',
    cfeRpu: '',
    cfeMeterNumber: '',
    cfeRmu: '',
    cfeAccountNumber: '',
    cfeMeterType: '',
    cfeTariff: '',
    cfePhases: '',
    cfeWires: '',
    cfeInstalledLoad: '',
    cfeContractedDemand: '',
    cfeVoltageLevel: '',
    cfeMediumVoltage: false,
    cfeBranch: '',
    cfeFolio: '',
    cfeReceiptFileUrl: ''
  })

  // Panels and Inverters state
  const [panels, setPanels] = useState<PanelRow[]>([
    { id: '1', cantidad: '', marca: '', modelo: '', potencia: '' }
  ])
  const [inverters, setInverters] = useState<InverterRow[]>([
    { id: '1', cantidad: '', marca: '', modelo: '', potencia: '' }
  ])

  const handleInputChange = (field: keyof ClientFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Panels handlers
  const addPanelRow = () => {
    setPanels([...panels, { id: Date.now().toString(), cantidad: '', marca: '', modelo: '', potencia: '' }])
  }

  const removePanelRow = (id: string) => {
    if (panels.length > 1) {
      setPanels(panels.filter(p => p.id !== id))
    }
  }

  const updatePanelRow = (id: string, field: keyof PanelRow, value: string) => {
    setPanels(panels.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  // Inverters handlers
  const addInverterRow = () => {
    setInverters([...inverters, { id: Date.now().toString(), cantidad: '', marca: '', modelo: '', potencia: '' }])
  }

  const removeInverterRow = (id: string) => {
    if (inverters.length > 1) {
      setInverters(inverters.filter(i => i.id !== id))
    }
  }

  const updateInverterRow = (id: string, field: keyof InverterRow, value: string) => {
    setInverters(inverters.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  // File upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `cfe-receipt-new-${Date.now()}.${fileExt}`
      const filePath = `cfe-receipts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      handleInputChange('cfeReceiptFileUrl', publicUrl)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error al subir el archivo')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRemoveFile = async () => {
    if (!formData.cfeReceiptFileUrl) return

    try {
      const supabase = createClient()
      const urlParts = formData.cfeReceiptFileUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `cfe-receipts/${fileName}`

      await supabase.storage
        .from('documents')
        .remove([filePath])

      handleInputChange('cfeReceiptFileUrl', '')
    } catch (error) {
      console.error('Error removing file:', error)
    }
  }

  const validateRFC = (rfc: string): boolean => {
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
        address: formData.street,
        postalCode: formData.zipCode,
        expectedDailyGeneration: formData.expectedDailyGeneration ? parseFloat(formData.expectedDailyGeneration) : null,
        panels: panels.filter(p => p.cantidad || p.marca || p.modelo || p.potencia),
        inverters: inverters.filter(i => i.cantidad || i.marca || i.modelo || i.potencia)
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
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="cfe">CFE</TabsTrigger>
            <TabsTrigger value="solar">Sistema Solar</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          {/* Tab: Información */}
          <TabsContent value="info" className="space-y-4">
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
                  <div>
                    <Label htmlFor="identificationNumber">No. INE/IFE</Label>
                    <Input
                      id="identificationNumber"
                      value={formData.identificationNumber}
                      onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                      placeholder="Número de identificación"
                    />
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
            </div>
          </TabsContent>

          {/* Tab: CFE */}
          <TabsContent value="cfe" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* CFE Receipt Information */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Datos del Recibo CFE
                  </CardTitle>
                  <CardDescription>
                    Información del servicio eléctrico del cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="cfeRpu">RPU (No. Servicio)</Label>
                    <Input
                      id="cfeRpu"
                      value={formData.cfeRpu}
                      onChange={(e) => handleInputChange('cfeRpu', e.target.value)}
                      placeholder="123456789012"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeMeterNumber">No. de Medidor</Label>
                    <Input
                      id="cfeMeterNumber"
                      value={formData.cfeMeterNumber}
                      onChange={(e) => handleInputChange('cfeMeterNumber', e.target.value)}
                      placeholder="AB12345678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeRmu">RMU</Label>
                    <Input
                      id="cfeRmu"
                      value={formData.cfeRmu}
                      onChange={(e) => handleInputChange('cfeRmu', e.target.value)}
                      placeholder="RMU"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeAccountNumber">No. de Cuenta</Label>
                    <Input
                      id="cfeAccountNumber"
                      value={formData.cfeAccountNumber}
                      onChange={(e) => handleInputChange('cfeAccountNumber', e.target.value)}
                      placeholder="Número de cuenta"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeMeterType">Tipo de Medidor</Label>
                    <Select value={formData.cfeMeterType} onValueChange={(value) => handleInputChange('cfeMeterType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="analogico">Analógico</SelectItem>
                        <SelectItem value="bidireccional">Bidireccional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cfeTariff">Tarifa</Label>
                    <Select value={formData.cfeTariff} onValueChange={(value) => handleInputChange('cfeTariff', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarifa" />
                      </SelectTrigger>
                      <SelectContent>
                        {CFE_TARIFFS.map((tariff) => (
                          <SelectItem key={tariff} value={tariff}>
                            {tariff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cfePhases">Fases</Label>
                    <Select value={formData.cfePhases} onValueChange={(value) => handleInputChange('cfePhases', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar fases" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Monofásico (1 fase)</SelectItem>
                        <SelectItem value="2">Bifásico (2 fases)</SelectItem>
                        <SelectItem value="3">Trifásico (3 fases)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cfeWires">Hilos</Label>
                    <Select value={formData.cfeWires} onValueChange={(value) => handleInputChange('cfeWires', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hilos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 hilos</SelectItem>
                        <SelectItem value="3">3 hilos</SelectItem>
                        <SelectItem value="4">4 hilos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cfeInstalledLoad">Carga Instalada (kW)</Label>
                    <Input
                      id="cfeInstalledLoad"
                      value={formData.cfeInstalledLoad}
                      onChange={(e) => handleInputChange('cfeInstalledLoad', e.target.value)}
                      placeholder="10.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeContractedDemand">Demanda Contratada (kW)</Label>
                    <Input
                      id="cfeContractedDemand"
                      value={formData.cfeContractedDemand}
                      onChange={(e) => handleInputChange('cfeContractedDemand', e.target.value)}
                      placeholder="15.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeVoltageLevel">Nivel de Tensión (V)</Label>
                    <Select value={formData.cfeVoltageLevel} onValueChange={(value) => handleInputChange('cfeVoltageLevel', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tensión" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="127">127 V</SelectItem>
                        <SelectItem value="220">220 V</SelectItem>
                        <SelectItem value="440">440 V</SelectItem>
                        <SelectItem value="13200">13,200 V (Media Tensión)</SelectItem>
                        <SelectItem value="23000">23,000 V (Media Tensión)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="cfeMediumVoltage"
                      checked={formData.cfeMediumVoltage}
                      onCheckedChange={(checked) => handleInputChange('cfeMediumVoltage', checked as boolean)}
                    />
                    <Label htmlFor="cfeMediumVoltage">Media Tensión</Label>
                  </div>
                </CardContent>
              </Card>

              {/* CFE Branch and Folio */}
              <Card>
                <CardHeader>
                  <CardTitle>Sucursal CFE</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cfeBranch">Sucursal</Label>
                    <Input
                      id="cfeBranch"
                      value={formData.cfeBranch}
                      onChange={(e) => handleInputChange('cfeBranch', e.target.value)}
                      placeholder="Sucursal CFE"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfeFolio">Folio</Label>
                    <Input
                      id="cfeFolio"
                      value={formData.cfeFolio}
                      onChange={(e) => handleInputChange('cfeFolio', e.target.value)}
                      placeholder="Folio del recibo"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* CFE Receipt Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5" />
                    Recibo CFE (Archivo)
                  </CardTitle>
                  <CardDescription>
                    Suba una imagen o PDF del recibo CFE
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.cfeReceiptFileUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm truncate max-w-[200px]">Archivo subido</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(formData.cfeReceiptFileUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                      {uploadingFile && <p className="text-sm text-muted-foreground mt-2">Subiendo archivo...</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Sistema Solar */}
          <TabsContent value="solar" className="space-y-4">
            <div className="grid gap-6">
              {/* Growatt Integration */}
              <Card>
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

              {/* Paneles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Paneles</span>
                    <Button type="button" variant="outline" size="sm" onClick={addPanelRow}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Cantidad</th>
                          <th className="text-left p-2 font-medium">Marca</th>
                          <th className="text-left p-2 font-medium">Modelo</th>
                          <th className="text-left p-2 font-medium">Potencia (W)</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {panels.map((panel) => (
                          <tr key={panel.id} className="border-b">
                            <td className="p-2">
                              <Input
                                type="number"
                                value={panel.cantidad}
                                onChange={(e) => updatePanelRow(panel.id, 'cantidad', e.target.value)}
                                placeholder="0"
                                className="w-20"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={panel.marca}
                                onChange={(e) => updatePanelRow(panel.id, 'marca', e.target.value)}
                                placeholder="Marca"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={panel.modelo}
                                onChange={(e) => updatePanelRow(panel.id, 'modelo', e.target.value)}
                                placeholder="Modelo"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={panel.potencia}
                                onChange={(e) => updatePanelRow(panel.id, 'potencia', e.target.value)}
                                placeholder="0"
                                className="w-24"
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePanelRow(panel.id)}
                                disabled={panels.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Inversores */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Inversores</span>
                    <Button type="button" variant="outline" size="sm" onClick={addInverterRow}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Cantidad</th>
                          <th className="text-left p-2 font-medium">Marca</th>
                          <th className="text-left p-2 font-medium">Modelo</th>
                          <th className="text-left p-2 font-medium">Potencia (kW)</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inverters.map((inverter) => (
                          <tr key={inverter.id} className="border-b">
                            <td className="p-2">
                              <Input
                                type="number"
                                value={inverter.cantidad}
                                onChange={(e) => updateInverterRow(inverter.id, 'cantidad', e.target.value)}
                                placeholder="0"
                                className="w-20"
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={inverter.marca}
                                onValueChange={(value) => updateInverterRow(inverter.id, 'marca', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INVERTER_BRANDS.map((brand) => (
                                    <SelectItem key={brand} value={brand}>
                                      {brand}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input
                                value={inverter.modelo}
                                onChange={(e) => updateInverterRow(inverter.id, 'modelo', e.target.value)}
                                placeholder="Modelo"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={inverter.potencia}
                                onChange={(e) => updateInverterRow(inverter.id, 'potencia', e.target.value)}
                                placeholder="0"
                                step="0.1"
                                className="w-24"
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeInverterRow(inverter.id)}
                                disabled={inverters.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Notas */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
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
                  rows={6}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
