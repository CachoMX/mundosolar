import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/clients/[id] - Fetch single client
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()
    if (!session) {
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
        growattUsername: true,
        growattPassword: true,
        expectedDailyGeneration: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
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
    const session = await getServerSession()
    if (!session) {
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
        growattUsername: data.growattUsername || null,
        growattPassword: data.growattPassword || null,
        expectedDailyGeneration: data.expectedDailyGeneration || null,
        notes: data.notes || null,
        isActive: data.isActive
      }
    })

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
    const session = await getServerSession()
    if (!session) {
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