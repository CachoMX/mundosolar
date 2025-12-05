import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Wrench, Calendar, AlertCircle, Clock } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Mantenimiento</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Programar Mantenimiento
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 días
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">3</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">5</div>
            <p className="text-xs text-muted-foreground">
              En proceso
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Wrench className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">47</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Preventivo</span>
                <span className="text-muted-foreground">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Correctivo</span>
                <span className="text-muted-foreground">20%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Garantía</span>
                <span className="text-muted-foreground">10%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Limpieza</span>
                <span className="text-muted-foreground">5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendario de Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Vista de Calendario</h3>
              <p>Próximamente: vista de calendario interactivo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sistema de Mantenimiento</CardTitle>
          <CardDescription>
            Programación automática y seguimiento de mantenimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gestión de Mantenimiento</h3>
            <p>Características del sistema:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Programación automática basada en fechas de instalación</li>
              <li>Recordatorios y notificaciones</li>
              <li>Seguimiento de refacciones utilizadas</li>
              <li>Reportes de rendimiento por técnico</li>
              <li>Historial completo de servicios</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}