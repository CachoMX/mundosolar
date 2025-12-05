import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Wallet } from 'lucide-react'

export default function FinancesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Finanzas</h2>
        <Button>
          <DollarSign className="mr-2 h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">$3,247,890</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">$2,124,560</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,123,330</div>
            <p className="text-xs text-muted-foreground">
              Margen 34.6%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo de Caja</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">$847,250</div>
            <p className="text-xs text-muted-foreground">
              Disponible
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cuentas por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Vencimiento 0-30 días</span>
                <span className="text-muted-foreground">$234,567</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Vencimiento 31-60 días</span>
                <span className="text-yellow-500">$89,123</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Vencimiento 61-90 días</span>
                <span className="text-orange-500">$34,567</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Más de 90 días</span>
                <span className="text-red-500">$12,345</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas por Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Proveedores</span>
                <span className="text-muted-foreground">$156,789</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Servicios</span>
                <span className="text-muted-foreground">$45,234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Impuestos</span>
                <span className="text-yellow-500">$87,654</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Nómina</span>
                <span className="text-muted-foreground">$123,456</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estados Financieros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Balance General
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Estado de Resultados
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Flujo de Efectivo
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
                Ratios Financieros
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Análisis de Tendencias
              </Button>
              <Button variant="outline" className="w-full justify-start">
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
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                Conciliación Bancaria
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Control de Presupuesto
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Wallet className="mr-2 h-4 w-4" />
                Centro de Costos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Control Financiero</CardTitle>
          <CardDescription>
            Gestión integral de finanzas empresariales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Módulo Financiero</h3>
            <p>Características del sistema:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Control de ingresos y egresos en tiempo real</li>
              <li>Conciliación bancaria automatizada</li>
              <li>Gestión de cuentas por cobrar y pagar</li>
              <li>Análisis de rentabilidad por proyecto</li>
              <li>Reportes financieros automáticos</li>
              <li>Integración con sistema contable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}