'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
  Calendar,
  Banknote,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Payment {
  id: string
  amount: number
  paymentType: string
  paymentMethod: string | null
  paymentDate: string
  referenceNumber: string | null
  notes: string | null
  orderNumber: string
  orderId: string
  status: string
  dueDate: string | null
  installmentNumber: number | null
  paidAt: string | null
}

interface Order {
  id: string
  orderNumber: string
  orderDate: string
  total: number
  amountPaid: number
  balanceDue: number
  paymentStatus: string
  status: string
  payments: Payment[]
}

interface PaymentData {
  summary: {
    totalOrders: number
    totalAmount: number
    totalPaid: number
    totalPending: number
    paidOrders: number
    partialOrders: number
    pendingOrders: number
  }
  orders: Order[]
  recentPayments: Payment[]
}

const fetchPaymentData = async (): Promise<PaymentData> => {
  const response = await fetch('/api/cliente/pagos')
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || 'Error al cargar datos')
  }
  return result.data
}

const paymentStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  PENDING: { label: 'Pendiente', variant: 'destructive', icon: AlertCircle },
  PARTIAL: { label: 'Parcial', variant: 'secondary', icon: Clock },
  PAID: { label: 'Pagado', variant: 'default', icon: CheckCircle2 },
  REFUNDED: { label: 'Reembolsado', variant: 'outline', icon: Receipt },
}

const paymentTypeLabels: Record<string, string> = {
  DEPOSIT: 'Anticipo',
  PARTIAL: 'Abono',
  FINAL: 'Liquidación',
  REFUND: 'Reembolso',
  INSTALLMENT: 'Cuota',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
}

// Component to show upcoming payments for an order
function UpcomingPayments({ payments }: { payments: Payment[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter pending payments with due dates and sort by due date
  const pendingPayments = payments
    .filter(p => p.status === 'PENDING' && p.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 2) // Only show next 2 payments

  if (pendingPayments.length === 0) return null

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg border border-amber-200 dark:border-amber-800">
      <h4 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-3">
        <CalendarClock className="h-5 w-5" />
        Próximos Pagos
      </h4>
      <div className="space-y-3">
        {pendingPayments.map((payment) => {
          const dueDate = new Date(payment.dueDate!)
          const daysUntilDue = differenceInDays(dueDate, today)
          const isOverdue = daysUntilDue < 0
          const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 5

          return (
            <div
              key={payment.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isOverdue
                  ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
                  : isDueSoon
                  ? 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  isOverdue
                    ? 'bg-red-200 dark:bg-red-800'
                    : isDueSoon
                    ? 'bg-amber-200 dark:bg-amber-800'
                    : 'bg-blue-100 dark:bg-blue-900'
                }`}>
                  {isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    Cuota {payment.installmentNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vence: {format(dueDate, "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className={`text-sm font-medium ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : isDueSoon
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {isOverdue
                    ? `Vencido hace ${Math.abs(daysUntilDue)} día${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
                    : daysUntilDue === 0
                    ? 'Vence hoy'
                    : daysUntilDue === 1
                    ? 'Vence mañana'
                    : `Faltan ${daysUntilDue} días`
                  }
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PagosPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['cliente-pagos'],
    queryFn: fetchPaymentData,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando historial de pagos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary, orders, recentPayments } = data

  // Check if there are any orders with pending scheduled payments
  const ordersWithPendingPayments = orders.filter(order =>
    order.payments.some(p => p.status === 'PENDING' && p.dueDate)
  )

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Mis Pagos
        </h2>
        <p className="text-muted-foreground">
          Historial de pagos y estado de cuenta
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalOrders} {summary.totalOrders === 1 ? 'orden' : 'órdenes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.paidOrders} {summary.paidOrders === 1 ? 'orden pagada' : 'órdenes pagadas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${summary.totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.pendingOrders + summary.partialOrders} {(summary.pendingOrders + summary.partialOrders) === 1 ? 'orden pendiente' : 'órdenes pendientes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado General</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalPending === 0 ? (
                <span className="text-green-600">Al corriente</span>
              ) : (
                <span className="text-orange-600">Con saldo</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summary.totalPaid / summary.totalAmount) * 100) || 0}% pagado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pagos Recientes</CardTitle>
            <CardDescription>Últimos pagos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {paymentTypeLabels[payment.paymentType] || payment.paymentType} - {payment.orderNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {paymentMethodLabels[payment.paymentMethod || ''] || payment.paymentMethod || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.paymentDate), "d 'de' MMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders with Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle por Orden</CardTitle>
          <CardDescription>Ver pagos y cuotas pendientes de cada orden</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes órdenes registradas</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {orders.map((order) => {
                const statusConfig = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.PENDING
                const StatusIcon = statusConfig.icon
                const hasPendingScheduled = order.payments.some(p => p.status === 'PENDING' && p.dueDate)

                return (
                  <AccordionItem key={order.id} value={order.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{order.orderNumber}</p>
                              {hasPendingScheduled && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                  <CalendarClock className="h-3 w-3 mr-1" />
                                  Financiamiento
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(order.orderDate), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              ${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            {order.balanceDue > 0 && (
                              <p className="text-sm text-orange-600">
                                Saldo: ${order.balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        {/* Order Summary */}
                        <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg text-sm">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-medium">${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pagado</p>
                            <p className="font-medium text-green-600">${order.amountPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pendiente</p>
                            <p className="font-medium text-orange-600">${order.balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>

                        {/* Upcoming Payments Section */}
                        <UpcomingPayments payments={order.payments} />

                        {/* Payments Table */}
                        {order.payments.length > 0 ? (
                          <div>
                            <h4 className="font-medium mb-2 text-sm text-muted-foreground">Historial de Pagos</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Fecha</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Método</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.payments
                                  .filter(p => p.status === 'PAID' || p.paidAt)
                                  .map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>
                                      {format(new Date(payment.paidAt || payment.paymentDate), "dd/MM/yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                      {payment.installmentNumber
                                        ? `Cuota ${payment.installmentNumber}`
                                        : paymentTypeLabels[payment.paymentType] || payment.paymentType
                                      }
                                    </TableCell>
                                    <TableCell>
                                      {paymentMethodLabels[payment.paymentMethod || ''] || payment.paymentMethod || '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="default" className="bg-green-600">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Pagado
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-green-600">
                                      ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            No hay pagos registrados para esta orden
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
