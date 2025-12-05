import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mundosolar.com' },
    update: {},
    create: {
      email: 'admin@mundosolar.com',
      name: 'Administrador',
      role: 'ADMIN',
      employeeId: 'EMP001',
      department: 'Administración',
      isActive: true,
    },
  })

  console.log('👤 Created admin user:', adminUser.email)

  // Create product categories
  const panelCategory = await prisma.productCategory.upsert({
    where: { name: 'Paneles Solares' },
    update: {},
    create: {
      name: 'Paneles Solares',
      description: 'Paneles fotovoltaicos para generación de energía solar',
    },
  })

  const inverterCategory = await prisma.productCategory.upsert({
    where: { name: 'Inversores' },
    update: {},
    create: {
      name: 'Inversores',
      description: 'Inversores para sistemas solares',
    },
  })

  const heaterCategory = await prisma.productCategory.upsert({
    where: { name: 'Calentadores Solares' },
    update: {},
    create: {
      name: 'Calentadores Solares',
      description: 'Calentadores de agua solar',
    },
  })

  const partsCategory = await prisma.productCategory.upsert({
    where: { name: 'Refacciones' },
    update: {},
    create: {
      name: 'Refacciones',
      description: 'Refacciones y accesorios',
    },
  })

  console.log('📦 Created product categories')

  // Create subcategories
  await prisma.productSubCategory.createMany({
    data: [
      { name: 'Monocristalinos', categoryId: panelCategory.id },
      { name: 'Policristalinos', categoryId: panelCategory.id },
      { name: 'Microinversores', categoryId: inverterCategory.id },
      { name: 'Inversores Centrales', categoryId: inverterCategory.id },
      { name: 'Alta Presión', categoryId: heaterCategory.id },
      { name: 'Baja Presión', categoryId: heaterCategory.id },
    ],
  })

  // Create locations
  const mainWarehouse = await prisma.location.upsert({
    where: { name: 'Almacén Principal' },
    update: {},
    create: {
      name: 'Almacén Principal',
      address: 'Av. Principal 123, Ciudad, Estado',
    },
  })

  const secondaryWarehouse = await prisma.location.upsert({
    where: { name: 'Almacén Secundario' },
    update: {},
    create: {
      name: 'Almacén Secundario',
      address: 'Calle Secundaria 456, Ciudad, Estado',
    },
  })

  console.log('📍 Created locations')

  // Create Mexican fiscal regimens (sample)
  const regimenGeneral = await prisma.regimenFiscal.upsert({
    where: { code: '601' },
    update: {},
    create: {
      code: '601',
      descripcion: 'General de Ley Personas Morales',
    },
  })

  const regimenFisica = await prisma.regimenFiscal.upsert({
    where: { code: '605' },
    update: {},
    create: {
      code: '605',
      descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    },
  })

  // Create CFDI usage types
  await prisma.usoCFDI.createMany({
    data: [
      {
        code: 'G01',
        descripcion: 'Adquisición de mercancías',
        regimenFiscalId: regimenGeneral.id,
      },
      {
        code: 'G03',
        descripcion: 'Gastos en general',
        regimenFiscalId: regimenGeneral.id,
      },
      {
        code: 'P01',
        descripcion: 'Por definir',
        regimenFiscalId: regimenFisica.id,
      },
    ],
  })

  console.log('🏛️ Created Mexican fiscal data')

  // Create sample client
  const sampleClient = await prisma.client.create({
    data: {
      firstName: 'Juan',
      lastName: 'Pérez García',
      email: 'juan.perez@ejemplo.com',
      phone: '+52 55 1234 5678',
      address: 'Calle Ejemplo 123',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '01000',
      notes: 'Cliente de ejemplo para el sistema',
      fiscalData: {
        create: {
          razonSocial: 'Juan Pérez García',
          rfc: 'PEGJ800101XXX',
          email: 'facturacion@juanperez.com',
          telefono: '+52 55 1234 5678',
          calle: 'Calle Ejemplo',
          numero: '123',
          colonia: 'Centro',
          codigoPostal: '01000',
          ciudad: 'Ciudad de México',
          estado: 'CDMX',
          regimenFiscalId: regimenFisica.id,
          usoCFDIId: (await prisma.usoCFDI.findFirst({
            where: { code: 'P01' }
          }))!.id,
        },
      },
    },
  })

  console.log('👤 Created sample client:', sampleClient.firstName, sampleClient.lastName)

  // Create sample products
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'Panel Solar 450W Monocristalino',
        brand: 'Canadian Solar',
        model: 'CS6W-450MS',
        capacity: '450W',
        description: 'Panel solar monocristalino de alta eficiencia',
        unitPrice: 3500.00,
        categoryId: panelCategory.id,
      },
      {
        name: 'Microinversor 300W',
        brand: 'Enphase',
        model: 'IQ7-300-M-INT',
        capacity: '300W',
        description: 'Microinversor con monitoreo individual',
        unitPrice: 4200.00,
        categoryId: inverterCategory.id,
      },
      {
        name: 'Calentador Solar 150L',
        brand: 'Cinsa',
        model: 'CS-150-AP',
        capacity: '150L',
        description: 'Calentador solar de alta presión para 4-5 personas',
        unitPrice: 8500.00,
        categoryId: heaterCategory.id,
      },
    ],
  })

  console.log('🛍️ Created sample products')

  // Add inventory items for the products
  const productsList = await prisma.product.findMany()

  if (productsList.length > 0) {
    await prisma.inventoryItem.createMany({
      data: [
        {
          productId: productsList[0].id,
          locationId: mainWarehouse.id,
          quantity: 250,
          unitCost: 3200.00,
          totalCost: 800000.00,
          supplier: 'Distribuidora Solar SA',
          purchaseDate: new Date('2024-01-15'),
        },
        {
          productId: productsList[1].id,
          locationId: mainWarehouse.id,
          quantity: 120,
          unitCost: 4000.00,
          totalCost: 480000.00,
          supplier: 'Enphase Oficial',
          purchaseDate: new Date('2024-02-01'),
        },
        {
          productId: productsList[2].id,
          locationId: secondaryWarehouse.id,
          quantity: 45,
          unitCost: 8000.00,
          totalCost: 360000.00,
          supplier: 'Cinsa Distribuidora',
          purchaseDate: new Date('2024-01-20'),
        },
        {
          productId: productsList[0].id,
          locationId: secondaryWarehouse.id,
          quantity: 8, // Low stock
          unitCost: 3200.00,
          totalCost: 25600.00,
          supplier: 'Distribuidora Solar SA',
          purchaseDate: new Date('2024-03-01'),
          notes: 'Stock bajo - requiere reposición urgente',
        },
      ],
    })
    console.log('📊 Added inventory items')
  }

  // Create more clients with Growatt credentials
  await prisma.client.createMany({
    data: [
      {
        firstName: 'FERNANDO',
        lastName: 'Rodríguez',
        email: 'fernando.rodriguez@example.com',
        phone: '+52 81 2345 6789',
        address: 'Av. Constitución 567',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        rfc: 'ROFE850315XXX',
        growattUsername: 'msgd0w05h',
        growattPassword: 'demo123',
        expectedDailyGeneration: 52.5,
        isActive: true,
      },
      {
        firstName: 'María',
        lastName: 'González',
        email: 'maria.gonzalez@example.com',
        phone: '+52 33 3456 7890',
        address: 'Calle Libertad 890',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
        rfc: 'GOMA900520XXX',
        growattUsername: 'msgcdr02',
        growattPassword: 'demo456',
        expectedDailyGeneration: 38.7,
        isActive: true,
      },
      {
        firstName: 'Carlos',
        lastName: 'Hernández',
        email: 'carlos.hernandez@example.com',
        phone: '+52 55 4567 8901',
        address: 'Paseo de la Reforma 234',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06600',
        rfc: 'HECA880710XXX',
        growattUsername: 'carlos_solar',
        growattPassword: 'demo789',
        expectedDailyGeneration: 65.3,
        isActive: true,
      },
      {
        firstName: 'Ana',
        lastName: 'Martínez',
        email: 'ana.martinez@example.com',
        phone: '+52 81 5678 9012',
        address: 'Blvd. Díaz Ordaz 1234',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64850',
        rfc: 'MARA920825XXX',
        growattUsername: 'ana_energia',
        growattPassword: 'demo321',
        expectedDailyGeneration: 42.8,
        isActive: true,
      },
    ],
  })

  console.log('👥 Created additional clients with Growatt credentials')

  // Create permissions for admin
  await prisma.permission.createMany({
    data: [
      {
        userId: adminUser.id,
        resource: 'clients',
        actions: 'create,read,update,delete',
      },
      {
        userId: adminUser.id,
        resource: 'orders',
        actions: 'create,read,update,delete',
      },
      {
        userId: adminUser.id,
        resource: 'inventory',
        actions: 'create,read,update,delete',
      },
      {
        userId: adminUser.id,
        resource: 'maintenance',
        actions: 'create,read,update,delete',
      },
      {
        userId: adminUser.id,
        resource: 'reports',
        actions: 'create,read,update,delete',
      },
      {
        userId: adminUser.id,
        resource: 'system',
        actions: 'create,read,update,delete',
      },
    ],
  })

  console.log('🔐 Created admin permissions')

  // Create system settings
  await prisma.systemSettings.createMany({
    data: [
      {
        key: 'company_name',
        value: 'MundoSolar',
        description: 'Nombre de la empresa',
      },
      {
        key: 'default_tax_rate',
        value: '0.16',
        type: 'number',
        description: 'IVA por defecto (16%)',
      },
      {
        key: 'default_currency',
        value: 'MXN',
        description: 'Moneda por defecto',
      },
      {
        key: 'company_rfc',
        value: 'MSO123456XXX',
        description: 'RFC de la empresa',
      },
    ],
  })

  console.log('⚙️ Created system settings')
  console.log('✅ Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })