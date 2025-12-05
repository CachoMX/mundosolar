'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  ClipboardList,
  DollarSign,
  Zap,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Leaf,
  AlertTriangle
} from 'lucide-react'

// Mock data for demonstration
const stats = [
  {
    title: 'Total Clientes',
    value: '234',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Users,
    description: 'Desde el mes pasado'
  },
  {
    title: 'Órdenes Activas',
    value: '18',
    change: '+23%',
    changeType: 'positive' as const,
    icon: ClipboardList,
    description: 'En proceso'
  },
  {
    title: 'Ingresos del Mes',
    value: '$145,230',
    change: '-3%',
    changeType: 'negative' as const,
    icon: DollarSign,
    description: 'Comparado con enero'
  },
  {
    title: 'Energía Generada',
    value: '2,847 kWh',
    change: '+8%',
    changeType: 'positive' as const,
    icon: Zap,
    description: 'Este mes'
  },
  {
    title: 'Mantenimientos Pendientes',
    value: '8',
    change: '+2',
    changeType: 'neutral' as const,
    icon: Calendar,
    description: 'Programados esta semana'
  },
  {
    title: 'CO₂ Ahorrado',
    value: '1,423 kg',
    change: '+15%',
    changeType: 'positive' as const,
    icon: Leaf,
    description: 'Este mes'
  }
]

const recentOrders = [
  {
    id: 'ORD-001',
    client: 'Juan Pérez',
    type: 'Instalación',
    amount: '$45,000',
    status: 'En Progreso',
    date: '2024-02-15'
  },
  {
    id: 'ORD-002',
    client: 'María González',
    type: 'Mantenimiento',
    amount: '$3,500',
    status: 'Completado',
    date: '2024-02-14'
  },
  {
    id: 'ORD-003',
    client: 'Carlos Ruiz',
    type: 'Instalación',
    amount: '$52,000',
    status: 'Pendiente',
    date: '2024-02-13'
  }
]

const upcomingMaintenance = [
  {
    id: 'MANT-001',
    client: 'Ana López',
    system: 'Sistema Residencial 5kW',
    date: '2024-02-20',
    type: 'Preventivo'
  },
  {
    id: 'MANT-002',
    client: 'Roberto Martín',
    system: 'Sistema Comercial 15kW',
    date: '2024-02-22',
    type: 'Inspección'
  },
  {
    id: 'MANT-003',
    client: 'Sofía Herrera',
    system: 'Sistema Residencial 8kW',
    date: '2024-02-25',
    type: 'Correctivo'
  }
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            ¡Bienvenido, {"Usuario"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí tienes un resumen de tu sistema solar
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {new Date().toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  {stat.changeType === 'positive' && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {stat.changeType === 'negative' && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  {stat.changeType === 'neutral' && (
                    <Activity className="h-3 w-3 text-gray-500" />
                  )}
                  <span className={
                    stat.changeType === 'positive' 
                      ? 'text-green-600' 
                      : stat.changeType === 'negative' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }>
                    {stat.change}
                  </span>
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="orders">Órdenes</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
          <TabsTrigger value="energy">Energía</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Revenue Chart Placeholder */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Ingresos Mensuales</CardTitle>
                <CardDescription>
                  Comparación de ingresos de los últimos 6 meses
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Gráfico de ingresos</p>
                    <p className="text-xs text-gray-400">Se integrarán próximamente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>
                  Funciones más utilizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Agregar Cliente
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Nueva Orden
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Programar Mantenimiento
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Zap className="mr-2 h-4 w-4" />
                  Ver Sistemas Solares
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes Recientes</CardTitle>
              <CardDescription>
                Últimas órdenes registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{order.client}</p>
                        <p className="text-sm text-muted-foreground">{order.id} • {order.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{order.amount}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          order.status === 'Completado' ? 'default' :
                          order.status === 'En Progreso' ? 'secondary' :
                          'outline'
                        }>
                          {order.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{order.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Mantenimientos</CardTitle>
              <CardDescription>
                Mantenimientos programados para esta semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingMaintenance.map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{maintenance.client}</p>
                        <p className="text-sm text-muted-foreground">{maintenance.system}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{maintenance.date}</p>
                      <Badge variant="outline" className="text-sm">
                        {maintenance.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Energy Generation Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Generación de Energía</CardTitle>
                <CardDescription>
                  Generación diaria de los últimos 7 días
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <Zap className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Gráfico de generación</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environmental Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Impacto Ambiental</CardTitle>
                <CardDescription>
                  Beneficios ambientales este mes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">CO₂ Ahorrado</span>
                  <span className="font-medium">1,423 kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Árboles Equivalentes</span>
                  <span className="font-medium">18 árboles</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dinero Ahorrado</span>
                  <span className="font-medium">$8,947</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alerts/Notifications */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>Alertas y Notificaciones</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              • 3 mantenimientos programados para esta semana
            </p>
            <p className="text-sm">
              • 2 facturas pendientes de envío
            </p>
            <p className="text-sm">
              • Inventario bajo en inversores (5 unidades restantes)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}