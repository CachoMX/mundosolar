'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, User, Building, MapPin, FileText, Loader2, Sun, Key, Zap, Plus, Trash2, Wrench, StickyNote, Upload, File, X, ExternalLink, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'

// Solar Panel interface
interface SolarPanel {
  id: string
  brand: string
  model: string
  quantity: number
  wattsPerPanel: number
}

// Inverter interface
interface Inverter {
  id: string
  brand: string
  model: string
  quantity: number
  capacityWatts: number
}

// Contact Settings interface
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

// Client Address interface
interface ClientAddressData {
  id: string
  name: string
  address: string
  city: string
  state: string
  postalCode: string
  neighborhood: string
  isDefault: boolean
  isActive: boolean
  _deleted?: boolean
}

// CFE Receipt interface (Medidor)
interface CfeReceiptData {
  id: string
  addressId: string | null
  name: string
  rpu: string
  serviceNumber: string
  meterNumber: string
  rmu: string
  accountNumber: string
  meterType: string
  tariff: string
  phases: number
  wires: number
  installedLoad: number
  contractedDemand: number
  voltageLevel: number
  mediumVoltage: boolean
  cfeBranch: string
  cfeFolio: string
  receiptFileUrl: string
  notes: string
  _deleted?: boolean
}

// Maintenance interface
interface ClientMaintenance {
  id: string
  title: string
  type: string
  status: string
  priority: string
  scheduledDate: string | null
  completedDate: string | null
  technicians: Array<{
    technician: {
      name: string
    }
  }>
}

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
  identificationNumber: string // INE/IFE
  
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

  // CFE Receipt Data
  cfeRpu: string
  cfeServiceNumber: string
  cfeMeterNumber: string
  cfeRmu: string
  cfeAccountNumber: string
  cfeMeterType: string
  cfeTariff: string
  cfePhases: number
  cfeWires: number
  cfeInstalledLoad: number
  cfeContractedDemand: number
  cfeVoltageLevel: number
  cfeMediumVoltage: boolean
  cfeBranch: string
  cfeFolio: string
  cfeReceiptFileUrl: string // URL del archivo del recibo CFE

  // Solar System Data
  monthlyGeneration: number // KWH/MES
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

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [panels, setPanels] = useState<SolarPanel[]>([])
  const [inverters, setInverters] = useState<Inverter[]>([])
  const [maintenances, setMaintenances] = useState<ClientMaintenance[]>([])
  const [addresses, setAddresses] = useState<ClientAddressData[]>([])
  const [cfeReceipts, setCfeReceipts] = useState<CfeReceiptData[]>([])
  const [uploadingMeterIndex, setUploadingMeterIndex] = useState<number | null>(null)
  const [loadingMaintenances, setLoadingMaintenances] = useState(false)
  const [growattPlants, setGrowattPlants] = useState<any[]>([])
  const [loadingGrowatt, setLoadingGrowatt] = useState(false)
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
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
    expectedDailyGeneration: 0,
    cfeRpu: '',
    cfeServiceNumber: '',
    cfeMeterNumber: '',
    cfeRmu: '',
    cfeAccountNumber: '',
    cfeMeterType: '',
    cfeTariff: '',
    cfePhases: 0,
    cfeWires: 0,
    cfeInstalledLoad: 0,
    cfeContractedDemand: 0,
    cfeVoltageLevel: 0,
    cfeMediumVoltage: false,
    cfeBranch: '',
    cfeFolio: '',
    cfeReceiptFileUrl: '',
    monthlyGeneration: 0
  })

  useEffect(() => {
    fetchClient()
    fetchContactSettings()
    fetchMaintenances()
  }, [clientId])

  const fetchContactSettings = async () => {
    try {
      const response = await fetch('/api/settings/contact')
      const result = await response.json()
      if (result.success) {
        setContactSettings(result.data)
      }
    } catch (error) {
      console.error('Error fetching contact settings:', error)
    }
  }

  const fetchMaintenances = async () => {
    try {
      setLoadingMaintenances(true)
      const response = await fetch(`/api/clients/${clientId}/maintenances`)
      const result = await response.json()
      if (result.success) {
        setMaintenances(result.data)
      }
    } catch (error) {
      console.error('Error fetching maintenances:', error)
    } finally {
      setLoadingMaintenances(false)
    }
  }

  const fetchGrowattPlants = async (username: string, password: string, existingPanels: SolarPanel[]) => {
    if (!username || !password) return

    try {
      setLoadingGrowatt(true)
      const response = await fetch('/api/integrations/growatt/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const result = await response.json()

      if (result.success && result.data?.plants) {
        const plants = result.data.plants
        setGrowattPlants(plants)

        // If no panels exist yet, populate from Growatt plants
        if (existingPanels.length === 0 && plants.length > 0) {
          const growattPanels: SolarPanel[] = plants.map((plant: any) => {
            // Parse capacity from string like "10 kW" or "10kW"
            const capacityStr = plant.capacity || '0'
            const capacityKw = parseFloat(capacityStr.replace(/[^\d.]/g, '')) || 0
            const capacityWatts = capacityKw * 1000

            return {
              id: `growatt-${plant.plantId || crypto.randomUUID()}`,
              brand: 'Growatt',
              model: plant.plantName || 'Sistema Growatt',
              quantity: 1,
              wattsPerPanel: capacityWatts
            }
          })
          setPanels(growattPanels)
        }
      }
    } catch (error) {
      console.error('Error fetching Growatt plants:', error)
    } finally {
      setLoadingGrowatt(false)
    }
  }

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      const result = await response.json()
      
      if (result.success) {
        const client = result.data

        // Determine if this is a business (heuristic: if lastName is empty, it's probably business)
        const isBusinessType = !client.lastName || client.lastName.trim() === ''

        // Get CFE receipt data if available (for backwards compatibility)
        const cfeReceipt = client.cfeReceipts?.[0] || null

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
          identificationNumber: client.identificationNumber || '',
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
          expectedDailyGeneration: client.expectedDailyGeneration || 0,
          cfeRpu: cfeReceipt?.rpu || '',
          cfeServiceNumber: cfeReceipt?.serviceNumber || '',
          cfeMeterNumber: cfeReceipt?.meterNumber || '',
          cfeRmu: cfeReceipt?.rmu || '',
          cfeAccountNumber: cfeReceipt?.accountNumber || '',
          cfeMeterType: cfeReceipt?.meterType || '',
          cfeTariff: cfeReceipt?.tariff || '',
          cfePhases: cfeReceipt?.phases || 0,
          cfeWires: cfeReceipt?.wires || 0,
          cfeInstalledLoad: cfeReceipt?.installedLoad || 0,
          cfeContractedDemand: cfeReceipt?.contractedDemand || 0,
          cfeVoltageLevel: cfeReceipt?.voltageLevel || 0,
          cfeMediumVoltage: cfeReceipt?.mediumVoltage || false,
          cfeBranch: cfeReceipt?.cfeBranch || '',
          cfeFolio: cfeReceipt?.cfeFolio || '',
          cfeReceiptFileUrl: cfeReceipt?.receiptFileUrl || '',
          monthlyGeneration: client.monthlyGeneration || 0
        })

        // Load addresses
        if (client.addresses && client.addresses.length > 0) {
          setAddresses(client.addresses.map((addr: any) => ({
            id: addr.id,
            name: addr.name || '',
            address: addr.address || '',
            city: addr.city || '',
            state: addr.state || '',
            postalCode: addr.postalCode || '',
            neighborhood: addr.neighborhood || '',
            isDefault: addr.isDefault || false,
            isActive: addr.isActive !== false
          })))
        }

        // Load CFE receipts (medidores)
        if (client.cfeReceipts && client.cfeReceipts.length > 0) {
          setCfeReceipts(client.cfeReceipts.map((cfe: any) => ({
            id: cfe.id,
            addressId: cfe.addressId || null,
            name: cfe.name || '',
            rpu: cfe.rpu || '',
            serviceNumber: cfe.serviceNumber || '',
            meterNumber: cfe.meterNumber || '',
            rmu: cfe.rmu || '',
            accountNumber: cfe.accountNumber || '',
            meterType: cfe.meterType || '',
            tariff: cfe.tariff || '',
            phases: cfe.phases || 0,
            wires: cfe.wires || 0,
            installedLoad: cfe.installedLoad || 0,
            contractedDemand: cfe.contractedDemand || 0,
            voltageLevel: cfe.voltageLevel || 0,
            mediumVoltage: cfe.mediumVoltage || false,
            cfeBranch: cfe.cfeBranch || '',
            cfeFolio: cfe.cfeFolio || '',
            receiptFileUrl: cfe.receiptFileUrl || '',
            notes: cfe.notes || ''
          })))
        }

        // Load panels and inverters from solar systems components or orders
        const loadedPanels: SolarPanel[] = []
        const loadedInverters: Inverter[] = []

        // First try to load from solar system components
        if (client.solarSystems && client.solarSystems.length > 0) {
          client.solarSystems.forEach((system: any) => {
            if (system.components) {
              system.components.forEach((component: any) => {
                const categoryName = component.product?.category?.name?.toLowerCase() || ''
                const capacity = component.product?.capacity || ''
                const capacityNum = parseInt(capacity.replace(/\D/g, '')) || 0

                if (categoryName.includes('panel')) {
                  loadedPanels.push({
                    id: component.id,
                    brand: component.product?.brand || '',
                    model: component.product?.model || component.product?.name || '',
                    quantity: component.quantity || 1,
                    wattsPerPanel: capacityNum
                  })
                } else if (categoryName.includes('inversor') || categoryName.includes('inverter')) {
                  loadedInverters.push({
                    id: component.id,
                    brand: component.product?.brand || '',
                    model: component.product?.model || component.product?.name || '',
                    quantity: component.quantity || 1,
                    capacityWatts: capacityNum
                  })
                }
              })
            }
          })
        }

        // If no panels/inverters from components, try to load from orders
        if (loadedPanels.length === 0 && loadedInverters.length === 0 && client.orders) {
          client.orders.forEach((order: any) => {
            if (order.orderItems) {
              order.orderItems.forEach((item: any) => {
                const categoryName = item.product?.category?.name?.toLowerCase() || ''
                const capacity = item.product?.capacity || ''
                const capacityNum = parseInt(capacity.replace(/\D/g, '')) || 0

                if (categoryName.includes('panel')) {
                  const existingPanel = loadedPanels.find(p =>
                    p.brand === (item.product?.brand || '') &&
                    p.model === (item.product?.model || item.product?.name || '')
                  )
                  if (existingPanel) {
                    existingPanel.quantity += item.quantity || 1
                  } else {
                    loadedPanels.push({
                      id: item.id,
                      brand: item.product?.brand || '',
                      model: item.product?.model || item.product?.name || '',
                      quantity: item.quantity || 1,
                      wattsPerPanel: capacityNum
                    })
                  }
                } else if (categoryName.includes('inversor') || categoryName.includes('inverter')) {
                  const existingInverter = loadedInverters.find(i =>
                    i.brand === (item.product?.brand || '') &&
                    i.model === (item.product?.model || item.product?.name || '')
                  )
                  if (existingInverter) {
                    existingInverter.quantity += item.quantity || 1
                  } else {
                    loadedInverters.push({
                      id: item.id,
                      brand: item.product?.brand || '',
                      model: item.product?.model || item.product?.name || '',
                      quantity: item.quantity || 1,
                      capacityWatts: capacityNum
                    })
                  }
                }
              })
            }
          })
        }

        if (loadedPanels.length > 0) {
          setPanels(loadedPanels)
        }
        if (loadedInverters.length > 0) {
          setInverters(loadedInverters)
        }

        // Fetch Growatt plants if credentials exist
        if (client.growattUsername && client.growattPassword) {
          fetchGrowattPlants(client.growattUsername, client.growattPassword, loadedPanels)
        }
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

  // Panel management functions
  const addPanel = () => {
    setPanels(prev => [...prev, {
      id: crypto.randomUUID(),
      brand: '',
      model: '',
      quantity: 1,
      wattsPerPanel: 0
    }])
  }

  const updatePanel = (id: string, field: keyof SolarPanel, value: string | number) => {
    setPanels(prev => prev.map(panel =>
      panel.id === id ? { ...panel, [field]: value } : panel
    ))
  }

  const removePanel = (id: string) => {
    setPanels(prev => prev.filter(panel => panel.id !== id))
  }

  // Inverter management functions
  const addInverter = () => {
    setInverters(prev => [...prev, {
      id: crypto.randomUUID(),
      brand: '',
      model: '',
      quantity: 1,
      capacityWatts: 0
    }])
  }

  const updateInverter = (id: string, field: keyof Inverter, value: string | number) => {
    setInverters(prev => prev.map(inverter =>
      inverter.id === id ? { ...inverter, [field]: value } : inverter
    ))
  }

  const removeInverter = (id: string) => {
    setInverters(prev => prev.filter(inverter => inverter.id !== id))
  }

  // Address management functions
  const addAddress = () => {
    const newAddressId = `temp-${crypto.randomUUID()}`
    const addressNumber = addresses.filter(a => !a._deleted).length + 1

    // Add the new address
    setAddresses(prev => [...prev, {
      id: newAddressId,
      name: `Dirección ${addressNumber}`,
      address: '',
      city: '',
      state: '',
      postalCode: '',
      neighborhood: '',
      isDefault: prev.length === 0,
      isActive: true
    }])

    // Also create a CFE receipt linked to this address
    setCfeReceipts(prev => [...prev, {
      id: `temp-${crypto.randomUUID()}`,
      addressId: newAddressId,
      name: `Medidor - Dirección ${addressNumber}`,
      rpu: '',
      serviceNumber: '',
      meterNumber: '',
      rmu: '',
      accountNumber: '',
      meterType: '',
      tariff: '',
      phases: 0,
      wires: 0,
      installedLoad: 0,
      contractedDemand: 0,
      voltageLevel: 0,
      mediumVoltage: false,
      cfeBranch: '',
      cfeFolio: '',
      receiptFileUrl: '',
      notes: ''
    }])
  }

  const updateAddress = (id: string, field: keyof ClientAddressData, value: string | boolean) => {
    setAddresses(prev => prev.map(addr => {
      if (addr.id === id) {
        // If setting this address as default, unset all others
        if (field === 'isDefault' && value === true) {
          return { ...addr, [field]: value }
        }
        return { ...addr, [field]: value }
      }
      // If setting another address as default, unset this one
      if (field === 'isDefault' && value === true) {
        return { ...addr, isDefault: false }
      }
      return addr
    }))
  }

  const removeAddress = (id: string) => {
    // If it's a temp address, just remove it
    if (id.startsWith('temp-')) {
      setAddresses(prev => prev.filter(addr => addr.id !== id))
      // Also remove temp CFE receipts linked to this address
      setCfeReceipts(prev => prev.filter(cfe =>
        !(cfe.addressId === id && cfe.id.startsWith('temp-'))
      ).map(cfe =>
        cfe.addressId === id ? { ...cfe, addressId: null } : cfe
      ))
    } else {
      // Mark for deletion
      setAddresses(prev => prev.map(addr =>
        addr.id === id ? { ...addr, _deleted: true } : addr
      ))
      // Mark linked CFE receipts for deletion or unlink them
      setCfeReceipts(prev => prev.map(cfe =>
        cfe.addressId === id ? { ...cfe, _deleted: true } : cfe
      ))
    }
  }

  // CFE Receipt (Medidor) management functions
  const addCfeReceipt = () => {
    setCfeReceipts(prev => [...prev, {
      id: `temp-${crypto.randomUUID()}`,
      addressId: addresses.find(a => a.isDefault && !a._deleted)?.id || null,
      name: `Medidor ${prev.length + 1}`,
      rpu: '',
      serviceNumber: '',
      meterNumber: '',
      rmu: '',
      accountNumber: '',
      meterType: '',
      tariff: '',
      phases: 0,
      wires: 0,
      installedLoad: 0,
      contractedDemand: 0,
      voltageLevel: 0,
      mediumVoltage: false,
      cfeBranch: '',
      cfeFolio: '',
      receiptFileUrl: '',
      notes: ''
    }])
  }

  const updateCfeReceipt = (id: string, field: keyof CfeReceiptData, value: string | number | boolean | null) => {
    setCfeReceipts(prev => prev.map(cfe =>
      cfe.id === id ? { ...cfe, [field]: value } : cfe
    ))
  }

  const removeCfeReceipt = (id: string) => {
    if (id.startsWith('temp-')) {
      setCfeReceipts(prev => prev.filter(cfe => cfe.id !== id))
    } else {
      setCfeReceipts(prev => prev.map(cfe =>
        cfe.id === id ? { ...cfe, _deleted: true } : cfe
      ))
    }
  }

  // CFE Receipt file upload handlers
  const processFileUpload = async (file: File) => {
    // Validate file type (PDF and images)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos PDF o imágenes (JPG, PNG)')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('El archivo no debe superar los 5MB')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${clientId}-${Date.now()}.${fileExt}`
      const filePath = `cfe-receipts/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Update form data
      handleInputChange('cfeReceiptFileUrl', publicUrl)
      toast.success('Archivo subido correctamente')

    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error al subir el archivo. Por favor intente de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFileUpload(file)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await processFileUpload(files[0])
    }
  }

  const handleRemoveFile = async () => {
    if (!formData.cfeReceiptFileUrl) return

    try {
      const supabase = createClient()

      // Extract file path from URL
      const url = new URL(formData.cfeReceiptFileUrl)
      const pathParts = url.pathname.split('/documents/')
      if (pathParts.length > 1) {
        const filePath = pathParts[1]

        // Delete from storage
        await supabase.storage
          .from('documents')
          .remove([filePath])
      }

      // Clear from form data
      handleInputChange('cfeReceiptFileUrl', '')

    } catch (error) {
      console.error('Error removing file:', error)
      // Still clear from form even if storage delete fails
      handleInputChange('cfeReceiptFileUrl', '')
    }
  }

  // Calculate totals for solar system
  const totalPanels = panels.reduce((sum, p) => sum + p.quantity, 0)
  const totalPanelCapacity = panels.reduce((sum, p) => sum + (p.quantity * p.wattsPerPanel), 0) / 1000 // kW
  const totalInverterCapacity = inverters.reduce((sum, i) => sum + (i.quantity * i.capacityWatts), 0) // W

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
        body: JSON.stringify({
          ...formData,
          addresses: addresses,
          cfeReceipts: cfeReceipts
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar cliente')
      }

      // Invalidate cache to refresh data
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

      // Show success toast notification
      toast.success('Datos guardados correctamente')
      
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
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Información</span>
            </TabsTrigger>
            <TabsTrigger value="cfe" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">CFE</span>
            </TabsTrigger>
            <TabsTrigger value="solar" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema Solar</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Mantenimientos</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: Información General */}
          <TabsContent value="general">
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
                  {formData.type === 'personal' && (
                    <div>
                      <Label htmlFor="identificationNumber">Número de INE/IFE</Label>
                      <Input
                        id="identificationNumber"
                        value={formData.identificationNumber}
                        onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                        placeholder="1234567890123"
                        maxLength={18}
                      />
                    </div>
                  )}
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Dirección Principal
                    </CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Dirección
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Main Address */}
                  <div className="grid gap-4 md:grid-cols-2">
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
                      <Select value={formData.state || undefined} onValueChange={(value) => handleInputChange('state', value)}>
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
                  </div>

                  {/* Additional Addresses */}
                  {addresses.filter(a => !a._deleted).length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium text-sm text-muted-foreground">Direcciones Adicionales</h4>
                      {addresses.filter(a => !a._deleted).map((addr) => (
                        <div key={addr.id} className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Input
                                value={addr.name}
                                onChange={(e) => updateAddress(addr.id, 'name', e.target.value)}
                                className="font-medium h-8 w-48"
                                placeholder="Nombre de la dirección"
                              />
                              {addr.isDefault && (
                                <Badge variant="secondary">Principal</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!addr.isDefault && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateAddress(addr.id, 'isDefault', true)}
                                  className="text-xs"
                                >
                                  Marcar como principal
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAddress(addr.id)}
                                className="text-destructive hover:text-destructive h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <Label className="text-xs">Calle y Número</Label>
                              <Input
                                value={addr.address}
                                onChange={(e) => updateAddress(addr.id, 'address', e.target.value)}
                                placeholder="Av. Reforma 123"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Colonia</Label>
                              <Input
                                value={addr.neighborhood}
                                onChange={(e) => updateAddress(addr.id, 'neighborhood', e.target.value)}
                                placeholder="Centro"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Ciudad</Label>
                              <Input
                                value={addr.city}
                                onChange={(e) => updateAddress(addr.id, 'city', e.target.value)}
                                placeholder="Colima"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Estado</Label>
                              <Select value={addr.state || undefined} onValueChange={(value) => updateAddress(addr.id, 'state', value)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEXICAN_STATES.map((state) => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">C.P.</Label>
                              <Input
                                value={addr.postalCode}
                                onChange={(e) => updateAddress(addr.id, 'postalCode', e.target.value)}
                                placeholder="28000"
                                className="h-8"
                                maxLength={5}
                              />
                            </div>
                          </div>
                          {/* CFE Meter indicator */}
                          {cfeReceipts.filter(c => !c._deleted && c.addressId === addr.id).length > 0 && (
                            <div className="mt-3 pt-3 border-t flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Zap className="h-4 w-4 text-yellow-600" />
                                <span className="text-muted-foreground">
                                  {cfeReceipts.filter(c => !c._deleted && c.addressId === addr.id).length} medidor(es) CFE asociado(s)
                                </span>
                              </div>
                              <span className="text-xs text-primary">
                                Ve a la pestaña CFE para completar los datos del medidor
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Status */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Estado del Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) => handleInputChange('isActive', value === 'active')}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: CFE - Medidores */}
          <TabsContent value="cfe">
            <div className="grid gap-6">
              {/* Medidores CFE Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Zap className="mr-2 h-5 w-5" />
                        Medidores CFE
                      </CardTitle>
                      <CardDescription>
                        Información de los medidores de luz del cliente
                      </CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addCfeReceipt}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Medidor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cfeReceipts.filter(c => !c._deleted).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No hay medidores registrados</p>
                      <p className="text-sm mt-2">Agrega medidores CFE para este cliente</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cfeReceipts.filter(c => !c._deleted).map((cfe, index) => (
                        <div key={cfe.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Input
                                value={cfe.name}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'name', e.target.value)}
                                className="font-medium h-8 w-48"
                                placeholder="Nombre del medidor"
                              />
                              <Select
                                value={cfe.addressId || 'main-address'}
                                onValueChange={(value) => updateCfeReceipt(cfe.id, 'addressId', value === 'main-address' ? null : value)}
                              >
                                <SelectTrigger className="h-8 w-56">
                                  <SelectValue placeholder="Seleccionar dirección" />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* Main address from clients table */}
                                  <SelectItem value="main-address">
                                    {formData.city || 'Dirección Principal'}
                                  </SelectItem>
                                  {/* Additional addresses from client_addresses */}
                                  {addresses.filter(a => !a._deleted).map((addr) => (
                                    <SelectItem key={addr.id} value={addr.id}>
                                      {addr.name || addr.city || 'Sin nombre'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCfeReceipt(cfe.id)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* File Upload for this meter */}
                          <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                            {cfe.receiptFileUrl ? (
                              <div className="flex items-center gap-3">
                                <File className="h-5 w-5 text-primary" />
                                <span className="text-sm flex-1">Recibo CFE subido</span>
                                <a
                                  href={cfe.receiptFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Ver
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateCfeReceipt(cfe.id, 'receiptFileUrl', '')}
                                  className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <input
                                  type="file"
                                  id={`cfeFile-${cfe.id}`}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    setUploadingMeterIndex(index)
                                    try {
                                      const supabase = createClient()
                                      const fileExt = file.name.split('.').pop()
                                      const fileName = `${clientId}-${cfe.id}-${Date.now()}.${fileExt}`
                                      const filePath = `cfe-receipts/${fileName}`
                                      const { error } = await supabase.storage.from('documents').upload(filePath, file, { cacheControl: '3600', upsert: true })
                                      if (error) throw error
                                      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)
                                      updateCfeReceipt(cfe.id, 'receiptFileUrl', publicUrl)
                                      toast.success('Archivo subido correctamente')
                                    } catch (err) {
                                      console.error('Error uploading:', err)
                                      toast.error('Error al subir archivo')
                                    } finally {
                                      setUploadingMeterIndex(null)
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`cfeFile-${cfe.id}`}
                                  className="cursor-pointer flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  {uploadingMeterIndex === index ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                  {uploadingMeterIndex === index ? 'Subiendo...' : 'Subir recibo CFE'}
                                </label>
                              </div>
                            )}
                          </div>

                          {/* CFE Data Fields */}
                          <div className="grid gap-3 md:grid-cols-4">
                            <div>
                              <Label className="text-xs">RPU</Label>
                              <Input
                                value={cfe.rpu}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'rpu', e.target.value)}
                                placeholder="208190705269"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">N° de Servicio</Label>
                              <Input
                                value={cfe.serviceNumber}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'serviceNumber', e.target.value)}
                                placeholder="123456789012"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">N° Medidor</Label>
                              <Input
                                value={cfe.meterNumber}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'meterNumber', e.target.value)}
                                placeholder="25T73E"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">RMU</Label>
                              <Input
                                value={cfe.rmu}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'rmu', e.target.value)}
                                placeholder="28610 25-06-27..."
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">N° Cuenta CFE</Label>
                              <Input
                                value={cfe.accountNumber}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'accountNumber', e.target.value)}
                                placeholder="19DF25E031920760"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tipo Medidor</Label>
                              <Select value={cfe.meterType || undefined} onValueChange={(value) => updateCfeReceipt(cfe.id, 'meterType', value)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Digital">Digital</SelectItem>
                                  <SelectItem value="Analógico">Analógico</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Tarifa</Label>
                              <Select value={cfe.tariff || undefined} onValueChange={(value) => updateCfeReceipt(cfe.id, 'tariff', value)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="1A">1A</SelectItem>
                                  <SelectItem value="1B">1B</SelectItem>
                                  <SelectItem value="1C">1C</SelectItem>
                                  <SelectItem value="1D">1D</SelectItem>
                                  <SelectItem value="1E">1E</SelectItem>
                                  <SelectItem value="1F">1F</SelectItem>
                                  <SelectItem value="DAC">DAC</SelectItem>
                                  <SelectItem value="PDBT">PDBT</SelectItem>
                                  <SelectItem value="GDBT">GDBT</SelectItem>
                                  <SelectItem value="GDMTH">GDMTH</SelectItem>
                                  <SelectItem value="GDMTO">GDMTO</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">N° Fases</Label>
                              <Input
                                type="number"
                                min="1"
                                max="3"
                                value={cfe.phases || ''}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'phases', parseInt(e.target.value) || 0)}
                                placeholder="2"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">N° Hilos</Label>
                              <Input
                                type="number"
                                min="1"
                                max="4"
                                value={cfe.wires || ''}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'wires', parseInt(e.target.value) || 0)}
                                placeholder="3"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Carga Instalada (kW)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={cfe.installedLoad || ''}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'installedLoad', parseFloat(e.target.value) || 0)}
                                placeholder="3"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Demanda Contratada (kW)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={cfe.contractedDemand || ''}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'contractedDemand', parseFloat(e.target.value) || 0)}
                                placeholder="3"
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Nivel Tensión (V)</Label>
                              <Select
                                value={cfe.voltageLevel ? String(cfe.voltageLevel) : 'N/A'}
                                onValueChange={(value) => {
                                  updateCfeReceipt(cfe.id, 'voltageLevel', value === 'N/A' ? 0 : parseFloat(value))
                                  if (value !== '13200') {
                                    updateCfeReceipt(cfe.id, 'mediumVoltage', false)
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="N/A">N/A</SelectItem>
                                  <SelectItem value="110">110</SelectItem>
                                  <SelectItem value="220">220</SelectItem>
                                  <SelectItem value="13200">13200</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-5">
                              <Checkbox
                                id={`mediumVoltage-${cfe.id}`}
                                checked={cfe.mediumVoltage}
                                onCheckedChange={(checked) => {
                                  updateCfeReceipt(cfe.id, 'mediumVoltage', checked === true)
                                  if (checked === true) {
                                    updateCfeReceipt(cfe.id, 'voltageLevel', 13200)
                                  }
                                }}
                              />
                              <Label htmlFor={`mediumVoltage-${cfe.id}`} className="text-xs cursor-pointer">Media Tensión</Label>
                            </div>
                            <div>
                              <Label className="text-xs">Sucursal CFE</Label>
                              <Select value={cfe.cfeBranch || 'N/A'} onValueChange={(value) => updateCfeReceipt(cfe.id, 'cfeBranch', value === 'N/A' ? '' : value)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="N/A">N/A</SelectItem>
                                  <SelectItem value="CD GUZMAN">CD GUZMAN</SelectItem>
                                  <SelectItem value="Colima">Colima</SelectItem>
                                  <SelectItem value="Manzanillo">Manzanillo</SelectItem>
                                  <SelectItem value="Tecoman">Tecoman</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Folio CFE</Label>
                              <Input
                                value={cfe.cfeFolio}
                                onChange={(e) => updateCfeReceipt(cfe.id, 'cfeFolio', e.target.value)}
                                placeholder="Folio"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Datos de Contacto Anexo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Datos de Contacto Anexo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-4 text-sm">
                    <div>
                      <span className="text-gray-500">Nombre:</span>
                      <p className="font-medium">{contactSettings.contact_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Puesto:</span>
                      <p className="font-medium">{contactSettings.contact_position || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Domicilio:</span>
                      <p className="font-medium">{contactSettings.contact_address || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Colonia:</span>
                      <p className="font-medium">{contactSettings.contact_neighborhood || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Municipio:</span>
                      <p className="font-medium">{contactSettings.contact_city || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estado:</span>
                      <p className="font-medium">{contactSettings.contact_state || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">C.P.:</span>
                      <p className="font-medium">{contactSettings.contact_postal_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Teléfono:</span>
                      <p className="font-medium">{contactSettings.contact_phone || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-500">Correo:</span>
                      <p className="font-medium">{contactSettings.contact_email || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Sistema Solar */}
          <TabsContent value="solar">
            <div className="grid gap-6">
              {/* Growatt Plants Section */}
              {(growattPlants.length > 0 || loadingGrowatt) && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <Zap className="mr-2 h-5 w-5 text-green-500" />
                          Plantas Growatt
                        </CardTitle>
                        <CardDescription>
                          Sistemas detectados desde Growatt
                        </CardDescription>
                      </div>
                      {growattPlants.length > 0 && (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <span className="text-muted-foreground">Total Plantas:</span>
                            <span className="ml-2 font-bold">{growattPlants.length}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Capacidad Total:</span>
                            <span className="ml-2 font-bold">
                              {growattPlants.reduce((sum, p) => {
                                const cap = parseFloat(p.capacity?.replace(/[^\d.]/g, '') || '0')
                                return sum + cap
                              }, 0).toFixed(2)} kW
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingGrowatt ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span className="text-muted-foreground">Cargando plantas de Growatt...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {growattPlants.map((plant, index) => (
                          <div
                            key={plant.plantId || index}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <div>
                                <p className="font-medium">{plant.plantName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Capacidad: {plant.capacity || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600">
                                Hoy: {plant.todayEnergy || '0'} kWh
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Total: {plant.totalEnergy || '0'} kWh
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Paneles Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Sun className="mr-2 h-5 w-5" />
                        Paneles
                      </CardTitle>
                      <CardDescription>
                        Información de los paneles solares instalados
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <span className="text-muted-foreground">N° Paneles:</span>
                        <span className="ml-2 font-bold">{totalPanels}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Capacidad Instalada:</span>
                        <span className="ml-2 font-bold">{totalPanelCapacity.toFixed(2)} kW</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {panels.length > 0 && (
                    <div className="border rounded-lg overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Marca Panel</th>
                            <th className="px-4 py-2 text-left font-medium">Cantidad</th>
                            <th className="px-4 py-2 text-left font-medium">Modelo Panel</th>
                            <th className="px-4 py-2 text-left font-medium">Watts por Panel</th>
                            <th className="px-4 py-2 text-left font-medium">Capacidad</th>
                            <th className="px-4 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {panels.map((panel) => (
                            <tr key={panel.id} className="border-t">
                              <td className="px-4 py-2">
                                <Input
                                  value={panel.brand}
                                  onChange={(e) => updatePanel(panel.id, 'brand', e.target.value)}
                                  placeholder="Canadian Solar"
                                  className="h-8"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={panel.quantity}
                                  onChange={(e) => updatePanel(panel.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-8 w-20"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  value={panel.model}
                                  onChange={(e) => updatePanel(panel.id, 'model', e.target.value)}
                                  placeholder="CS6R-410MS"
                                  className="h-8"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={panel.wattsPerPanel}
                                  onChange={(e) => updatePanel(panel.id, 'wattsPerPanel', parseInt(e.target.value) || 0)}
                                  placeholder="410"
                                  className="h-8 w-24"
                                />
                              </td>
                              <td className="px-4 py-2 font-medium">
                                {((panel.quantity * panel.wattsPerPanel) / 1000).toFixed(2)} kW
                              </td>
                              <td className="px-4 py-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePanel(panel.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={addPanel}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Panel
                  </Button>
                </CardContent>
              </Card>

              {/* Inversores Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Zap className="mr-2 h-5 w-5" />
                        Inversores
                      </CardTitle>
                      <CardDescription>
                        Información de los inversores instalados
                      </CardDescription>
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-muted-foreground">Capacidad Inversor(es):</span>
                      <span className="ml-2 font-bold">{totalInverterCapacity.toLocaleString()} W</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {inverters.length > 0 && (
                    <div className="border rounded-lg overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Cantidad</th>
                            <th className="px-4 py-2 text-left font-medium">Marca Inversor</th>
                            <th className="px-4 py-2 text-left font-medium">Modelo Inversor</th>
                            <th className="px-4 py-2 text-left font-medium">Capacidad (W)</th>
                            <th className="px-4 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {inverters.map((inverter) => (
                            <tr key={inverter.id} className="border-t">
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={inverter.quantity}
                                  onChange={(e) => updateInverter(inverter.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-8 w-20"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Select
                                  value={inverter.brand}
                                  onValueChange={(value) => updateInverter(inverter.id, 'brand', value)}
                                >
                                  <SelectTrigger className="h-8">
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
                              <td className="px-4 py-2">
                                <Input
                                  value={inverter.model}
                                  onChange={(e) => updateInverter(inverter.id, 'model', e.target.value)}
                                  placeholder="MIN 6000TL-X"
                                  className="h-8"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={inverter.capacityWatts}
                                  onChange={(e) => updateInverter(inverter.id, 'capacityWatts', parseInt(e.target.value) || 0)}
                                  placeholder="6000"
                                  className="h-8 w-28"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeInverter(inverter.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={addInverter}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Inversor
                  </Button>
                </CardContent>
              </Card>

              {/* Monthly Generation */}
              <Card>
                <CardHeader>
                  <CardTitle>Gen. Mensual</CardTitle>
                  <CardDescription>
                    Generación mensual estimada del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-48">
                      <Label htmlFor="monthlyGeneration">KWH/MES</Label>
                      <Input
                        id="monthlyGeneration"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthlyGeneration || ''}
                        onChange={(e) => handleInputChange('monthlyGeneration', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground pt-6">
                      kWh esperados por mes
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Mantenimientos */}
          <TabsContent value="maintenance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Wrench className="mr-2 h-5 w-5" />
                    Mantenimientos
                  </CardTitle>
                  <CardDescription>
                    Historial de mantenimientos del cliente
                  </CardDescription>
                </div>
                <Link href={`/maintenance?clientId=${clientId}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Mantenimiento
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loadingMaintenances ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : maintenances.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No hay mantenimientos registrados para este cliente.</p>
                    <p className="text-sm mt-2">
                      Puede crear uno desde la sección de{' '}
                      <Link href="/maintenance" className="text-primary hover:underline">
                        Mantenimientos
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenances.map((maintenance) => (
                      <Link
                        key={maintenance.id}
                        href={`/maintenance/${maintenance.id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{maintenance.title}</span>
                              <Badge variant={
                                maintenance.status === 'COMPLETED' ? 'default' :
                                maintenance.status === 'IN_PROGRESS' ? 'secondary' :
                                maintenance.status === 'SCHEDULED' ? 'outline' :
                                maintenance.status === 'CANCELLED' ? 'destructive' :
                                'secondary'
                              }>
                                {maintenance.status === 'PENDING_APPROVAL' && 'Pendiente'}
                                {maintenance.status === 'SCHEDULED' && 'Programado'}
                                {maintenance.status === 'IN_PROGRESS' && 'En Progreso'}
                                {maintenance.status === 'COMPLETED' && 'Completado'}
                                {maintenance.status === 'CANCELLED' && 'Cancelado'}
                              </Badge>
                              <Badge variant="outline">
                                {maintenance.type === 'PREVENTIVE' && 'Preventivo'}
                                {maintenance.type === 'CORRECTIVE' && 'Correctivo'}
                                {maintenance.type === 'WARRANTY' && 'Garantía'}
                                {maintenance.type === 'CLEANING' && 'Limpieza'}
                              </Badge>
                            </div>
                            {maintenance.technicians.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Técnico: {maintenance.technicians.map(t => t.technician.name).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            {maintenance.scheduledDate && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(maintenance.scheduledDate), "dd/MM/yyyy", { locale: es })}
                              </div>
                            )}
                            {maintenance.status === 'COMPLETED' && maintenance.completedDate && (
                              <div className="flex items-center gap-1 text-green-600 mt-1">
                                <CheckCircle2 className="h-4 w-4" />
                                {format(new Date(maintenance.completedDate), "dd/MM/yyyy", { locale: es })}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Notas */}
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StickyNote className="mr-2 h-5 w-5" />
                  Notas
                </CardTitle>
                <CardDescription>
                  Notas y observaciones sobre el cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Escribe notas adicionales sobre el cliente aquí..."
                  rows={10}
                  className="resize-none"
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
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}