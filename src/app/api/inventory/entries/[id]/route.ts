import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/inventory/entries/[id] - Get inventory item details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: params.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
            capacity: true,
            unitPrice: true,
            category: {
              select: { id: true, name: true }
            }
          }
        },
        location: {
          select: { id: true, name: true, address: true }
        }
      }
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, error: 'Item de inventario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inventoryItem.id,
        productId: inventoryItem.productId,
        locationId: inventoryItem.locationId,
        quantity: inventoryItem.quantity,
        serialNumber: inventoryItem.serialNumber,
        invoiceNumber: inventoryItem.invoiceNumber,
        invoiceUrl: inventoryItem.invoiceUrl,
        purchaseDate: inventoryItem.purchaseDate,
        supplier: inventoryItem.supplier,
        unitCost: inventoryItem.unitCost ? Number(inventoryItem.unitCost) : null,
        totalCost: inventoryItem.totalCost ? Number(inventoryItem.totalCost) : null,
        notes: inventoryItem.notes,
        createdAt: inventoryItem.createdAt,
        updatedAt: inventoryItem.updatedAt,
        product: inventoryItem.product,
        location: inventoryItem.location
      }
    })
  } catch (error: any) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener el item de inventario' },
      { status: 500 }
    )
  }
}

// PATCH /api/inventory/entries/[id] - Update inventory item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    })

    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar inventario' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      serialNumber,
      invoiceNumber,
      invoiceUrl,
      purchaseDate,
      supplier,
      unitCost,
      notes
    } = body

    // Get existing item
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: params.id }
    })

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Item de inventario no encontrado' },
        { status: 404 }
      )
    }

    // Calculate new total cost if unit cost changed
    let newTotalCost: number | null = null
    if (unitCost !== undefined) {
      newTotalCost = unitCost ? unitCost * existingItem.quantity : null
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        ...(serialNumber !== undefined && { serialNumber }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(invoiceUrl !== undefined && { invoiceUrl }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(supplier !== undefined && { supplier }),
        ...(unitCost !== undefined && { unitCost }),
        ...(newTotalCost !== null && { totalCost: newTotalCost }),
        ...(notes !== undefined && { notes })
      },
      include: {
        product: {
          select: { id: true, name: true, brand: true, model: true }
        },
        location: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedItem.id,
        productId: updatedItem.productId,
        locationId: updatedItem.locationId,
        quantity: updatedItem.quantity,
        serialNumber: updatedItem.serialNumber,
        invoiceNumber: updatedItem.invoiceNumber,
        invoiceUrl: updatedItem.invoiceUrl,
        purchaseDate: updatedItem.purchaseDate,
        supplier: updatedItem.supplier,
        unitCost: updatedItem.unitCost ? Number(updatedItem.unitCost) : null,
        totalCost: updatedItem.totalCost ? Number(updatedItem.totalCost) : null,
        notes: updatedItem.notes,
        product: updatedItem.product,
        location: updatedItem.location
      }
    })
  } catch (error: any) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar el item de inventario' },
      { status: 500 }
    )
  }
}
