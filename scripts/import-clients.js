const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Lista de usuarios que sabemos que son credenciales válidas de Growatt
const GROWATT_USERS = [
  'cachomx', 'azalea83', 'casasilvia1', 'enrique.anaya', 'padredavid',
  'juan carlos 89', 'branko ensaladas', 'colima_capital', 'red mesh',
  'barrenecheamzo', 'llanteras el güero', 'alamandashotel', 'torre medica sendera',
  'cred alberca', 'cred clinica', 'barrenecheatmps', 'marco echeveste local',
  'auto ballesteros', 'lily fernanda castro', 'casa club real hacienda',
  'jchaire'
];

function isGrowattCredential(usuario) {
  if (!usuario) return false;
  return GROWATT_USERS.includes(usuario.toLowerCase());
}

function mapClientType(tipoPersona) {
  return tipoPersona === 'Física' ? 'personal' : 'business';
}

function generateEmail(nombre, apellido, tipoPersona) {
  if (tipoPersona === 'Moral') {
    // Para empresas, usar el nombre como base
    const cleanName = nombre.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    return `contacto@${cleanName}.com`;
  } else {
    // Para personas físicas
    const cleanNombre = nombre.toLowerCase().replace(/[^a-z]/g, '');
    const cleanApellido = apellido ? apellido.toLowerCase().replace(/[^a-z]/g, '') : '';
    return cleanApellido ? 
      `${cleanNombre}.${cleanApellido}@example.com` : 
      `${cleanNombre}@example.com`;
  }
}

function estimateDailyGeneration() {
  // Generar una estimación aleatoria entre 15-35 kWh para clientes con Growatt
  return parseFloat((Math.random() * (35 - 15) + 15).toFixed(1));
}

async function importClients() {
  console.log('🚀 Iniciando importación de clientes...');
  
  const clients = [];
  const csvPath = 'C:\\Projects\\clientes_limpios.csv';
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Saltar filas vacías
        if (!row.nombre && !row.apellido) return;
        
        const isGrowatt = isGrowattCredential(row.usuario);
        const clientType = mapClientType(row.tipo_persona);
        
        const client = {
          // Información básica
          type: clientType,
          firstName: clientType === 'business' ? row.nombre : row.nombre,
          lastName: clientType === 'business' ? '' : (row.apellido || ''),
          businessName: clientType === 'business' ? row.nombre : '',
          email: row.correo || generateEmail(row.nombre, row.apellido, row.tipo_persona),
          phone: row.telefono || '',
          
          // Información fiscal (valores por defecto para México)
          rfc: '',
          curp: '',
          regimenFiscal: clientType === 'business' ? 
            '601 - General de Ley Personas Morales' : 
            '612 - Personas Físicas con Actividades Empresariales y Profesionales',
          
          // Dirección (datos por defecto de Colima)
          address: '',
          neighborhood: '',
          city: 'Colima',
          state: 'Colima',
          postalCode: '28000',
          country: 'México',
          
          // Growatt (todos los usuarios del CSV tienen credenciales)
          growattUsername: row.usuario || '',
          growattPassword: row.contrasena || '',
          expectedDailyGeneration: row.usuario ? estimateDailyGeneration() : null,
          
          // Notas
          notes: row.notas || ''
        };
        
        clients.push(client);
      })
      .on('end', async () => {
        console.log(`📊 Procesados ${clients.length} clientes del CSV`);
        console.log(`🌱 ${clients.filter(c => c.growattUsername && c.growattUsername !== '').length} clientes tienen credenciales de Growatt`);
        
        try {
          // Importar en lotes para mejor rendimiento
          const batchSize = 10;
          let imported = 0;
          
          for (let i = 0; i < clients.length; i += batchSize) {
            const batch = clients.slice(i, i + batchSize);
            
            for (const client of batch) {
              try {
                await prisma.client.create({
                  data: {
                    firstName: client.firstName,
                    lastName: client.lastName,
                    email: client.email,
                    phone: client.phone,
                    address: client.address,
                    neighborhood: client.neighborhood,
                    city: client.city,
                    state: client.state,
                    postalCode: client.postalCode,
                    rfc: client.rfc,
                    curp: client.curp,
                    regimenFiscal: client.regimenFiscal,
                    growattUsername: client.growattUsername || null,
                    growattPassword: client.growattPassword || null,
                    expectedDailyGeneration: client.expectedDailyGeneration,
                    notes: client.notes,
                    isActive: true
                  }
                });
                imported++;
                
                if (imported % 10 === 0) {
                  console.log(`✅ Importados ${imported}/${clients.length} clientes...`);
                }
              } catch (error) {
                console.error(`❌ Error importando cliente ${client.firstName}:`, error.message);
              }
            }
          }
          
          console.log(`🎉 ¡Importación completada!`);
          console.log(`✅ ${imported} clientes importados exitosamente`);
          
          // Mostrar estadísticas
          const totalClients = await prisma.client.count();
          const growattClients = await prisma.client.count({
            where: {
              AND: [
                { growattUsername: { not: null } },
                { growattUsername: { not: '' } }
              ]
            }
          });
          
          console.log(`📈 Total de clientes en la base: ${totalClients}`);
          console.log(`🌱 Clientes con Growatt: ${growattClients}`);
          
          resolve();
        } catch (error) {
          console.error('❌ Error durante la importación:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('❌ Error leyendo el CSV:', error);
        reject(error);
      });
  });
}

// Ejecutar la importación
importClients()
  .catch(console.error)
  .finally(() => prisma.$disconnect());