'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Loader2,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface FinanceSummary {
  monthlyRevenue: number
  lastMonthRevenue: number
  totalRevenue: number
  monthlyExpenses: number
  netProfit: number
  profitMargin: number
  accountsReceivable: number
  paidThisMonth: number
  inventoryValue: number
}

interface PendingInvoice {
  id: string
  invoiceNumber: string
  client: string
  total: number
  status: string
  createdAt: string
}

interface Transaction {
  id: string
  orderNumber: string
  client: string
  total: number
  status: string
  date: string
}

interface MonthlyTrend {
  month: string
  revenue: number
}

export default function FinancesPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFinances()
  }, [])

  const fetchFinances = async () => {
    try {
      const response = await fetch('/api/finances')
      const result = await response.json()

      if (result.success) {
        setSummary(result.data.summary)
        setPendingInvoices(result.data.pendingInvoices)
        setRecentTransactions(result.data.recentTransactions)
        setMonthlyTrend(result.data.monthlyTrend)
      } else {
        setError(result.error || 'Error al cargar datos financieros')
      }
    } catch (err) {
      console.error('Error fetching finances:', err)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getRevenueChange = () => {
    if (!summary || summary.lastMonthRevenue === 0) return 0
    return ((summary.monthlyRevenue - summary.lastMonthRevenue) / summary.lastMonthRevenue) * 100
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      'PENDING': { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      'ISSUED': { label: 'Emitida', className: 'bg-blue-100 text-blue-800' },
      'OVERDUE': { label: 'Vencida', className: 'bg-red-100 text-red-800' },
      'PAID': { label: 'Pagada', className: 'bg-green-100 text-green-800' },
      'COMPLETED': { label: 'Completada', className: 'bg-green-100 text-green-800' },
      'DELIVERED': { label: 'Entregada', className: 'bg-blue-100 text-blue-800' },
      'CONFIRMED': { label: 'Confirmada', className: 'bg-purple-100 text-purple-800' }
    }
    const statusConfig = config[status] || { label: status, className: '' }
    return <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando datos financieros...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchFinances}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const revenueChange = getRevenueChange()

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Finanzas</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(summary?.monthlyRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {revenueChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(revenueChange).toFixed(1)}%
              </span>
              <span className="ml-1">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(summary?.monthlyExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Mantenimientos y operación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.netProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen: {summary?.profitMargin || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(summary?.accountsReceivable || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Facturas pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Ingresos totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobrado Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(summary?.paidThisMonth || 0)}</div>
            <p className="text-xs text-muted-foreground">Facturas pagadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(summary?.inventoryValue || 0)}</div>
            <p className="text-xs text-muted-foreground">Stock actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Ingresos (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {monthlyTrend.map((month, index) => {
              const maxRevenue = Math.max(...monthlyTrend.map(m => m.revenue), 1)
              const height = (month.revenue / maxRevenue) * 100
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <span className="text-xs mt-2 text-muted-foreground">{month.month}</span>
                  <span className="text-xs font-medium">
                    {formatCurrency(month.revenue)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pending Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Facturas Pendientes
            </CardTitle>
            <CardDescription>Cuentas por cobrar</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No hay facturas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{invoice.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(invoice.total)}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Transacciones Recientes
            </CardTitle>
            <CardDescription>Últimas operaciones</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>No hay transacciones recientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{tx.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{tx.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(tx.total)}</p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
