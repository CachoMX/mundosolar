const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

async function checkClients() {
  const clients = await prisma.client.findMany({
    select: {
      firstName: true,
      lastName: true,
      growattUsername: true,
      growattPassword: true,
      expectedDailyGeneration: true,
      city: true
    },
    where: {
      growattUsername: {
        not: null
      }
    }
  })

  console.log(`\n📊 Total clients with Growatt credentials: ${clients.length}\n`)

  clients.slice(0, 15).forEach((c, i) => {
    console.log(`${i + 1}. ${c.firstName} ${c.lastName} (${c.city})`)
    console.log(`   Username: ${c.growattUsername}`)
    console.log(`   Password: ${c.growattPassword ? '***' + c.growattPassword.slice(-4) : 'N/A'}`)
    console.log(`   Expected: ${c.expectedDailyGeneration || 'N/A'} kWh/día\n`)
  })

  await prisma.$disconnect()
}

checkClients()
