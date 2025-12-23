import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// GET /api/clients - Fetch all clients
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clients = await withRetry(() => prisma.client.findMany({
      include: {
        solarSystems: true,
        addresses: {
          where: { isActive: true },
          orderBy: { isDefault: 'desc' }
        },
        cfeReceipts: {
          include: {
            address: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }))

    return NextResponse.json({
      success: true,
      data: clients
    })
  } catch (error: any) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  console.log('POST /api/clients - Starting client creation')
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check - user:', user?.id, 'error:', authError)

    if (authError || !user) {
      console.log('Unauthorized - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    console.log('Received client data:', JSON.stringify(data, null, 2))

    // Generate automatic password: firstName (lowercase, no spaces) + current year
    const firstName = data.type === 'business' ? data.businessName : data.firstName
    const cleanFirstName = firstName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^a-z0-9]/g, '') // Remove special characters
    const currentYear = new Date().getFullYear()
    const autoPassword = `${cleanFirstName}${currentYear}`
    console.log('Generated password for client:', autoPassword)
    const hashedPassword = await bcrypt.hash(autoPassword, 10)

    console.log('Creating client in database...')
    // Create client in database (main address stored in clients table)
    const client = await withRetry(() => prisma.client.create({
      data: {
        firstName: data.type === 'business' ? data.businessName : data.firstName,
        lastName: data.type === 'business' ? '' : (data.lastName || ''),
        email: data.email,
        phone: data.phone || null,
        password: hashedPassword, // Auto-generated password
        requirePasswordChange: true, // Force password change on first login
        // Main address stored in clients table
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        rfc: data.rfc || null,
        curp: data.curp || null,
        regimenFiscal: data.regimenFiscal || null,
        identificationNumber: data.identificationNumber || null,
        growattUsername: data.growattUsername || null,
        growattPassword: data.growattPassword || null,
        expectedDailyGeneration: data.expectedDailyGeneration || null,
        notes: data.notes || null,
        isActive: true
      }
    }))
    console.log('Client created successfully:', client.id)

    // Handle CFE receipt data if provided (main meter for main address, addressId = null)
    const hasCfeData = data.cfeRpu || data.cfeMeterNumber || data.cfeRmu || data.cfeAccountNumber ||
                       data.cfeMeterType || data.cfeTariff || data.cfePhases || data.cfeWires ||
                       data.cfeInstalledLoad || data.cfeContractedDemand || data.cfeVoltageLevel ||
                       data.cfeBranch || data.cfeFolio || data.cfeReceiptFileUrl

    if (hasCfeData) {
      await withRetry(() => prisma.cfeReceipt.create({
        data: {
          clientId: client.id,
          addressId: null, // null = main address (stored in clients table)
          name: data.city ? `Medidor - ${data.city}` : 'Medidor Principal',
          rpu: data.cfeRpu || null,
          meterNumber: data.cfeMeterNumber || null,
          rmu: data.cfeRmu || null,
          accountNumber: data.cfeAccountNumber || null,
          meterType: data.cfeMeterType || null,
          tariff: data.cfeTariff || null,
          phases: data.cfePhases || null,
          wires: data.cfeWires || null,
          installedLoad: data.cfeInstalledLoad || null,
          contractedDemand: data.cfeContractedDemand || null,
          voltageLevel: data.cfeVoltageLevel || null,
          mediumVoltage: data.cfeMediumVoltage || false,
          cfeBranch: data.cfeBranch || null,
          cfeFolio: data.cfeFolio || null,
          receiptFileUrl: data.cfeReceiptFileUrl || null
        }
      }))
    }

    // Handle additional addresses if provided
    if (data.additionalAddresses && Array.isArray(data.additionalAddresses)) {
      for (const addr of data.additionalAddresses) {
        // Create the address
        const clientAddress = await withRetry(() => prisma.clientAddress.create({
          data: {
            clientId: client.id,
            name: addr.name,
            address: addr.address || null,
            neighborhood: addr.neighborhood || null,
            city: addr.city || null,
            state: addr.state || null,
            postalCode: addr.postalCode || null,
            isDefault: false,
            isActive: true
          }
        }))

        // Create CFE receipt for this address if data provided
        const hasAddrCfeData = addr.cfeRpu || addr.cfeMeterNumber || addr.cfeRmu || addr.cfeAccountNumber ||
                               addr.cfeMeterType || addr.cfeTariff || addr.cfePhases || addr.cfeWires ||
                               addr.cfeInstalledLoad || addr.cfeContractedDemand || addr.cfeVoltageLevel ||
                               addr.cfeBranch || addr.cfeFolio || addr.cfeReceiptFileUrl

        let cfeReceiptId = null
        if (hasAddrCfeData) {
          const cfeReceipt = await withRetry(() => prisma.cfeReceipt.create({
            data: {
              clientId: client.id,
              addressId: clientAddress.id,
              name: `Medidor - ${addr.name}`,
              rpu: addr.cfeRpu || null,
              meterNumber: addr.cfeMeterNumber || null,
              rmu: addr.cfeRmu || null,
              accountNumber: addr.cfeAccountNumber || null,
              meterType: addr.cfeMeterType || null,
              tariff: addr.cfeTariff || null,
              phases: addr.cfePhases ? parseInt(addr.cfePhases) : null,
              wires: addr.cfeWires ? parseInt(addr.cfeWires) : null,
              installedLoad: addr.cfeInstalledLoad || null,
              contractedDemand: addr.cfeContractedDemand || null,
              voltageLevel: addr.cfeVoltageLevel || null,
              mediumVoltage: addr.cfeMediumVoltage || false,
              cfeBranch: addr.cfeBranch || null,
              cfeFolio: addr.cfeFolio || null,
              receiptFileUrl: addr.cfeReceiptFileUrl || null
            }
          }))
          cfeReceiptId = cfeReceipt.id
        }

        // Create solar system for this address if panel/inverter data provided
        const hasSolarData = addr.growattUsername || addr.expectedDailyGeneration ||
                             (addr.panels && addr.panels.length > 0) ||
                             (addr.inverters && addr.inverters.length > 0)

        if (hasSolarData) {
          // Calculate total capacity from panels
          let totalCapacity = 0
          if (addr.panels && addr.panels.length > 0) {
            for (const panel of addr.panels) {
              const cantidad = parseInt(panel.cantidad) || 0
              const potencia = parseInt(panel.potencia) || 0
              totalCapacity += (cantidad * potencia) / 1000 // Convert W to kW
            }
          }

          const solarSystem = await withRetry(() => prisma.solarSystem.create({
            data: {
              clientId: client.id,
              addressId: clientAddress.id,
              cfeReceiptId: cfeReceiptId,
              systemName: `Sistema Solar - ${addr.name}`,
              capacity: totalCapacity > 0 ? totalCapacity : null,
              isActive: true,
              installationStatus: 'PENDING_SCHEDULING'
            }
          }))

          // Store panel and inverter info in notes for now
          // (In a more complete implementation, you'd create SolarSystemComponent records)
          let systemNotes = ''
          if (addr.panels && addr.panels.length > 0) {
            systemNotes += 'Paneles: ' + addr.panels.map((p: any) =>
              `${p.cantidad || 0}x ${p.marca || ''} ${p.modelo || ''} ${p.potencia || 0}W`
            ).join(', ')
          }
          if (addr.inverters && addr.inverters.length > 0) {
            if (systemNotes) systemNotes += '\n'
            systemNotes += 'Inversores: ' + addr.inverters.map((i: any) =>
              `${i.cantidad || 0}x ${i.marca || ''} ${i.modelo || ''} ${i.potencia || 0}kW`
            ).join(', ')
          }

          if (systemNotes || addr.growattUsername) {
            await withRetry(() => prisma.solarSystem.update({
              where: { id: solarSystem.id },
              data: {
                notes: systemNotes || null
              }
            }))
          }

          // Create Growatt credentials if provided
          if (addr.growattUsername && addr.growattPassword) {
            await withRetry(() => prisma.growattCredentials.create({
              data: {
                clientId: client.id,
                username: addr.growattUsername,
                password: addr.growattPassword,
                isActive: true
              }
            }).catch(() => {
              // Ignore if credentials already exist (unique constraint)
            }))
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Cliente creado exitosamente'
    })
  } catch (error: any) {
    console.error('Error creating client:', error)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error stack:', error?.stack)

    // Handle Prisma unique constraint errors
    if (error?.code === 'P2002') {
      const target = error?.meta?.target
      if (target?.includes('email')) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un cliente con este correo electrónico' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Ya existe un registro con estos datos' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}