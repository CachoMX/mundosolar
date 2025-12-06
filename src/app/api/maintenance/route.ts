import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/maintenance - Fetch all maintenance records with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')

    const where: any = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        solarSystem: {
          select: {
            id: true,
            systemName: true,
            capacity: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    })

    // Calculate stats
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const stats = {
      scheduled: maintenanceRecords.filter(m =>
        m.status === 'SCHEDULED' &&
        new Date(m.scheduledDate) <= thirtyDaysFromNow
      ).length,
      urgent: maintenanceRecords.filter(m =>
        (m.status === 'SCHEDULED' || m.status === 'PENDING') &&
        new Date(m.scheduledDate) < now
      ).length,
      inProgress: maintenanceRecords.filter(m => m.status === 'IN_PROGRESS').length,
      completedThisMonth: maintenanceRecords.filter(m =>
        m.status === 'COMPLETED' &&
        m.completedDate &&
        new Date(m.completedDate) >= startOfMonth
      ).length,
      total: maintenanceRecords.length
    }

    // Calculate by type
    const byType = {
      preventive: maintenanceRecords.filter(m => m.maintenanceType === 'PREVENTIVE').length,
      corrective: maintenanceRecords.filter(m => m.maintenanceType === 'CORRECTIVE').length,
      warranty: maintenanceRecords.filter(m => m.maintenanceType === 'WARRANTY').length,
      inspection: maintenanceRecords.filter(m => m.maintenanceType === 'INSPECTION').length,
      cleaning: maintenanceRecords.filter(m => m.maintenanceType === 'CLEANING').length
    }

    // Calculate percentages
    const total = maintenanceRecords.length || 1
    const byTypePercentage = {
      preventive: Math.round((byType.preventive / total) * 100),
      corrective: Math.round((byType.corrective / total) * 100),
      warranty: Math.round((byType.warranty / total) * 100),
      inspection: Math.round((byType.inspection / total) * 100),
      cleaning: Math.round((byType.cleaning / total) * 100)
    }

    return NextResponse.json({
      success: true,
      data: {
        records: maintenanceRecords,
        stats,
        byType,
        byTypePercentage
      }
    })
  } catch (error: any) {
    console.error('Error fetching maintenance records:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener registros de mantenimiento' },
      { status: 500 }
    )
  }
}

// POST /api/maintenance - Create new maintenance record
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.clientId) {
      return NextResponse.json(
        { success: false, error: 'Cliente es requerido' },
        { status: 400 }
      )
    }

    if (!data.maintenanceType) {
      return NextResponse.json(
        { success: false, error: 'Tipo de mantenimiento es requerido' },
        { status: 400 }
      )
    }

    if (!data.scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'Fecha programada es requerida' },
        { status: 400 }
      )
    }

    // Create maintenance record
    const maintenance = await prisma.maintenanceRecord.create({
      data: {
        clientId: data.clientId,
        solarSystemId: data.solarSystemId || null,
        maintenanceType: data.maintenanceType,
        scheduledDate: new Date(data.scheduledDate),
        status: data.status || 'SCHEDULED',
        description: data.description || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        laborHours: data.laborHours ? parseFloat(data.laborHours) : null,
        nextScheduledDate: data.nextScheduledDate ? new Date(data.nextScheduledDate) : null
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        solarSystem: {
          select: {
            id: true,
            systemName: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: maintenance,
      message: 'Mantenimiento programado exitosamente'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating maintenance record:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear registro de mantenimiento' },
      { status: 500 }
    )
  }
}
