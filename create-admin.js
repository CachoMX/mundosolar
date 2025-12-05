// Script para crear el primer usuario admin
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  const email = 'admin@mundosolar.com'
  const password = 'admin123'
  const name = 'Administrador'

  console.log('🔐 Creando usuario administrador...')
  console.log(`📧 Email: ${email}`)
  console.log(`🔑 Password: ${password}`)
  console.log('')

  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'ADMIN'
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  El usuario ya existe en Supabase Auth')
        console.log(`✅ Puedes hacer login con: ${email} / ${password}`)
        return
      }
      throw authError
    }

    console.log('✅ Usuario creado en Supabase Auth')
    console.log(`   ID: ${authData.user.id}`)
    console.log('')
    console.log('🎉 ¡Listo! Ahora puedes hacer login:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

createAdminUser()
