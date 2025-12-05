import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ClipboardList, Clock, CheckCircle, Package } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Órdenes</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Activas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              En proceso
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">5</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">147</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234,567</div>
            <p className="text-xs text-muted-foreground">
              Órdenes activas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Borrador</span>
                <span className="text-muted-foreground">3 órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Confirmadas</span>
                <span className="text-muted-foreground">7 órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">En Progreso</span>
                <span className="text-muted-foreground">12 órdenes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Enviadas</span>
                <span className="text-muted-foreground">8 órdenes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Ventas</span>
                <span className="text-muted-foreground">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Instalación</span>
                <span className="text-muted-foreground">10%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Mantenimiento</span>
                <span className="text-muted-foreground">4%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Garantía</span>
                <span className="text-muted-foreground">1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Órdenes</CardTitle>
          <CardDescription>
            Lista completa de órdenes con seguimiento de estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sistema de Órdenes</h3>
            <p>Funcionalidades incluidas:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Creación y edición de órdenes</li>
              <li>Seguimiento de estado en tiempo real</li>
              <li>Gestión de inventario automática</li>
              <li>Generación de facturas SAT</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}