import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings/permissions - Fetch permission stats
export async function GET() {
  try {
    // Get user counts by role
    const users = await prisma.user.findMany({
      select: {
        role: true
      }
    })

    const roleCount = {
      ADMIN: users.filter(u => u.role === 'ADMIN').length,
      EMPLOYEE: users.filter(u => u.role === 'EMPLOYEE').length,
      USER: users.filter(u => u.role === 'USER').length,
      VIEWER: 0 // No VIEWER role in current schema
    }

    // Define the system's permission matrix
    const permissionMatrix = [
      {
        module: 'Clientes',
        roles: [
          { role: 'ADMIN', permissions: ['crear', 'leer', 'actualizar', 'eliminar'], description: 'Control total sobre gestión de clientes' },
          { role: 'EMPLOYEE', permissions: ['leer', 'actualizar'], description: 'Visualización y edición de clientes existentes' },
          { role: 'USER', permissions: ['leer'], description: 'Solo visualización de información de clientes' }
        ]
      },
      {
        module: 'Inventario',
        roles: [
          { role: 'ADMIN', permissions: ['crear', 'leer', 'actualizar', 'eliminar'], description: 'Control total del inventario' },
          { role: 'EMPLOYEE', permissions: ['leer', 'actualizar'], description: 'Consulta y actualización de stock' },
          { role: 'USER', permissions: ['leer'], description: 'Solo consulta de inventario' }
        ]
      },
      {
        module: 'Facturación',
        roles: [
          { role: 'ADMIN', permissions: ['crear', 'leer', 'actualizar', 'eliminar'], description: 'Control total de facturación y SAT' },
          { role: 'EMPLOYEE', permissions: ['crear', 'leer'], description: 'Creación y consulta de facturas' },
          { role: 'USER', permissions: ['leer'], description: 'Solo consulta de facturas' }
        ]
      },
      {
        module: 'Órdenes',
        roles: [
          { role: 'ADMIN', permissions: ['crear', 'leer', 'actualizar', 'eliminar'], description: 'Control total de órdenes' },
          { role: 'EMPLOYEE', permissions: ['crear', 'leer', 'actualizar'], description: 'Gestión de órdenes' },
          { role: 'USER', permissions: ['leer'], description: 'Solo consulta de órdenes' }
        ]
      },
      {
        module: 'Mantenimiento',
        roles: [
          { role: 'ADMIN', permissions: ['crear', 'leer', 'actualizar', 'eliminar'], description: 'Control total de mantenimiento' },
          { role: 'EMPLOYEE', permissions: ['crear', 'leer', 'actualizar'], description: 'Gestión de mantenimientos' },
          { role: 'USER', permissions: ['leer'], description: 'Solo consulta' }
        ]
      },
      {
        module: 'Reportes',
        roles: [
          { role: 'ADMIN', permissions: ['leer', 'exportar'], description: 'Acceso completo a reportes y exportación' },
          { role: 'EMPLOYEE', permissions: ['leer'], description: 'Consulta de reportes operativos' },
          { role: 'USER', permissions: ['leer'], description: 'Reportes básicos' }
        ]
      },
      {
        module: 'Configuración',
        roles: [
          { role: 'ADMIN', permissions: ['crear', 'leer', 'actualizar', 'eliminar'], description: 'Control total del sistema' },
          { role: 'EMPLOYEE', permissions: ['leer'], description: 'Solo visualización' },
          { role: 'USER', permissions: [], description: 'Sin acceso' }
        ]
      }
    ]

    // Calculate stats
    const activeRoles = Object.entries(roleCount).filter(([_, count]) => count > 0).length
    const modulesWithPermissions = permissionMatrix.length
    const uniquePermissions = ['crear', 'leer', 'actualizar', 'eliminar', 'exportar'].length

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          activeRoles,
          modulesWithPermissions,
          uniquePermissions
        },
        roleCount,
        permissionMatrix
      }
    })
  } catch (error: any) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener permisos' },
      { status: 500 }
    )
  }
}
