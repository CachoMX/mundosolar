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
        addresses: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            postalCode: true,
            neighborhood: true,
            isDefault: true,
            isActive: true
          },
          orderBy: {
            isDefault: 'desc'
          }
        },
        cfeReceipts: {
          select: {
            id: true,
            addressId: true,
            name: true,
            rpu: true,
            serviceNumber: true,
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
            notes: true,
            address: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        solarSystems: {
          select: {
            id: true,
            systemName: true,
            capacity: true,
            addressId: true,
            cfeReceiptId: true,
            address: {
              select: {
                id: true,
                name: true
              }
            },
            cfeReceipt: {
              select: {
                id: true,
                name: true,
                meterNumber: true,
                rpu: true
              }
            },
            components: {
              select: {
                id: true,
                quantity: true,
                serialNumber: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                    model: true,
                    capacity: true,
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
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

    // Handle addresses (array of addresses)
    // Keep a map of temp IDs to real IDs for linking CFE receipts
    const tempAddressIdMap: Record<string, string> = {}

    if (data.addresses && Array.isArray(data.addresses)) {
      for (const addr of data.addresses) {
        if (addr.id && !addr.id.startsWith('temp-')) {
          // Update existing address
          await prisma.clientAddress.update({
            where: { id: addr.id },
            data: {
              name: addr.name,
              address: addr.address || null,
              city: addr.city || null,
              state: addr.state || null,
              postalCode: addr.postalCode || null,
              neighborhood: addr.neighborhood || null,
              isDefault: addr.isDefault || false,
              isActive: addr.isActive !== false
            }
          })
        } else if (!addr._deleted) {
          // Create new address and store the mapping
          const newAddress = await prisma.clientAddress.create({
            data: {
              clientId: params.id,
              name: addr.name,
              address: addr.address || null,
              city: addr.city || null,
              state: addr.state || null,
              postalCode: addr.postalCode || null,
              neighborhood: addr.neighborhood || null,
              isDefault: addr.isDefault || false,
              isActive: addr.isActive !== false
            }
          })
          // Map temp ID to real ID
          tempAddressIdMap[addr.id] = newAddress.id
        }
      }

      // Delete addresses marked for deletion
      const addressesToDelete = data.addresses
        .filter((a: any) => a._deleted && a.id && !a.id.startsWith('temp-'))
        .map((a: any) => a.id)

      if (addressesToDelete.length > 0) {
        await prisma.clientAddress.deleteMany({
          where: { id: { in: addressesToDelete } }
        })
      }
    }

    // Handle CFE receipts (array of meters)
    if (data.cfeReceipts && Array.isArray(data.cfeReceipts)) {
      for (const cfe of data.cfeReceipts) {
        // Resolve addressId: convert temp IDs to real IDs, 'main-address' to null
        let resolvedAddressId: string | null = null
        if (cfe.addressId && cfe.addressId !== 'none' && cfe.addressId !== 'main-address') {
          if (cfe.addressId.startsWith('temp-')) {
            // Look up the real ID from our map
            resolvedAddressId = tempAddressIdMap[cfe.addressId] || null
          } else {
            resolvedAddressId = cfe.addressId
          }
        }
        // Note: 'main-address' or null = main address from clients table

        const cfeData = {
          addressId: resolvedAddressId,
          name: cfe.name || null,
          rpu: cfe.rpu || null,
          serviceNumber: cfe.serviceNumber || null,
          meterNumber: cfe.meterNumber || null,
          rmu: cfe.rmu || null,
          accountNumber: cfe.accountNumber || null,
          meterType: cfe.meterType || null,
          tariff: cfe.tariff || null,
          phases: cfe.phases || null,
          wires: cfe.wires || null,
          installedLoad: cfe.installedLoad || null,
          contractedDemand: cfe.contractedDemand || null,
          voltageLevel: cfe.voltageLevel || null,
          mediumVoltage: cfe.mediumVoltage || false,
          cfeBranch: cfe.cfeBranch || null,
          cfeFolio: cfe.cfeFolio || null,
          receiptFileUrl: cfe.receiptFileUrl || null,
          notes: cfe.notes || null
        }

        if (cfe.id && !cfe.id.startsWith('temp-')) {
          // Update existing CFE receipt
          await prisma.cfeReceipt.update({
            where: { id: cfe.id },
            data: cfeData
          })
        } else if (!cfe._deleted) {
          // Create new CFE receipt
          await prisma.cfeReceipt.create({
            data: {
              clientId: params.id,
              ...cfeData
            }
          })
        }
      }

      // Delete CFE receipts marked for deletion
      const cfesToDelete = data.cfeReceipts
        .filter((c: any) => c._deleted && c.id && !c.id.startsWith('temp-'))
        .map((c: any) => c.id)

      if (cfesToDelete.length > 0) {
        await prisma.cfeReceipt.deleteMany({
          where: { id: { in: cfesToDelete } }
        })
      }
    } else {
      // Backwards compatibility: handle single CFE data (old format)
      const hasCfeData = data.cfeRpu || data.cfeServiceNumber || data.cfeMeterNumber || data.cfeRmu || data.cfeAccountNumber ||
                         data.cfeMeterType || data.cfeTariff || data.cfePhases || data.cfeWires ||
                         data.cfeInstalledLoad || data.cfeContractedDemand || data.cfeVoltageLevel ||
                         data.cfeBranch || data.cfeFolio || data.cfeReceiptFileUrl

      if (hasCfeData) {
        const cfeData = {
          rpu: data.cfeRpu || null,
          serviceNumber: data.cfeServiceNumber || null,
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

        // Check if client already has a CFE receipt
        const existingCfe = await prisma.cfeReceipt.findFirst({
          where: { clientId: params.id }
        })

        if (existingCfe) {
          await prisma.cfeReceipt.update({
            where: { id: existingCfe.id },
            data: cfeData
          })
        } else {
          await prisma.cfeReceipt.create({
            data: {
              clientId: params.id,
              ...cfeData
            }
          })
        }
      }
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