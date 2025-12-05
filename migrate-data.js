/**
 * Data Migration Script: SQL Server → Supabase (PostgreSQL)
 *
 * This script connects to both databases and migrates all data
 */

const { PrismaClient } = require('@prisma/client')
const sql = require('mssql')

// Supabase (PostgreSQL) - Target database (uses current Prisma client)
const supabase = new PrismaClient()

// SQL Server connection config
const sqlServerConfig = {
  user: 'benjaise_sqluser2',
  password: 'Aragon21!',
  server: '192.185.7.4',
  database: 'benjaise_mundosolar',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
}

async function migrateData() {
  console.log('🚀 Starting data migration from SQL Server to Supabase...\n')

  try {
    // Test connections
    console.log('🔍 Testing database connections...')
    await sqlserver.$queryRaw`SELECT 1 as test`
    console.log('✅ SQL Server connected')

    await supabase.$queryRaw`SELECT 1 as test`
    console.log('✅ Supabase connected\n')

    // 1. Migrate Users
    console.log('👤 Migrating Users...')
    const users = await sqlserver.user.findMany()
    console.log(`   Found ${users.length} users in SQL Server`)

    for (const user of users) {
      await supabase.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          role: user.role,
          isActive: user.isActive,
          employeeId: user.employeeId,
          department: user.department,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })
    }
    console.log(`✅ Migrated ${users.length} users\n`)

    // 2. Migrate Product Categories
    console.log('📦 Migrating Product Categories...')
    const categories = await sqlserver.productCategory.findMany()
    console.log(`   Found ${categories.length} categories`)

    for (const category of categories) {
      await supabase.productCategory.upsert({
        where: { id: category.id },
        update: {},
        create: {
          id: category.id,
          name: category.name,
          description: category.description,
          isActive: category.isActive
        }
      })
    }
    console.log(`✅ Migrated ${categories.length} categories\n`)

    // 3. Migrate Product SubCategories
    console.log('📦 Migrating Product SubCategories...')
    const subCategories = await sqlserver.productSubCategory.findMany()
    console.log(`   Found ${subCategories.length} subcategories`)

    for (const subCat of subCategories) {
      await supabase.productSubCategory.upsert({
        where: { id: subCat.id },
        update: {},
        create: {
          id: subCat.id,
          name: subCat.name,
          categoryId: subCat.categoryId,
          isActive: subCat.isActive
        }
      })
    }
    console.log(`✅ Migrated ${subCategories.length} subcategories\n`)

    // 4. Migrate Locations
    console.log('📍 Migrating Locations...')
    const locations = await sqlserver.location.findMany()
    console.log(`   Found ${locations.length} locations`)

    for (const location of locations) {
      await supabase.location.upsert({
        where: { id: location.id },
        update: {},
        create: {
          id: location.id,
          name: location.name,
          address: location.address,
          isActive: location.isActive
        }
      })
    }
    console.log(`✅ Migrated ${locations.length} locations\n`)

    // 5. Migrate Regimen Fiscal
    console.log('🏛️ Migrating Regimen Fiscal...')
    const regimenes = await sqlserver.regimenFiscal.findMany()
    console.log(`   Found ${regimenes.length} regimenes fiscales`)

    for (const regimen of regimenes) {
      await supabase.regimenFiscal.upsert({
        where: { id: regimen.id },
        update: {},
        create: {
          id: regimen.id,
          code: regimen.code,
          descripcion: regimen.descripcion,
          isActive: regimen.isActive
        }
      })
    }
    console.log(`✅ Migrated ${regimenes.length} regimenes fiscales\n`)

    // 6. Migrate Uso CFDI
    console.log('📄 Migrating Uso CFDI...')
    const usosCFDI = await sqlserver.usoCFDI.findMany()
    console.log(`   Found ${usosCFDI.length} usos CFDI`)

    for (const uso of usosCFDI) {
      await supabase.usoCFDI.upsert({
        where: { id: uso.id },
        update: {},
        create: {
          id: uso.id,
          code: uso.code,
          descripcion: uso.descripcion,
          regimenFiscalId: uso.regimenFiscalId,
          isActive: uso.isActive
        }
      })
    }
    console.log(`✅ Migrated ${usosCFDI.length} usos CFDI\n`)

    // 7. Migrate Clients
    console.log('👥 Migrating Clients...')
    const clients = await sqlserver.client.findMany()
    console.log(`   Found ${clients.length} clients`)

    for (const client of clients) {
      await supabase.client.upsert({
        where: { id: client.id },
        update: {},
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
    console.log(`✅ Migrated ${clients.length} clients\n`)

    // 8. Migrate Products
    console.log('🛍️ Migrating Products...')
    const products = await sqlserver.product.findMany()
    console.log(`   Found ${products.length} products`)

    for (const product of products) {
      await supabase.product.upsert({
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
    }
    console.log(`✅ Migrated ${products.length} products\n`)

    // 9. Migrate Inventory Items
    console.log('📊 Migrating Inventory Items...')
    const inventoryItems = await sqlserver.inventoryItem.findMany()
    console.log(`   Found ${inventoryItems.length} inventory items`)

    for (const item of inventoryItems) {
      await supabase.inventoryItem.upsert({
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
    }
    console.log(`✅ Migrated ${inventoryItems.length} inventory items\n`)

    // 10. Migrate Inventory Movements
    console.log('🔄 Migrating Inventory Movements...')
    const movements = await sqlserver.inventoryMovement.findMany()
    console.log(`   Found ${movements.length} movements`)

    for (const movement of movements) {
      await supabase.inventoryMovement.create({
        data: {
          id: movement.id,
          type: movement.type,
          quantity: movement.quantity,
          fromItemId: movement.fromItemId,
          toItemId: movement.toItemId,
          orderId: movement.orderId,
          maintenanceId: movement.maintenanceId,
          reason: movement.reason,
          notes: movement.notes,
          createdAt: movement.createdAt,
          createdBy: movement.createdBy
        }
      })
    }
    console.log(`✅ Migrated ${movements.length} movements\n`)

    // 11. Migrate Permissions
    console.log('🔐 Migrating Permissions...')
    const permissions = await sqlserver.permission.findMany()
    console.log(`   Found ${permissions.length} permissions`)

    for (const permission of permissions) {
      await supabase.permission.upsert({
        where: { id: permission.id },
        update: {},
        create: {
          id: permission.id,
          userId: permission.userId,
          resource: permission.resource,
          actions: permission.actions
        }
      })
    }
    console.log(`✅ Migrated ${permissions.length} permissions\n`)

    // 12. Migrate System Settings
    console.log('⚙️ Migrating System Settings...')
    const settings = await sqlserver.systemSettings.findMany()
    console.log(`   Found ${settings.length} settings`)

    for (const setting of settings) {
      await supabase.systemSettings.upsert({
        where: { id: setting.id },
        update: {},
        create: {
          id: setting.id,
          key: setting.key,
          value: setting.value,
          type: setting.type,
          description: setting.description,
          updatedAt: setting.updatedAt
        }
      })
    }
    console.log(`✅ Migrated ${settings.length} settings\n`)

    // Summary
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Users: ${users.length}`)
    console.log(`   - Clients: ${clients.length}`)
    console.log(`   - Product Categories: ${categories.length}`)
    console.log(`   - Products: ${products.length}`)
    console.log(`   - Inventory Items: ${inventoryItems.length}`)
    console.log(`   - Inventory Movements: ${movements.length}`)
    console.log(`   - Locations: ${locations.length}`)
    console.log(`   - Permissions: ${permissions.length}`)
    console.log(`   - System Settings: ${settings.length}`)

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
  } finally {
    await sqlserver.$disconnect()
    await supabase.$disconnect()
  }
}

migrateData()
