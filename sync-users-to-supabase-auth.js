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

async function syncUsersToSupabaseAuth() {
  console.log('🔄 Sincronizando usuarios de Prisma a Supabase Auth...\n')

  try {
    // Get all users from Prisma
    const prismaUsers = await prisma.user.findMany()
    console.log(`📊 Encontrados ${prismaUsers.length} usuarios en Prisma\n`)

    // Get all users from Supabase Auth
    const { data: authData } = await supabase.auth.admin.listUsers()
    const authEmails = new Set(authData.users.map(u => u.email))
    const authIds = new Set(authData.users.map(u => u.id))

    let created = 0
    let skipped = 0
    let errors = 0

    for (const user of prismaUsers) {
      // Skip if user already exists in Supabase Auth (by ID or email)
      if (authIds.has(user.id) || authEmails.has(user.email)) {
        console.log(`⏭️  Saltando ${user.email} - ya existe en Supabase Auth`)
        skipped++
        continue
      }

      console.log(`➕ Creando usuario en Supabase Auth: ${user.email}`)

      // Generate a temporary password (user should reset it)
      const tempPassword = 'TempPass123!'

      try {
        // Create user in Supabase Auth with the SAME ID from Prisma
        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role,
            department: user.department,
            employeeId: user.employeeId
          }
        })

        if (createError) {
          console.error(`   ❌ Error: ${createError.message}`)
          errors++
          continue
        }

        // Update Prisma user with Supabase Auth ID if different
        if (newAuthUser.user.id !== user.id) {
          console.log(`   🔄 Actualizando ID en Prisma de ${user.id} a ${newAuthUser.user.id}`)
          await prisma.user.update({
            where: { id: user.id },
            data: { id: newAuthUser.user.id }
          })
        }

        console.log(`   ✅ Usuario creado exitosamente`)
        console.log(`   🔑 Password temporal: ${tempPassword}\n`)
        created++
      } catch (error) {
        console.error(`   ❌ Error al crear usuario: ${error.message}\n`)
        errors++
      }
    }

    console.log('\n📈 Resumen:')
    console.log(`   ✅ Creados: ${created}`)
    console.log(`   ⏭️  Saltados: ${skipped}`)
    console.log(`   ❌ Errores: ${errors}`)

    if (created > 0) {
      console.log('\n⚠️  IMPORTANTE: Los usuarios creados tienen password temporal "TempPass123!"')
      console.log('   Los usuarios deben cambiar su contraseña en el primer inicio de sesión.')
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await prisma.$disconnect()
  }
}

syncUsersToSupabaseAuth()
  .then(() => {
    console.log('\n✅ Sincronización completa')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
