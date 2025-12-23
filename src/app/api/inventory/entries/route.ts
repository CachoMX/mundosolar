import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET /api/inventory/entries - Get all inventory items with details
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

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const locationId = searchParams.get('locationId')
    const serialNumber = searchParams.get('serialNumber')

    const where: any = {}
    if (productId) where.productId = productId
    if (locationId) where.locationId = locationId
    if (serialNumber) where.serialNumber = serialNumber

    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
            category: {
              select: { id: true, name: true }
            },
            subCategory: {
              select: { id: true, name: true }
            }
          }
        },
        location: {
          select: { id: true, name: true, address: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: inventoryItems.map(item => ({
        id: item.id,
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity,
        serialNumber: item.serialNumber,
        invoiceNumber: item.invoiceNumber,
        invoiceUrl: item.invoiceUrl,
        purchaseDate: item.purchaseDate,
        supplier: item.supplier,
        unitCost: item.unitCost ? Number(item.unitCost) : null,
        totalCost: item.totalCost ? Number(item.totalCost) : null,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: item.product,
        location: item.location
      }))
    })
  } catch (error: any) {
    console.error('Error fetching inventory entries:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener entradas de inventario' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/entries - Create a new inventory entry (add stock)
export async function POST(request: NextRequest) {
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
        { success: false, error: 'No tienes permisos para agregar inventario' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      productId,
      locationId,
      quantity,
      serialNumber,
      invoiceNumber,
      invoiceUrl,
      purchaseDate,
      supplier,
      unitCost,
      notes
    } = body

    // Validate required fields
    if (!productId || !locationId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Producto, ubicación y cantidad son requeridos' },
        { status: 400 }
      )
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Ubicación no encontrada' },
        { status: 404 }
      )
    }

    // Calculate total cost
    const totalCost = unitCost && quantity ? unitCost * quantity : null

    // Check if inventory item already exists for this product+location+serialNumber combination
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        locationId,
        serialNumber: serialNumber || null
      }
    })

    let inventoryItem
    let movement

    if (existingItem && !serialNumber) {
      // If item exists without serial number, update quantity
      inventoryItem = await prisma.$transaction(async (tx) => {
        const updated = await tx.inventoryItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
            // Update invoice info if provided
            ...(invoiceNumber && { invoiceNumber }),
            ...(invoiceUrl && { invoiceUrl }),
            ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
            ...(supplier && { supplier }),
            ...(unitCost && { unitCost }),
            ...(totalCost && { totalCost: (Number(existingItem.totalCost) || 0) + totalCost }),
            ...(notes && { notes })
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

        // Create movement record
        await tx.inventoryMovement.create({
          data: {
            type: 'PURCHASE',
            quantity,
            toItemId: existingItem.id,
            reason: 'Entrada de inventario',
            notes: `Factura: ${invoiceNumber || 'N/A'}, Proveedor: ${supplier || 'N/A'}`,
            createdBy: user.id
          }
        })

        return updated
      })
    } else {
      // Create new inventory item
      inventoryItem = await prisma.$transaction(async (tx) => {
        const newItem = await tx.inventoryItem.create({
          data: {
            productId,
            locationId,
            quantity,
            serialNumber: serialNumber || null,
            invoiceNumber: invoiceNumber || null,
            invoiceUrl: invoiceUrl || null,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            supplier: supplier || null,
            unitCost: unitCost || null,
            totalCost: totalCost,
            notes: notes || null
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

        // Create movement record
        await tx.inventoryMovement.create({
          data: {
            type: 'PURCHASE',
            quantity,
            toItemId: newItem.id,
            reason: 'Entrada de inventario',
            notes: `Factura: ${invoiceNumber || 'N/A'}, Proveedor: ${supplier || 'N/A'}`,
            createdBy: user.id
          }
        })

        return newItem
      })
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
        product: inventoryItem.product,
        location: inventoryItem.location
      },
      message: `Se agregaron ${quantity} unidades de ${product.name} al inventario`
    })
  } catch (error: any) {
    console.error('Error creating inventory entry:', error)

    // Check for unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Ya existe un item de inventario con ese número de serie en esa ubicación' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear entrada de inventario' },
      { status: 500 }
    )
  }
}
