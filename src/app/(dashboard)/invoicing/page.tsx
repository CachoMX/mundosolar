'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, DollarSign, AlertCircle, CheckCircle, Loader2, Eye, Edit, Calendar, User, MoreVertical, Stamp, X, Download } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  subtotal: number
  iva: number
  total: number
  status: string
  issuedAt: string | null
  createdAt: string
  order: {
    client: {
      firstName: string
      lastName: string
      email: string
      rfc?: string
    }
  }
  invoiceItems: {
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }[]
}

const fetchInvoices = async (): Promise<Invoice[]> => {
  const response = await fetch('/api/invoices')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al cargar facturas')
  }
  return result.data
}

export default function InvoicingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: invoices = [], isLoading: loading } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500'
      case 'ISSUED': return 'text-green-500'
      case 'PAID': return 'text-blue-500'
      case 'CANCELLED': return 'text-red-500'
      case 'OVERDUE': return 'text-red-500'
      default: return 'text-gray-500'
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

  // Calculate statistics
  const pendingInvoices = invoices.filter(i => i.status === 'PENDING')
  const issuedInvoices = invoices.filter(i => i.status === 'ISSUED')
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total), 0)
  const totalIva = invoices.reduce((sum, i) => sum + Number(i.iva), 0)

  const handleTimbrar = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/timbrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        // Refresh invoices
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        alert('Factura timbrada exitosamente')
      } else {
        alert(result.error || 'Error al timbrar factura')
      }
    } catch (error) {
      console.error('Error timbrar invoice:', error)
      alert('Error al timbrar factura')
    }
  }

  const handleCancel = async (invoiceId: string) => {
    if (!confirm('¿Está seguro de cancelar esta factura?')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        // Refresh invoices
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        alert('Factura cancelada exitosamente')
      } else {
        alert(result.error || 'Error al cancelar factura')
      }
    } catch (error) {
      console.error('Error canceling invoice:', error)
      alert('Error al cancelar factura')
    }
  }

  const handleDownload = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `factura-${invoiceId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Error al descargar factura')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Error al descargar factura')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Facturación</h2>
        <Link href="/invoicing/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              Por timbrar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timbradas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{issuedInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              Facturadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalInvoiced.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.length} facturas totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Recaudado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalIva.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </div>
            <p className="text-xs text-muted-foreground">
              16% IVA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Facturas</CardTitle>
          <CardDescription>
            {invoices.length} {invoices.length === 1 ? 'factura registrada' : 'facturas registradas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Cargando facturas...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No hay facturas registradas</h3>
              <p>Comience creando su primera factura.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div 
                    className="flex items-center space-x-4 flex-1 cursor-pointer" 
                    onClick={() => router.push(`/invoicing/${invoice.id}/view`)}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                        <Badge {...getStatusBadge(invoice.status)}>
                          {getStatusBadge(invoice.status).label}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{invoice.order.client.firstName} {invoice.order.client.lastName}</span>
                        </div>
                        {invoice.order.client.rfc && (
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{invoice.order.client.rfc}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(invoice.createdAt).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                      {invoice.invoiceItems.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {invoice.invoiceItems.length} {invoice.invoiceItems.length === 1 ? 'producto' : 'productos'}: {invoice.invoiceItems[0].description}
                          {invoice.invoiceItems.length > 1 && ` +${invoice.invoiceItems.length - 1} más`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        ${Number(invoice.total).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Subtotal: ${Number(invoice.subtotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        IVA: ${Number(invoice.iva).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </div>
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {invoice.status === 'PENDING' && (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTimbrar(invoice.id)
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Stamp className="h-4 w-4 mr-1" />
                          Timbrar
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => router.push(`/invoicing/${invoice.id}/view`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          
                          {invoice.status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => router.push(`/invoicing/${invoice.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          
                          {invoice.status === 'ISSUED' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              handleDownload(invoice.id)
                            }}>
                              <Download className="mr-2 h-4 w-4" />
                              Descargar PDF
                            </DropdownMenuItem>
                          )}
                          
                          {invoice.status === 'PENDING' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancel(invoice.id)
                                }}
                                className="text-red-600"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sistema de Facturación SAT</CardTitle>
          <CardDescription>
            Cumplimiento total con la normatividad fiscal mexicana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Facturación Electrónica</h3>
            <p>Características del sistema:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Generación automática de XML y PDF</li>
              <li>Timbrado en tiempo real con PAC certificado</li>
              <li>Validación de RFC y códigos postales</li>
              <li>Manejo de complementos (Carta Porte, etc.)</li>
              <li>Cancelación de facturas</li>
              <li>Reportes para declaraciones fiscales</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}