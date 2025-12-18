'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Loader2,
  RefreshCw,
  Users,
  FileText,
  ArrowUpRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Receipt,
  BarChart3,
  PieChart
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import Link from 'next/link'

interface FinanceData {
  summary: {
    totalIncome: number
    totalReceived: number
    totalCOGS: number
    netProfit: number
    profitMargin: number
    cashFlow: number
    period: string
  }
  accountsReceivable: {
    current: number
    days31to60: number
    days61to90: number
    over90: number
    total: number
    details: {
      id: string
      orderId: string
      orderNumber: string
      clientName: string
      amount: number
      dueDate: string | null
      daysOverdue: number
      installmentNumber: number | null
    }[]
  }
  monthlyTrends: {
    month: string
    income: number
    received: number
    orders: number
  }[]
  ordersByStatus: {
    status: string
    count: number
    total: number
  }[]
  ordersByType: {
    type: string
    count: number
    total: number
  }[]
  paymentsByMethod: {
    method: string
    count: number
    total: number
  }[]
  topClients: {
    client: {
      id: string
      firstName: string
      lastName: string
    }
    total: number
    amountPaid: number
  }[]
  recentPayments: {
    id: string
    amount: number
    paymentMethod: string
    paymentType: string
    paidAt: string
    orderNumber: string
    clientName: string
  }[]
  invoiceStats: {
    status: string
    count: number
    total: number
  }[]
}

interface Order {
  id: string
  orderNumber: string
  client: {
    firstName: string
    lastName: string
  }
  total: number
  balanceDue: number
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatCurrencyFull = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(amount)
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  INSTALLATION: 'Instalación',
  MAINTENANCE: 'Mantenimiento',
  WARRANTY: 'Garantía'
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque'
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Anticipo',
  PARTIAL: 'Abono',
  FINAL: 'Liquidación',
  INSTALLMENT: 'Cuota',
  REFUND: 'Reembolso'
}

export default function FinancesPage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('month')
  const [refreshing, setRefreshing] = useState(false)

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER')
  const [paymentType, setPaymentType] = useState('PARTIAL')
  const [paymentReference, setPaymentReference] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const response = await fetch(`/api/finances/dashboard?period=${period}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Error al cargar datos')
      }
    } catch (err) {
      console.error('Error fetching finance data:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=active')
      const result = await response.json()
      if (result.success) {
        // Filter orders with balance due
        const ordersWithBalance = result.data.filter((o: any) => Number(o.balanceDue) > 0)
        setOrders(ordersWithBalance)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period])

  const handleOpenPaymentModal = () => {
    fetchOrders()
    setPaymentModalOpen(true)
  }

  const handleSavePayment = async () => {
    if (!selectedOrderId || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Selecciona una orden e ingresa un monto válido')
      return
    }

    setSavingPayment(true)
    try {
      const response = await fetch('/api/finances/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrderId,
          amount: paymentAmount,
          paymentType,
          paymentMethod,
          referenceNumber: paymentReference || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setPaymentModalOpen(false)
        setSelectedOrderId('')
        setPaymentAmount('')
        setPaymentReference('')
        fetchData(true)
      } else {
        alert(result.error || 'Error al registrar pago')
      }
    } catch (err) {
      console.error('Error saving payment:', err)
      alert('Error al registrar pago')
    } finally {
      setSavingPayment(false)
    }
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

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const periodLabel = period === 'month' ? 'Este mes' : period === 'quarter' ? 'Este trimestre' : 'Este año'

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Finanzas</h2>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenPaymentModal}>
                <DollarSign className="mr-2 h-4 w-4" />
                Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogDescription>
                  Registra un nuevo pago para una orden existente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Orden *</Label>
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar orden..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.client.firstName} {order.client.lastName} (Saldo: {formatCurrencyFull(order.balanceDue)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Pago</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEPOSIT">Anticipo</SelectItem>
                        <SelectItem value="PARTIAL">Abono</SelectItem>
                        <SelectItem value="FINAL">Liquidación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Efectivo</SelectItem>
                        <SelectItem value="TRANSFER">Transferencia</SelectItem>
                        <SelectItem value="CARD">Tarjeta</SelectItem>
                        <SelectItem value="CHECK">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>No. Referencia</Label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePayment} disabled={savingPayment}>
                  {savingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Registrar Pago'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(data.summary.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(data.summary.totalCOGS)}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.summary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen {data.summary.profitMargin}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobrado</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{formatCurrency(data.summary.totalReceived)}</div>
            <p className="text-xs text-muted-foreground">Pagos recibidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Receivable & Payment Methods */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cuentas por Cobrar</CardTitle>
              <Badge variant="outline" className="text-lg font-bold">
                {formatCurrency(data.accountsReceivable.total)}
              </Badge>
            </div>
            <CardDescription>Saldos pendientes de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Vigentes (0-30 días)
                </span>
                <span className="text-muted-foreground">{formatCurrency(data.accountsReceivable.current)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  31-60 días
                </span>
                <span className="text-yellow-500">{formatCurrency(data.accountsReceivable.days31to60)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  61-90 días
                </span>
                <span className="text-orange-500">{formatCurrency(data.accountsReceivable.days61to90)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Más de 90 días
                </span>
                <span className="text-red-500">{formatCurrency(data.accountsReceivable.over90)}</span>
              </div>
            </div>

            {/* Top overdue accounts */}
            {data.accountsReceivable.details.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium mb-3">Cuentas Vencidas</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.accountsReceivable.details
                    .filter(d => d.daysOverdue > 0)
                    .slice(0, 5)
                    .map((detail) => (
                      <Link
                        key={detail.id}
                        href={`/orders/${detail.orderId}`}
                        className="flex justify-between items-center p-2 rounded hover:bg-muted text-sm"
                      >
                        <div>
                          <p className="font-medium">{detail.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {detail.orderNumber}
                            {detail.installmentNumber && ` • Cuota ${detail.installmentNumber}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-500">{formatCurrencyFull(detail.amount)}</p>
                          <p className="text-xs text-red-400">{detail.daysOverdue} días vencido</p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>Distribución de pagos recibidos</CardDescription>
          </CardHeader>
          <CardContent>
            {data.paymentsByMethod.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartPieChart>
                      <Pie
                        data={data.paymentsByMethod.map(p => ({
                          name: METHOD_LABELS[p.method] || p.method,
                          value: p.total
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.paymentsByMethod.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </RechartPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {data.paymentsByMethod.map((pm, index) => (
                    <div key={pm.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{METHOD_LABELS[pm.method] || pm.method}</span>
                      </div>
                      <span className="font-medium">{pm.count} pagos</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin pagos en este período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
          <CardDescription>Ingresos y pagos recibidos de los últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Ingresos"
                  stroke="#10b981"
                  fill="#10b98133"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Cobrado"
                  stroke="#3b82f6"
                  fill="#3b82f633"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Orders by Type & Recent Payments */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Orders by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Tipo</CardTitle>
            <CardDescription>Distribución de órdenes {periodLabel.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.ordersByType.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ordersByType.map(t => ({
                    name: TYPE_LABELS[t.type] || t.type,
                    total: t.total,
                    count: t.count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin órdenes en este período</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Pagos Recientes</CardTitle>
            <CardDescription>Últimos pagos recibidos</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.recentPayments.slice(0, 8).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-100">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{payment.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.orderNumber} • {PAYMENT_TYPE_LABELS[payment.paymentType] || payment.paymentType}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">{formatCurrencyFull(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.paidAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin pagos recientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Principales</CardTitle>
          <CardDescription>Top 5 clientes por volumen de ventas {periodLabel.toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-right">% Cobrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topClients.map((tc) => {
                  const pending = tc.total - tc.amountPaid
                  const percentage = tc.total > 0 ? (tc.amountPaid / tc.total) * 100 : 0
                  return (
                    <TableRow key={tc.client?.id}>
                      <TableCell>
                        <Link href={`/clients/${tc.client?.id}`} className="font-medium hover:underline">
                          {tc.client?.firstName} {tc.client?.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(tc.total)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(tc.amountPaid)}</TableCell>
                      <TableCell className="text-right text-red-500">{formatCurrency(pending)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={percentage >= 100 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
                          {percentage.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Sin clientes en este período</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estados Financieros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Balance General
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Estado de Resultados
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Flujo de Efectivo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análisis Financiero</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Ratios Financieros
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Análisis de Tendencias
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <PieChart className="mr-2 h-4 w-4" />
                Proyecciones
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Herramientas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/invoicing">
                  <Receipt className="mr-2 h-4 w-4" />
                  Facturación
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/orders">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Órdenes
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/clients">
                  <Users className="mr-2 h-4 w-4" />
                  Clientes
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
