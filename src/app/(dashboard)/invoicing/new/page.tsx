'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Plus, Trash2, Calculator, FileText, User } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  rfc?: string
  regimenFiscal?: string
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface InvoiceFormData {
  clientId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  metodoPago: string
  formaPago: string
  usoCFDI: string
  items: InvoiceItem[]
  subtotal: number
  iva: number
  total: number
  notes: string
}

const METODO_PAGO = [
  { value: 'PUE', label: 'PUE - Pago en una Sola Exhibición' },
  { value: 'PPD', label: 'PPD - Pago en Parcialidades o Diferido' }
]

const FORMA_PAGO = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque Nominativo' },
  { value: '03', label: '03 - Transferencia Electrónica' },
  { value: '04', label: '04 - Tarjeta de Crédito' },
  { value: '05', label: '05 - Monedero Electrónico' },
  { value: '28', label: '28 - Tarjeta de Débito' },
  { value: '29', label: '29 - Tarjeta de Servicios' }
]

const USO_CFDI = [
  { value: 'G01', label: 'G01 - Adquisición de Mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, Descuentos o Bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en General' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobilario y Equipo de Oficina' },
  { value: 'I03', label: 'I03 - Equipo de Transporte' },
  { value: 'I04', label: 'I04 - Equipo de Computo y Accesorios' },
  { value: 'I05', label: 'I05 - Dados, Troqueles, Moldes' },
  { value: 'I06', label: 'I06 - Comunicaciones Telefónicas' },
  { value: 'I07', label: 'I07 - Comunicaciones Satelitales' },
  { value: 'I08', label: 'I08 - Otra Maquinaria y Equipo' },
  { value: 'D01', label: 'D01 - Honorarios Médicos, Dentales' },
  { value: 'D02', label: 'D02 - Gastos Médicos por Incapacidad' },
  { value: 'D03', label: 'D03 - Gastos Funerales' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'D05', label: 'D05 - Intereses Reales Hipotecarios' },
  { value: 'D06', label: 'D06 - Aportaciones Voluntarias al SAR' },
  { value: 'D07', label: 'D07 - Primas por Seguros de Gastos Médicos' },
  { value: 'D08', label: 'D08 - Gastos de Transportación Escolar' },
  { value: 'D09', label: 'D09 - Depósitos en Cuentas para el Ahorro' },
  { value: 'D10', label: 'D10 - Pagos por Servicios Educativos' },
  { value: 'P01', label: 'P01 - Por Definir' }
]

export default function NewInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    metodoPago: 'PUE',
    formaPago: '03',
    usoCFDI: 'G01',
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, amount: 0 }],
    subtotal: 0,
    iva: 0,
    total: 0,
    notes: ''
  })

  useEffect(() => {
    fetchClients()
    generateInvoiceNumber()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const result = await response.json()
      
      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const generateInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    setFormData(prev => ({
      ...prev,
      invoiceNumber: `FAC-${year}${month}${day}-${random}`
    }))
  }

  const handleInputChange = (field: keyof InvoiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }
          
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice
          }
          
          return updatedItem
        }
        return item
      })

      // Recalculate totals
      const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
      const iva = subtotal * 0.16
      const total = subtotal + iva

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        iva,
        total
      }
    })
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItem = (itemId: string) => {
    if (formData.items.length === 1) return // Keep at least one item

    setFormData(prev => {
      const updatedItems = prev.items.filter(item => item.id !== itemId)
      
      // Recalculate totals
      const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
      const iva = subtotal * 0.16
      const total = subtotal + iva

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        iva,
        total
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate required fields
      if (!formData.clientId || !formData.invoiceNumber || formData.items.length === 0) {
        throw new Error('Cliente, número de factura y al menos un producto son requeridos')
      }

      // Validate items
      const invalidItems = formData.items.filter(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0)
      if (invalidItems.length > 0) {
        throw new Error('Todos los productos deben tener descripción, cantidad y precio válidos')
      }

      // Create invoice via API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear factura')
      }

      // Redirect back to invoicing list
      router.push('/invoicing')
      
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert(error instanceof Error ? error.message : 'Error al crear factura')
    } finally {
      setSaving(false)
    }
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client ? `${client.firstName} ${client.lastName}` : ''
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/invoicing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Facturación
            </Button>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Nueva Factura</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Invoice Header */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Información de la Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="clientId">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => handleInputChange('clientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{client.firstName} {client.lastName}</span>
                          {client.rfc && <span className="text-muted-foreground">({client.rfc})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoiceNumber">Número de Factura *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  placeholder="FAC-20240101-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="issueDate">Fecha de Emisión *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleInputChange('issueDate', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* SAT Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información SAT</CardTitle>
              <CardDescription>
                Datos requeridos para cumplimiento fiscal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metodoPago">Método de Pago</Label>
                <Select value={formData.metodoPago} onValueChange={(value) => handleInputChange('metodoPago', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODO_PAGO.map((metodo) => (
                      <SelectItem key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="formaPago">Forma de Pago</Label>
                <Select value={formData.formaPago} onValueChange={(value) => handleInputChange('formaPago', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMA_PAGO.map((forma) => (
                      <SelectItem key={forma.value} value={forma.value}>
                        {forma.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="usoCFDI">Uso CFDI</Label>
                <Select value={formData.usoCFDI} onValueChange={(value) => handleInputChange('usoCFDI', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USO_CFDI.map((uso) => (
                      <SelectItem key={uso.value} value={uso.value}>
                        {uso.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">${formData.subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span className="font-medium">${formData.iva.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${formData.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Productos/Servicios</CardTitle>
                <CardDescription>
                  Agrega los productos o servicios a facturar
                </CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                    <div className="col-span-5">
                      <Label htmlFor={`description-${item.id}`}>Descripción *</Label>
                      <Input
                        id={`description-${item.id}`}
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Descripción del producto/servicio"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`quantity-${item.id}`}>Cantidad *</Label>
                      <Input
                        id={`quantity-${item.id}`}
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`unitPrice-${item.id}`}>Precio Unitario *</Label>
                      <Input
                        id={`unitPrice-${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Importe</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm">
                        ${item.amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notas y Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales para la factura..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/invoicing">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Creando...' : 'Crear Factura'}
          </Button>
        </div>
      </form>
    </div>
  )
}