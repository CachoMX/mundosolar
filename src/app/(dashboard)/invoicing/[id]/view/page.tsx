'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, User, Calendar, MapPin, Phone, Mail, Stamp, X, Download, Edit, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  subtotal: number
  iva: number
  total: number
  status: string
  metodoPago: string
  formaPago: string
  usoCFDI: string
  issuedAt: string | null
  createdAt: string
  notes: string | null
  order: {
    client: {
      firstName: string
      lastName: string
      email: string
      phone?: string
      address?: string
      city?: string
      state?: string
      rfc?: string
      regimenFiscal?: string
    }
  }
  invoiceItems: {
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }[]
}

export default function InvoiceViewPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice()
    }
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      const result = await response.json()
      
      if (result.success) {
        setInvoice(result.data)
      } else {
        throw new Error(result.error || 'Factura no encontrada')
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
      alert(error instanceof Error ? error.message : 'Error al cargar factura')
      router.push('/invoicing')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return { variant: 'outline' as const, label: 'Pendiente' }
      case 'ISSUED': return { variant: 'default' as const, label: 'Timbrada' }
      case 'PAID': return { variant: 'secondary' as const, label: 'Pagada' }
      case 'CANCELLED': return { variant: 'destructive' as const, label: 'Cancelada' }
      case 'OVERDUE': return { variant: 'destructive' as const, label: 'Vencida' }
      default: return { variant: 'outline' as const, label: 'Desconocido' }
    }
  }

  const handleTimbrar = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/timbrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setInvoice(result.data)
        alert('Factura timbrada exitosamente')
      } else {
        alert(result.error || 'Error al timbrar factura')
      }
    } catch (error) {
      console.error('Error timbrar invoice:', error)
      alert('Error al timbrar factura')
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Está seguro de cancelar esta factura?')) return
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setInvoice(result.data)
        alert('Factura cancelada exitosamente')
      } else {
        alert(result.error || 'Error al cancelar factura')
      }
    } catch (error) {
      console.error('Error canceling invoice:', error)
      alert('Error al cancelar factura')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cargando factura...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">Factura no encontrada</h3>
          <Link href="/invoicing">
            <Button>Volver a Facturación</Button>
          </Link>
        </div>
      </div>
    )
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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge {...getStatusBadge(invoice.status)}>
                {getStatusBadge(invoice.status).label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Creada el {new Date(invoice.createdAt).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {invoice.status === 'PENDING' && (
            <>
              <Link href={`/invoicing/${invoice.id}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <Button onClick={handleTimbrar} className="bg-green-600 hover:bg-green-700">
                <Stamp className="mr-2 h-4 w-4" />
                Timbrar
              </Button>
              <Button onClick={handleCancel} variant="destructive">
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </>
          )}
          {invoice.status === 'ISSUED' && (
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold">{invoice.order.client.firstName} {invoice.order.client.lastName}</p>
              {invoice.order.client.rfc && (
                <p className="text-sm text-muted-foreground">RFC: {invoice.order.client.rfc}</p>
              )}
              {invoice.order.client.regimenFiscal && (
                <p className="text-sm text-muted-foreground">Régimen Fiscal: {invoice.order.client.regimenFiscal}</p>
              )}
            </div>
            
            {invoice.order.client.email && (
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{invoice.order.client.email}</span>
              </div>
            )}
            
            {invoice.order.client.phone && (
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{invoice.order.client.phone}</span>
              </div>
            )}
            
            {(invoice.order.client.address || invoice.order.client.city) && (
              <div className="flex items-start space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {invoice.order.client.address && <p>{invoice.order.client.address}</p>}
                  {invoice.order.client.city && invoice.order.client.state && (
                    <p>{invoice.order.client.city}, {invoice.order.client.state}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Información SAT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Método de Pago</p>
                <p className="text-muted-foreground">{invoice.metodoPago}</p>
              </div>
              <div>
                <p className="font-medium">Forma de Pago</p>
                <p className="text-muted-foreground">{invoice.formaPago}</p>
              </div>
              <div>
                <p className="font-medium">Uso CFDI</p>
                <p className="text-muted-foreground">{invoice.usoCFDI}</p>
              </div>
              <div>
                <p className="font-medium">Fecha Emisión</p>
                <p className="text-muted-foreground">
                  {new Date(invoice.createdAt).toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>
            
            {invoice.issuedAt && (
              <div className="pt-2 border-t">
                <p className="font-medium text-sm">Fecha Timbrado</p>
                <p className="text-muted-foreground text-sm">
                  {new Date(invoice.issuedAt).toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Productos/Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoice.invoiceItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Cantidad: {item.quantity} × ${Number(item.unitPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(item.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="mt-6 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${Number(invoice.subtotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (16%):</span>
                <span>${Number(invoice.iva).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${Number(invoice.total).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}