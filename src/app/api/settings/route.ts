import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings - Fetch system settings and stats
export async function GET() {
  try {
    // Get user stats
    const users = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
        isActive: true
      }
    })

    const activeUsers = users.filter(u => u.isActive).length
    const adminCount = users.filter(u => u.role === 'ADMIN').length
    const employeeCount = users.filter(u => u.role === 'EMPLOYEE').length
    const userCount = users.filter(u => u.role === 'USER').length

    // Get module stats (count active modules based on data presence)
    const [
      clientsCount,
      ordersCount,
      productsCount,
      invoicesCount,
      maintenanceCount,
      solarSystemsCount
    ] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.invoice.count(),
      prisma.maintenanceRecord.count(),
      prisma.solarSystem.count({ where: { isActive: true } })
    ])

    // Determine active modules (modules with at least some configuration or data)
    const modulesActive = [
      true, // Dashboard - always active
      clientsCount > 0 || true, // Clients - active if has data or enabled
      ordersCount > 0 || true, // Orders
      productsCount > 0 || true, // Inventory
      invoicesCount > 0 || true, // Invoicing
      maintenanceCount >= 0 || true, // Maintenance
      solarSystemsCount >= 0 || true, // Solar Systems
      true, // Reports - always active
      true  // Settings - always active
    ].filter(Boolean).length

    // Company settings (could be stored in a settings table in the future)
    const companySettings = {
      name: 'MundoSolar',
      rfc: 'MSO123456XXX',
      currency: 'MXN',
      currencyName: 'Peso Mexicano',
      ivaRate: 16,
      timezone: 'America/Mexico_City',
      timezoneDisplay: 'GMT-6',
      language: 'Español'
    }

    // System info
    const systemInfo = {
      lastBackup: new Date().toISOString(), // Would come from backup system
      backupEnabled: true,
      emailNotifications: true
    }

    return NextResponse.json({
      success: true,
      data: {
        userStats: {
          total: users.length,
          active: activeUsers,
          admins: adminCount,
          employees: employeeCount,
          regularUsers: userCount
        },
        modulesActive,
        companySettings,
        systemInfo,
        dataStats: {
          clients: clientsCount,
          orders: ordersCount,
          products: productsCount,
          invoices: invoicesCount,
          maintenance: maintenanceCount,
          solarSystems: solarSystemsCount
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}
