// Test Supabase connection
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...')

    // Test basic query
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`

    console.log('✅ Connected to Supabase successfully!')
    console.log('📊 Database info:', result)

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    console.log(`\n📋 Tables created: ${tables.length}`)
    tables.forEach(t => console.log(`  - ${t.table_name}`))

  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
