import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'mundosolar-client-secret-key'
)

// Duration of a maintenance in hours (used to block time slots)
const MAINTENANCE_DURATION_HOURS = 2
// Additional buffer hours for travel time between client locations
const TRAVEL_BUFFER_HOURS = 1
// Total blocking window = maintenance duration + travel buffer
const TOTAL_BLOCKING_HOURS = MAINTENANCE_DURATION_HOURS + TRAVEL_BUFFER_HOURS

interface HourAvailability {
  hour: number
  hour12: string
  period: 'AM' | 'PM'
  displayTime: string
  isAvailable: boolean
  allBusy: boolean
}

// GET /api/cliente/mantenimientos/disponibilidad?date=2025-01-15
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('client-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!payload.clientId || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: 'Fecha es requerida' },
        { status: 400 }
      )
    }

    // Parse the date - create dates at start and end of the day in local time
    const [year, month, day] = dateStr.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

    // Get all active technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (technicians.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date: dateStr,
          hourlyAvailability: [],
          message: 'No hay técnicos registrados',
        },
      })
    }

    // Get all scheduled maintenances for the target date (not cancelled or completed)
    const maintenancesOnDate = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
        status: {
          notIn: ['CANCELLED', 'COMPLETED'],
        },
      },
      include: {
        technicians: {
          select: {
            technicianId: true,
          },
        },
      },
    })

    // Debug logging
    console.log('=== CLIENT AVAILABILITY DEBUG ===')
    console.log('Date:', dateStr)
    console.log('Target range:', targetDate.toISOString(), 'to', nextDay.toISOString())
    console.log('Total technicians:', technicians.length)
    console.log('Maintenances found:', maintenancesOnDate.length)
    maintenancesOnDate.forEach(m => {
      console.log(`  Maintenance: ${m.title}`, {
        id: m.id,
        status: m.status,
        scheduledDate: m.scheduledDate?.toISOString(),
        scheduledHour: m.scheduledDate?.getHours(),
        assignedTechnicians: m.technicians.map(t => t.technicianId)
      })
    })

    // Build hourly availability (working hours: 7 AM to 6 PM)
    const hourlyAvailability: HourAvailability[] = []

    for (let hour24 = 7; hour24 <= 18; hour24++) {
      // Convert to 12h format
      let hour12 = hour24 % 12
      if (hour12 === 0) hour12 = 12
      const period: 'AM' | 'PM' = hour24 < 12 ? 'AM' : 'PM'
      const displayTime = `${String(hour12).padStart(2, '0')}:00 ${period}`

      // Check if ALL technicians are busy at this hour
      let availableTechnicianCount = 0

      for (const tech of technicians) {
        // Check if this technician has a conflicting maintenance
        const hasConflict = maintenancesOnDate.some((m) => {
          if (!m.scheduledDate) return false

          // Check if this technician is assigned to this maintenance
          const isAssigned = m.technicians.some((t) => t.technicianId === tech.id)
          if (!isAssigned) return false

          // Extract the hour from the maintenance date
          const maintenanceHour = m.scheduledDate.getHours()
          const maintenanceEndHour = maintenanceHour + TOTAL_BLOCKING_HOURS

          // Check if this hour is within the blocked period
          const isBlocked = hour24 >= maintenanceHour && hour24 < maintenanceEndHour
          return isBlocked
        })

        if (!hasConflict) {
          availableTechnicianCount++
        }
      }

      // For clients, a slot is available if at least ONE technician is free
      const allBusy = availableTechnicianCount === 0

      if (allBusy) {
        console.log(`Hour ${hour24} (${displayTime}): ALL BUSY - no technicians available`)
      }

      hourlyAvailability.push({
        hour: hour24,
        hour12: String(hour12).padStart(2, '0'),
        period,
        displayTime,
        isAvailable: !allBusy,
        allBusy,
      })
    }

    // Summary
    const busyHours = hourlyAvailability.filter(h => h.allBusy)
    console.log('Busy hours:', busyHours.map(h => h.displayTime).join(', ') || 'None')
    console.log('=== END CLIENT AVAILABILITY DEBUG ===')

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        hourlyAvailability,
      },
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
