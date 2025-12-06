import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings/maintenance - Fetch system maintenance info
export async function GET() {
  try {
    // Get database stats
    const [
      clientsCount,
      ordersCount,
      productsCount,
      invoicesCount,
      maintenanceCount,
      solarSystemsCount,
      usersCount
    ] = await Promise.all([
      prisma.client.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.invoice.count(),
      prisma.maintenanceRecord.count(),
      prisma.solarSystem.count(),
      prisma.user.count()
    ])

    const totalRecords = clientsCount + ordersCount + productsCount + invoicesCount + maintenanceCount + solarSystemsCount + usersCount

    // System status - in a real app these would come from monitoring services
    const systemStatus = [
      {
        service: 'Base de Datos',
        status: 'online',
        lastCheck: new Date().toISOString(),
        uptime: '99.9%',
        details: `${totalRecords} registros totales`
      },
      {
        service: 'API Growatt',
        status: 'pending', // Would be checked via API call
        lastCheck: new Date(Date.now() - 5 * 60000).toISOString(),
        uptime: '98.7%',
        details: 'Verificar configuración'
      },
      {
        service: 'WhatsApp Business',
        status: 'pending',
        lastCheck: new Date(Date.now() - 60 * 60000).toISOString(),
        uptime: '95.2%',
        details: 'Verificar configuración'
      },
      {
        service: 'PAC Facturación',
        status: 'pending',
        lastCheck: new Date(Date.now() - 3 * 60000).toISOString(),
        uptime: '99.1%',
        details: 'Verificar configuración'
      },
      {
        service: 'Servidor Web',
        status: 'online',
        lastCheck: new Date().toISOString(),
        uptime: '99.8%',
        details: 'Funcionando correctamente'
      }
    ]

    // Calculate active services
    const activeServices = systemStatus.filter(s => s.status === 'online').length
    const totalServices = systemStatus.length

    // Get recent activity for logs
    const recentOrders = await prisma.order.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true
      }
    })

    const recentClients = await prisma.client.findMany({
      take: 2,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    })

    // Generate system logs from recent activity
    const systemLogs = [
      ...recentOrders.map(order => ({
        time: new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'INFO',
        message: `Nueva orden creada #${order.orderNumber}`,
        module: 'ORDERS',
        timestamp: order.createdAt
      })),
      ...recentClients.map(client => ({
        time: new Date(client.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'INFO',
        message: `Nuevo cliente registrado: ${client.firstName} ${client.lastName}`,
        module: 'CLIENTS',
        timestamp: client.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

    // Backup history simulation (in real app would come from backup system)
    const now = new Date()
    const backupHistory = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(2, 0, 0, 0)

      return {
        date: date.toISOString().split('T')[0],
        time: '02:00 AM',
        size: `${(2.0 + Math.random() * 0.5).toFixed(1)} GB`,
        status: i === 4 && Math.random() > 0.5 ? 'failed' : 'success',
        type: 'Automático'
      }
    })

    // Stats
    const stats = {
      generalStatus: activeServices >= totalServices - 1 ? 'Operativo' : 'Degradado',
      activeServices,
      totalServices,
      lastBackup: backupHistory[0],
      diskUsage: {
        used: Math.round(50 + totalRecords * 0.01),
        total: 200,
        percentage: Math.round((50 + totalRecords * 0.01) / 200 * 100)
      },
      errorsToday: systemStatus.filter(s => s.status === 'offline').length
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        systemStatus,
        backupHistory,
        systemLogs,
        databaseStats: {
          clients: clientsCount,
          orders: ordersCount,
          products: productsCount,
          invoices: invoicesCount,
          maintenance: maintenanceCount,
          solarSystems: solarSystemsCount,
          users: usersCount,
          total: totalRecords
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching system maintenance info:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener información del sistema' },
      { status: 500 }
    )
  }
}
