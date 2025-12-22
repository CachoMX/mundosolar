import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Duration of a maintenance in hours (used to block time slots)
const MAINTENANCE_DURATION_HOURS = 2
// Additional buffer hours for travel time between client locations
const TRAVEL_BUFFER_HOURS = 1
// Total blocking window = maintenance duration + travel buffer
const TOTAL_BLOCKING_HOURS = MAINTENANCE_DURATION_HOURS + TRAVEL_BUFFER_HOURS

interface TechnicianAvailability {
  technicianId: string
  technicianName: string
  isAvailable: boolean
  conflictingMaintenance?: {
    id: string
    title: string
    scheduledDate: Date
  }
}

interface HourAvailability {
  hour: number // 0-23 in 24h format
  hour12: string // "09" in 12h format
  period: 'AM' | 'PM'
  displayTime: string // "09:00 AM"
  isAvailable: boolean // true if at least one technician is available
  availableTechnicians: TechnicianAvailability[]
  allBusy: boolean // true if ALL technicians are busy
}

// GET /api/maintenance/availability?date=2025-01-15
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const excludeMaintenanceId = searchParams.get('excludeMaintenanceId')

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: 'Fecha es requerida' },
        { status: 400 }
      )
    }

    // Parse the date - create dates at start and end of the day in local time
    // Using explicit year/month/day to avoid timezone issues with date-only strings
    const [year, month, day] = dateStr.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    const nextDay = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

    console.log('Date parsing:', {
      dateStr,
      targetDate: targetDate.toISOString(),
      nextDay: nextDay.toISOString(),
      targetDateLocal: targetDate.toString(),
    })

    // Get all active technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (technicians.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date: dateStr,
          technicians: [],
          hourlyAvailability: [],
          message: 'No hay técnicos registrados',
        },
      })
    }

    // Get all scheduled maintenances for the target date (not cancelled)
    // Exclude the maintenance being edited if provided
    const maintenancesOnDate = await prisma.maintenanceRecord.findMany({
      where: {
        scheduledDate: {
          gte: targetDate,
          lt: nextDay,
        },
        status: {
          notIn: ['CANCELLED', 'COMPLETED'],
        },
        ...(excludeMaintenanceId ? { id: { not: excludeMaintenanceId } } : {}),
      },
      include: {
        technicians: {
          select: {
            technicianId: true,
          },
        },
      },
    })

    // Build hourly availability (working hours: 7 AM to 6 PM)
    const hourlyAvailability: HourAvailability[] = []

    // Debug: log maintenances found with all technicians
    console.log('=== AVAILABILITY DEBUG ===')
    console.log('Date requested:', dateStr)
    console.log('Target date range:', targetDate.toISOString(), 'to', nextDay.toISOString())
    console.log('Blocking window:', TOTAL_BLOCKING_HOURS, 'hours (', MAINTENANCE_DURATION_HOURS, 'maintenance +', TRAVEL_BUFFER_HOURS, 'travel)')
    console.log('Exclude maintenance ID:', excludeMaintenanceId)
    console.log('Maintenances found:', maintenancesOnDate.length)
    console.log('All technicians in system:', technicians.map(t => ({ id: t.id, name: t.name })))

    maintenancesOnDate.forEach(m => {
      console.log(`Maintenance: ${m.title}`, {
        id: m.id,
        scheduledDateISO: m.scheduledDate?.toISOString(),
        scheduledDateLocal: m.scheduledDate?.toString(),
        hourLocal: m.scheduledDate?.getHours(),
        hourUTC: m.scheduledDate?.getUTCHours(),
        status: m.status,
        assignedTechnicians: m.technicians.map(t => t.technicianId)
      })
    })

    for (let hour24 = 7; hour24 <= 18; hour24++) {
      // Convert to 12h format
      let hour12 = hour24 % 12
      if (hour12 === 0) hour12 = 12
      const period: 'AM' | 'PM' = hour24 < 12 ? 'AM' : 'PM'
      const displayTime = `${String(hour12).padStart(2, '0')}:00 ${period}`

      // Check availability for each technician at this hour
      const technicianAvailabilities: TechnicianAvailability[] = technicians.map((tech) => {
        // Find if this technician has a conflicting maintenance
        const conflictingMaintenance = maintenancesOnDate.find((m) => {
          if (!m.scheduledDate) {
            console.log(`Skipping maintenance ${m.id}: no scheduledDate`)
            return false
          }

          // Check if this technician is assigned to this maintenance
          const isAssigned = m.technicians.some((t) => t.technicianId === tech.id)

          // Only log for hour 15 (3 PM) to reduce noise
          if (hour24 === 15) {
            console.log(`Hour ${hour24}: Checking tech ${tech.name} (${tech.id}) against maintenance ${m.title}`, {
              technicianIds: m.technicians.map(t => t.technicianId),
              isAssigned
            })
          }

          if (!isAssigned) return false

          // Extract the hour from the maintenance date
          // Use getHours() which returns local time (matching how dates are created in frontend)
          const maintenanceHour = m.scheduledDate.getHours()

          // Check if this hour slot falls within the maintenance's blocked period
          // Blocking window: [maintenanceHour, maintenanceHour + TOTAL_BLOCKING_HOURS)
          // A slot is blocked if it starts within this window
          const maintenanceEndHour = maintenanceHour + TOTAL_BLOCKING_HOURS

          // Simple check: is this hour within the blocked period?
          const isBlocked = hour24 >= maintenanceHour && hour24 < maintenanceEndHour

          console.log(`Block check for tech ${tech.name} at hour ${hour24}:`, {
            maintenanceHour,
            maintenanceEndHour: `${maintenanceEndHour} (${maintenanceHour}+${TOTAL_BLOCKING_HOURS})`,
            hour24,
            isBlocked,
            blockingHours: TOTAL_BLOCKING_HOURS
          })

          return isBlocked
        })

        return {
          technicianId: tech.id,
          technicianName: tech.name || tech.email,
          isAvailable: !conflictingMaintenance,
          conflictingMaintenance: conflictingMaintenance
            ? {
                id: conflictingMaintenance.id,
                title: conflictingMaintenance.title,
                scheduledDate: conflictingMaintenance.scheduledDate!,
              }
            : undefined,
        }
      })

      const availableTechs = technicianAvailabilities.filter((t) => t.isAvailable)
      const allBusy = availableTechs.length === 0

      hourlyAvailability.push({
        hour: hour24,
        hour12: String(hour12).padStart(2, '0'),
        period,
        displayTime,
        isAvailable: !allBusy,
        availableTechnicians: technicianAvailabilities,
        allBusy,
      })
    }

    // Summary log for debugging
    console.log('=== AVAILABILITY SUMMARY ===')
    hourlyAvailability.forEach(h => {
      const unavailable = h.availableTechnicians.filter(t => !t.isAvailable)
      if (unavailable.length > 0) {
        console.log(`Hour ${h.hour} (${h.displayTime}): ${unavailable.map(t => t.technicianName).join(', ')} are BUSY`)
      }
    })
    console.log('=== END AVAILABILITY DEBUG ===')

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        technicians: technicians.map((t) => ({
          id: t.id,
          name: t.name || t.email,
        })),
        hourlyAvailability,
        maintenanceCount: maintenancesOnDate.length,
        // Debug info - remove after fixing
        debug: {
          targetDateISO: targetDate.toISOString(),
          nextDayISO: nextDay.toISOString(),
          maintenances: maintenancesOnDate.map(m => ({
            id: m.id,
            title: m.title,
            scheduledDateISO: m.scheduledDate?.toISOString(),
            scheduledHourLocal: m.scheduledDate?.getHours(),
            scheduledHourUTC: m.scheduledDate?.getUTCHours(),
            technicianIds: m.technicians.map(t => t.technicianId)
          }))
        }
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
