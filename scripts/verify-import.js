const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyImport() {
  console.log('🔍 Verificando importación...');
  
  const totalClients = await prisma.client.count();
  console.log(`📊 Total clientes: ${totalClients}`);
  
  const withGrowatt = await prisma.client.count({
    where: {
      AND: [
        { growattUsername: { not: null } },
        { growattUsername: { not: '' } }
      ]
    }
  });
  console.log(`🌱 Clientes con Growatt: ${withGrowatt}`);
  
  // Muestra algunos ejemplos
  const sampleClients = await prisma.client.findMany({
    select: {
      firstName: true,
      lastName: true,
      growattUsername: true,
      growattPassword: true
    },
    take: 10
  });
  
  console.log('\n📋 Muestra de 10 clientes:');
  sampleClients.forEach((client, index) => {
    console.log(`${index + 1}. ${client.firstName} ${client.lastName} - User: ${client.growattUsername} | Pass: ${client.growattPassword}`);
  });
  
  await prisma.$disconnect();
}

verifyImport().catch(console.error);