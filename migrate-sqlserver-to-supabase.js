/**
 * Data Migration Script: SQL Server → Supabase (PostgreSQL)
 */

const { PrismaClient } = require('@prisma/client')
const sql = require('mssql')

// Supabase (PostgreSQL) - Target database
const prisma = new PrismaClient()

// SQL Server connection config
const sqlConfig = {
  user: 'benjaise_sqluser2',
  password: 'Aragon21!',
  server: '192.185.7.4',
  database: 'benjaise_mundosolar',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
}

async function migrateData() {
  console.log('🚀 Starting data migration from SQL Server to Supabase...\n')

  let pool
  try {
    // Connect to SQL Server
    console.log('🔌 Connecting to SQL Server...')
    pool = await sql.connect(sqlConfig)
    console.log('✅ Connected to SQL Server')

    // Test Supabase
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Connected to Supabase\n')

    // 1. Migrate Clients
    console.log('👥 Migrating Clients...')
    const clientsResult = await pool.request().query('SELECT * FROM clients')
    console.log(`   Found ${clientsResult.recordset.length} clients in SQL Server`)

    for (const client of clientsResult.recordset) {
      await prisma.client.upsert({
        where: { email: client.email },
        update: {
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          postalCode: client.postalCode,
          notes: client.notes,
          isActive: client.isActive,
          rfc: client.rfc,
          curp: client.curp,
          regimenFiscal: client.regimenFiscal,
          neighborhood: client.neighborhood,
          growattUsername: client.growattUsername,
          growattPassword: client.growattPassword,
          expectedDailyGeneration: client.expectedDailyGeneration
        },
        create: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          postalCode: client.postalCode,
          notes: client.notes,
          profileImage: client.profileImage,
          isActive: client.isActive,
          rfc: client.rfc,
          curp: client.curp,
          regimenFiscal: client.regimenFiscal,
          neighborhood: client.neighborhood,
          growattUsername: client.growattUsername,
          growattPassword: client.growattPassword,
          expectedDailyGeneration: client.expectedDailyGeneration,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        }
      })
    }
    console.log(`✅ Migrated ${clientsResult.recordset.length} clients\n`)

    // 2. Migrate Product Categories
    console.log('📦 Migrating Product Categories...')
    const categoriesResult = await pool.request().query('SELECT * FROM product_categories')
    console.log(`   Found ${categoriesResult.recordset.length} categories`)

    for (const cat of categoriesResult.recordset) {
      await prisma.productCategory.upsert({
        where: { name: cat.name },
        update: {
          description: cat.description,
          isActive: cat.isActive
        },
        create: {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          isActive: cat.isActive
        }
      })
    }
    console.log(`✅ Migrated ${categoriesResult.recordset.length} categories\n`)

    // 3. Migrate Locations
    console.log('📍 Migrating Locations...')
    const locationsResult = await pool.request().query('SELECT * FROM locations')
    console.log(`   Found ${locationsResult.recordset.length} locations`)

    for (const loc of locationsResult.recordset) {
      await prisma.location.upsert({
        where: { name: loc.name },
        update: {
          address: loc.address,
          isActive: loc.isActive
        },
        create: {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          isActive: loc.isActive
        }
      })
    }
    console.log(`✅ Migrated ${locationsResult.recordset.length} locations\n`)

    // 4. Migrate Products
    console.log('🛍️ Migrating Products...')
    const productsResult = await pool.request().query('SELECT * FROM products')
    console.log(`   Found ${productsResult.recordset.length} products`)

    for (const product of productsResult.recordset) {
      // Skip if missing required fields
      if (!product.id || !product.name || !product.categoryId) {
        console.log(`   ⚠️ Skipping product - missing required fields:`, { id: product.id, name: product.name, categoryId: product.categoryId })
        continue
      }

      try {
        await prisma.product.upsert({
          where: { id: product.id },
          update: {},
          create: {
            id: product.id,
            name: product.name,
            brand: product.brand,
            model: product.model,
            capacity: product.capacity,
            description: product.description,
            unitPrice: product.unitPrice,
            categoryId: product.categoryId,
            subCategoryId: product.subCategoryId,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
          }
        })
      } catch (error) {
        console.log(`   ⚠️ Failed to migrate product ${product.name}: ${error.message}`)
      }
    }
    console.log(`✅ Migrated products\n`)

    // 5. Migrate Inventory Items
    console.log('📊 Migrating Inventory Items...')
    const inventoryResult = await pool.request().query('SELECT * FROM inventory_items')
    console.log(`   Found ${inventoryResult.recordset.length} inventory items`)

    for (const item of inventoryResult.recordset) {
      try {
        await prisma.inventoryItem.upsert({
          where: { id: item.id },
          update: {},
          create: {
            id: item.id,
            productId: item.productId,
            locationId: item.locationId,
            quantity: item.quantity,
            serialNumber: item.serialNumber,
            invoiceNumber: item.invoiceNumber,
            purchaseDate: item.purchaseDate,
            supplier: item.supplier,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          }
        })
      } catch (error) {
        console.log(`   ⚠️ Skipping item ${item.id}: ${error.message}`)
      }
    }
    console.log(`✅ Migrated inventory items\n`)

    // Summary
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Clients: ${clientsResult.recordset.length}`)
    console.log(`   - Product Categories: ${categoriesResult.recordset.length}`)
    console.log(`   - Locations: ${locationsResult.recordset.length}`)
    console.log(`   - Products: ${productsResult.recordset.length}`)
    console.log(`   - Inventory Items: ${inventoryResult.recordset.length}`)

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
  } finally {
    // Close connections
    if (pool) {
      await pool.close()
    }
    await prisma.$disconnect()
  }
}

migrateData()
