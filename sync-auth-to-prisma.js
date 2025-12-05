require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function syncAuthToPrisma() {
  console.log('🔄 Sincronizando usuarios de Supabase Auth a Prisma...\n')

  try {
    // Get all users from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error al obtener usuarios de Supabase Auth:', authError)
      return
    }

    console.log(`📊 Encontrados ${authData.users.length} usuarios en Supabase Auth\n`)

    // Get all users from Prisma
    const prismaUsers = await prisma.user.findMany()
    const prismaIds = new Set(prismaUsers.map(u => u.id))

    let created = 0
    let skipped = 0
    let errors = 0

    for (const authUser of authData.users) {
      // Skip if user already exists in Prisma
      if (prismaIds.has(authUser.id)) {
        console.log(`⏭️  Saltando ${authUser.email} - ya existe en Prisma`)
        skipped++
        continue
      }

      console.log(`➕ Creando usuario en Prisma: ${authUser.email}`)

      try {
        const newPrismaUser = await prisma.user.create({
          data: {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email.split('@')[0],
            role: authUser.user_metadata?.role || 'USER',
            department: authUser.user_metadata?.department || null,
            employeeId: authUser.user_metadata?.employeeId || null,
            isActive: true,
            emailVerified: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null
          }
        })

        console.log(`   ✅ Usuario creado exitosamente en Prisma`)
        console.log(`   ID: ${newPrismaUser.id}`)
        console.log(`   Rol: ${newPrismaUser.role}\n`)
        created++
      } catch (error) {
        console.error(`   ❌ Error al crear usuario en Prisma: ${error.message}\n`)
        errors++
      }
    }

    console.log('\n📈 Resumen:')
    console.log(`   ✅ Creados en Prisma: ${created}`)
    console.log(`   ⏭️  Saltados: ${skipped}`)
    console.log(`   ❌ Errores: ${errors}`)

  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

syncAuthToPrisma()
  .then(() => {
    console.log('\n✅ Sincronización completa')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
