const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🔐 Creando usuario administrador...');
  
  try {
    // Verificar si el usuario admin ya existe
    const existingUser = await prisma.user.findUnique({
      where: {
        email: 'admin@mundosolar.com'
      }
    });
    
    if (existingUser) {
      console.log('✅ El usuario admin ya existe');
      console.log(`📧 Email: admin@mundosolar.com`);
      console.log(`🔑 Password: admin123`);
      return;
    }
    
    // Crear el usuario administrador
    const adminUser = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@mundosolar.com',
        role: 'ADMIN',
        isActive: true,
        department: 'Administración',
        employeeId: 'ADM001'
      }
    });
    
    console.log('🎉 Usuario administrador creado exitosamente!');
    console.log('📧 Email: admin@mundosolar.com');
    console.log('🔑 Password: admin123');
    console.log(`👤 ID: ${adminUser.id}`);
    console.log(`🏢 Departamento: ${adminUser.department}`);
    console.log(`🆔 Employee ID: ${adminUser.employeeId}`);
    
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
  }
}

// Ejecutar la creación
createAdminUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());