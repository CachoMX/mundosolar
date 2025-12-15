import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/clients/[id] - Fetch single client
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await prisma.client.findUnique({
      where: {
        id: params.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        neighborhood: true,
        city: true,
        state: true,
        postalCode: true,
        rfc: true,
        curp: true,
        regimenFiscal: true,
        identificationNumber: true,
        growattUsername: true,
        growattPassword: true,
        expectedDailyGeneration: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        cfeReceipts: {
          select: {
            id: true,
            rpu: true,
            meterNumber: true,
            rmu: true,
            accountNumber: true,
            meterType: true,
            tariff: true,
            phases: true,
            wires: true,
            installedLoad: true,
            contractedDemand: true,
            voltageLevel: true,
            mediumVoltage: true,
            cfeBranch: true,
            cfeFolio: true,
            receiptFileUrl: true,
            notes: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Cliente no encontrado'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: client
    })
  } catch (error: any) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // Handle business vs personal client type
    const firstName = data.type === 'business' ? data.businessName : data.firstName
    const lastName = data.type === 'business' ? '' : data.lastName
    
    // Update client in database
    const client = await prisma.client.update({
      where: {
        id: params.id
      },
      data: {
        firstName: firstName,
        lastName: lastName,
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
        isActive: data.isActive
      }
    })

    // Handle CFE receipt data (upsert)
    const hasCfeData = data.cfeRpu || data.cfeMeterNumber || data.cfeRmu || data.cfeAccountNumber ||
                       data.cfeMeterType || data.cfeTariff || data.cfePhases || data.cfeWires ||
                       data.cfeInstalledLoad || data.cfeContractedDemand || data.cfeVoltageLevel ||
                       data.cfeBranch || data.cfeFolio || data.cfeReceiptFileUrl

    if (hasCfeData) {
      const cfeData = {
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

      await prisma.cfeReceipt.upsert({
        where: {
          clientId: params.id
        },
        update: cfeData,
        create: {
          clientId: params.id,
          ...cfeData
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Cliente actualizado exitosamente'
    })
  } catch (error: any) {
    console.error('Error updating client:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.client.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('Error deleting client:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}