'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  Wrench,
  DollarSign,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-MX').format(value)
}

// Fetch functions
const fetchSalesReport = async (year: number) => {
  const response = await fetch(`/api/reports/sales?year=${year}`)
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

const fetchTechnicianReport = async (startDate: string, endDate: string) => {
  const response = await fetch(`/api/reports/technician-performance?startDate=${startDate}&endDate=${endDate}`)
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

const fetchClientsReport = async () => {
  const response = await fetch('/api/reports/clients')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

const fetchMaintenanceReport = async (year: number) => {
  const response = await fetch(`/api/reports/maintenance?year=${year}`)
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

// Export functions
const exportToExcel = (data: any[], filename: string, sheetName: string = 'Datos') => {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// PDF Export functions
const exportSalesToPDF = (data: any, year: string) => {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Reporte de Ventas', 14, 22)
  doc.setFontSize(12)
  doc.text(`Año: ${year}`, 14, 30)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 36)

  // Summary
  doc.setFontSize(14)
  doc.text('Resumen', 14, 48)

  autoTable(doc, {
    startY: 52,
    head: [['Métrica', 'Valor']],
    body: [
      ['Ingresos Totales', formatCurrency(data.summary.totalRevenue)],
      ['Órdenes Totales', data.summary.totalOrders.toString()],
      ['Ticket Promedio', formatCurrency(data.summary.averageOrderValue)],
      ['Crecimiento vs Año Anterior', `${data.summary.yearOverYearGrowth.toFixed(1)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }
  })

  // Monthly data
  doc.setFontSize(14)
  doc.text('Ingresos Mensuales', 14, (doc as any).lastAutoTable.finalY + 15)

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Mes', 'Órdenes', 'Ingresos']],
    body: data.monthlyData.map((m: any) => [
      m.monthName,
      m.totalOrders.toString(),
      formatCurrency(m.totalRevenue)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }
  })

  doc.save(`reporte-ventas-${year}.pdf`)
}

const exportTechniciansToPDF = (data: any[]) => {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Reporte de Rendimiento de Técnicos', 14, 22)
  doc.setFontSize(12)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 30)

  autoTable(doc, {
    startY: 40,
    head: [['Técnico', 'Asignados', 'Completados', 'En Progreso', 'Tasa Completación', 'Tasa a Tiempo']],
    body: data.map((t: any) => [
      t.technician.name || t.technician.email,
      t.metrics.totalAssigned.toString(),
      t.metrics.completed.toString(),
      t.metrics.inProgress.toString(),
      `${t.metrics.completionRate.toFixed(1)}%`,
      `${t.metrics.onTimeRate.toFixed(1)}%`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] }
  })

  doc.save('reporte-tecnicos.pdf')
}

const exportClientsToPDF = (data: any) => {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Reporte de Clientes', 14, 22)
  doc.setFontSize(12)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 30)

  // Summary
  doc.setFontSize(14)
  doc.text('Resumen', 14, 42)

  autoTable(doc, {
    startY: 46,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total Clientes', data.summary.totalClients.toString()],
      ['Clientes Activos', data.summary.activeClients.toString()],
      ['Con Sistemas Solares', data.summary.clientsWithSystems.toString()],
      ['Con Órdenes', data.summary.clientsWithOrders.toString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] }
  })

  // Top clients by revenue
  doc.setFontSize(14)
  doc.text('Top Clientes por Ingresos', 14, (doc as any).lastAutoTable.finalY + 15)

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['#', 'Cliente', 'Total Gastado', 'Órdenes']],
    body: data.topClientsByRevenue.slice(0, 10).map((c: any, i: number) => [
      (i + 1).toString(),
      c.name,
      formatCurrency(c.metrics.totalSpent),
      c.metrics.totalOrders.toString()
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] }
  })

  doc.save('reporte-clientes.pdf')
}

const exportMaintenanceToPDF = (data: any, year: string) => {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text('Reporte de Mantenimientos', 14, 22)
  doc.setFontSize(12)
  doc.text(`Año: ${year}`, 14, 30)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 36)

  // Summary
  doc.setFontSize(14)
  doc.text('Resumen', 14, 48)

  autoTable(doc, {
    startY: 52,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total Mantenimientos', data.summary.totalMaintenances.toString()],
      ['Completados', data.summary.completedCount.toString()],
      ['Pendientes', data.summary.pendingCount.toString()],
      ['Tasa de Completación', `${data.summary.completionRate.toFixed(1)}%`],
      ['Tiempo Promedio', `${data.summary.averageCompletionTime.toFixed(1)} hrs`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] }
  })

  // By type
  doc.setFontSize(14)
  doc.text('Por Tipo', 14, (doc as any).lastAutoTable.finalY + 15)

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Tipo', 'Cantidad']],
    body: [
      ['Preventivo', data.byType.PREVENTIVE.toString()],
      ['Correctivo', data.byType.CORRECTIVE.toString()],
      ['Garantía', data.byType.WARRANTY.toString()],
      ['Limpieza', data.byType.CLEANING.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }
  })

  // Technician workload
  if (data.technicianStats.length > 0) {
    doc.setFontSize(14)
    doc.text('Carga por Técnico', 14, (doc as any).lastAutoTable.finalY + 15)

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Técnico', 'Asignados', 'Completados']],
      body: data.technicianStats.map((t: any) => [
        t.name,
        t.assigned.toString(),
        t.completed.toString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] }
    })
  }

  doc.save(`reporte-mantenimientos-${year}.pdf`)
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [activeTab, setActiveTab] = useState('sales')

  // Date range for technician report (last 30 days by default)
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Queries
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', selectedYear],
    queryFn: () => fetchSalesReport(parseInt(selectedYear)),
    enabled: activeTab === 'sales'
  })

  const { data: technicianData, isLoading: technicianLoading } = useQuery({
    queryKey: ['technician-report', startDate, endDate],
    queryFn: () => fetchTechnicianReport(startDate, endDate),
    enabled: activeTab === 'technicians'
  })

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-report'],
    queryFn: fetchClientsReport,
    enabled: activeTab === 'clients'
  })

  const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['maintenance-report', selectedYear],
    queryFn: () => fetchMaintenanceReport(parseInt(selectedYear)),
    enabled: activeTab === 'maintenance'
  })

  // Export handlers
  const handleExportSales = () => {
    if (!salesData) return
    const exportData = salesData.recentOrders.map((order: any) => ({
      'Número de Orden': order.orderNumber,
      'Cliente': order.client,
      'Total': order.total,
      'Estado': order.status,
      'Tipo': order.orderType,
      'Fecha': new Date(order.createdAt).toLocaleDateString('es-MX')
    }))
    exportToExcel(exportData, `reporte-ventas-${selectedYear}`, 'Ventas')
  }

  const handleExportTechnicians = () => {
    if (!technicianData) return
    const exportData = technicianData.map((t: any) => ({
      'Técnico': t.technician.name || t.technician.email,
      'Total Asignados': t.metrics.totalAssigned,
      'Completados': t.metrics.completed,
      'En Progreso': t.metrics.inProgress,
      'Tasa de Completación (%)': t.metrics.completionRate.toFixed(1),
      'Tasa a Tiempo (%)': t.metrics.onTimeRate.toFixed(1),
      'Tiempo Promedio (hrs)': t.metrics.averageCompletionTime.toFixed(1)
    }))
    exportToExcel(exportData, 'reporte-tecnicos', 'Técnicos')
  }

  const handleExportClients = () => {
    if (!clientsData) return
    const exportData = clientsData.clients.map((c: any) => ({
      'Nombre': c.name,
      'Email': c.email,
      'Teléfono': c.phone || '',
      'Ciudad': c.city || '',
      'Estado': c.state || '',
      'Activo': c.isActive ? 'Sí' : 'No',
      'Total Pedidos': c.metrics.totalOrders,
      'Total Gastado': c.metrics.totalSpent,
      'Sistemas Solares': c.metrics.totalSystems,
      'Capacidad Total (kW)': c.metrics.totalCapacity,
      'Generación Promedio (kWh)': c.metrics.avgDailyGeneration.toFixed(2)
    }))
    exportToExcel(exportData, 'reporte-clientes', 'Clientes')
  }

  const handleExportMaintenance = () => {
    if (!maintenanceData) return
    const exportData = maintenanceData.recentMaintenances.map((m: any) => ({
      'Título': m.title,
      'Cliente': m.client,
      'Tipo': m.type,
      'Estado': m.status,
      'Prioridad': m.priority,
      'Técnico(s)': m.technicians,
      'Sistema': m.system,
      'Fecha Programada': m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString('es-MX') : '',
      'Fecha Completado': m.completedDate ? new Date(m.completedDate).toLocaleDateString('es-MX') : ''
    }))
    exportToExcel(exportData, `reporte-mantenimientos-${selectedYear}`, 'Mantenimientos')
  }

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Técnicos</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Mantenimientos</span>
          </TabsTrigger>
        </TabsList>

        {/* SALES TAB */}
        <TabsContent value="sales" className="space-y-4">
          {salesLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : salesData ? (
            <>
              <div className="flex justify-end gap-2">
                <Button onClick={handleExportSales} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={() => exportSalesToPDF(salesData, selectedYear)} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(salesData.summary.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {salesData.summary.yearOverYearGrowth >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      {salesData.summary.yearOverYearGrowth.toFixed(1)}% vs año anterior
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(salesData.summary.totalOrders)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      En {selectedYear}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(salesData.summary.averageOrderValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por orden
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Año Anterior</CardTitle>
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">
                      {formatCurrency(salesData.summary.prevYearRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {parseInt(selectedYear) - 1}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Ingresos Mensuales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthName" />
                        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Area
                          type="monotone"
                          dataKey="totalRevenue"
                          stroke="#10b981"
                          fill="#10b98133"
                          name="Ingresos"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Órdenes por Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalOrders" fill="#3b82f6" name="Órdenes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ventas por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={salesData.categorySales}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {salesData.categorySales.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Clientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {salesData.topClients.map((client: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-400">#{i + 1}</span>
                            <span className="font-medium">{client.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatCurrency(client.revenue)}</div>
                            <div className="text-xs text-gray-500">{client.orders} órdenes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TECHNICIANS TAB */}
        <TabsContent value="technicians" className="space-y-4">
          {technicianLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : technicianData && technicianData.length > 0 ? (
            <>
              <div className="flex justify-end gap-2">
                <Button onClick={handleExportTechnicians} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={() => exportTechniciansToPDF(technicianData)} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>

              {/* Technician Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {technicianData.map((tech: any) => (
                  <Card key={tech.technician.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {tech.technician.name || tech.technician.email}
                      </CardTitle>
                      <CardDescription>
                        {tech.technician.employeeId && `ID: ${tech.technician.employeeId}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Total Asignados</span>
                          <span className="font-bold">{tech.metrics.totalAssigned}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Completados</span>
                          <span className="font-bold text-green-600">{tech.metrics.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">En Progreso</span>
                          <span className="font-bold text-blue-600">{tech.metrics.inProgress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Tasa Completación</span>
                          <Badge variant={tech.metrics.completionRate >= 80 ? 'default' : 'destructive'}>
                            {tech.metrics.completionRate.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Tasa a Tiempo</span>
                          <Badge variant={tech.metrics.onTimeRate >= 80 ? 'default' : 'secondary'}>
                            {tech.metrics.onTimeRate.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Tiempo Promedio</span>
                          <span className="font-medium">{tech.metrics.averageCompletionTime.toFixed(1)} hrs</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparativa de Rendimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={technicianData.map((t: any) => ({
                      name: t.technician.name || t.technician.email?.split('@')[0],
                      completados: t.metrics.completed,
                      enProgreso: t.metrics.inProgress,
                      pendientes: t.metrics.totalAssigned - t.metrics.completed - t.metrics.inProgress
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completados" stackId="a" fill="#10b981" name="Completados" />
                      <Bar dataKey="enProgreso" stackId="a" fill="#3b82f6" name="En Progreso" />
                      <Bar dataKey="pendientes" stackId="a" fill="#f59e0b" name="Pendientes" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-muted-foreground">No hay técnicos con mantenimientos asignados</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CLIENTS TAB */}
        <TabsContent value="clients" className="space-y-4">
          {clientsLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : clientsData ? (
            <>
              <div className="flex justify-end gap-2">
                <Button onClick={handleExportClients} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={() => exportClientsToPDF(clientsData)} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clientsData.summary.totalClients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Activos</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{clientsData.summary.activeClients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{clientsData.summary.inactiveClients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Con Sistemas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{clientsData.summary.clientsWithSystems}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Con Órdenes</CardTitle>
                    <DollarSign className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{clientsData.summary.clientsWithOrders}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Nuevos Clientes por Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={clientsData.monthlyNewClients}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" name="Nuevos Clientes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={clientsData.stateDistribution.slice(0, 8)}
                          dataKey="count"
                          nameKey="state"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ state, percent }) => `${state} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {clientsData.stateDistribution.slice(0, 8).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Clientes por Ingresos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {clientsData.topClientsByRevenue.map((client: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-400">#{i + 1}</span>
                            <span className="font-medium truncate">{client.name}</span>
                          </div>
                          <span className="font-bold text-green-600">{formatCurrency(client.metrics.totalSpent)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Clientes por Generación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {clientsData.topClientsByGeneration.map((client: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-400">#{i + 1}</span>
                            <span className="font-medium truncate">{client.name}</span>
                          </div>
                          <span className="font-bold text-blue-600">{client.metrics.avgDailyGeneration.toFixed(1)} kWh/día</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MAINTENANCE TAB */}
        <TabsContent value="maintenance" className="space-y-4">
          {maintenanceLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : maintenanceData ? (
            <>
              <div className="flex justify-end gap-2">
                <Button onClick={handleExportMaintenance} variant="outline">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={() => exportMaintenanceToPDF(maintenanceData, selectedYear)} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Mantenimientos</CardTitle>
                    <Wrench className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{maintenanceData.summary.totalMaintenances}</div>
                    <p className="text-xs text-muted-foreground">En {selectedYear}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completados</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{maintenanceData.summary.completedCount}</div>
                    <p className="text-xs text-muted-foreground">
                      {maintenanceData.summary.completionRate.toFixed(1)}% tasa completación
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{maintenanceData.summary.pendingCount}</div>
                    <p className="text-xs text-muted-foreground">Por programar/realizar</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                    <Clock className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {maintenanceData.summary.averageCompletionTime.toFixed(1)} hrs
                    </div>
                    <p className="text-xs text-muted-foreground">Por mantenimiento</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Mantenimientos por Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={maintenanceData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completados" />
                        <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pendientes" />
                        <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelados" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Preventivo', value: maintenanceData.byType.PREVENTIVE },
                            { name: 'Correctivo', value: maintenanceData.byType.CORRECTIVE },
                            { name: 'Garantía', value: maintenanceData.byType.WARRANTY },
                            { name: 'Limpieza', value: maintenanceData.byType.CLEANING }
                          ].filter(d => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {[0, 1, 2, 3].map((index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Carga por Técnico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {maintenanceData.technicianStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={maintenanceData.technicianStats} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" fill="#10b981" name="Completados" />
                          <Bar dataKey="assigned" fill="#3b82f6" name="Asignados" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-400">
                        No hay datos de técnicos
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Estado Geográfico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {maintenanceData.stateDistribution.map((state: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{state.state}</span>
                          <Badge variant="secondary">{state.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
