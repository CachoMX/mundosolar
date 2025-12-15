import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

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
        solarSystems: true
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
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Create client in database
    const client = await withRetry(() => prisma.client.create({
      data: {
        firstName: data.type === 'business' ? data.businessName : data.firstName,
        lastName: data.type === 'business' ? '' : (data.lastName || ''),
        email: data.email,
        phone: data.phone || null,
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

    // Handle CFE receipt data if provided
    const hasCfeData = data.cfeRpu || data.cfeMeterNumber || data.cfeRmu || data.cfeAccountNumber ||
                       data.cfeMeterType || data.cfeTariff || data.cfePhases || data.cfeWires ||
                       data.cfeInstalledLoad || data.cfeContractedDemand || data.cfeVoltageLevel ||
                       data.cfeBranch || data.cfeFolio || data.cfeReceiptFileUrl

    if (hasCfeData) {
      await withRetry(() => prisma.cfeReceipt.create({
        data: {
          clientId: client.id,
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

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Cliente creado exitosamente'
    })
  } catch (error: any) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}