require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUsers() {
  console.log('🔍 Verificando usuarios en Supabase Auth...\n')

  // Get all users from Supabase Auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Error al obtener usuarios de Supabase Auth:', authError)
    return
  }

  console.log(`📊 Total usuarios en Supabase Auth: ${authUsers.users.length}\n`)

  if (authUsers.users.length === 0) {
    console.log('⚠️  No hay usuarios en Supabase Auth')
  } else {
    authUsers.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Creado: ${user.created_at}`)
      console.log(`   Metadata:`, user.user_metadata)
      console.log('')
    })
  }
}

checkUsers()
  .then(() => {
    console.log('✅ Verificación completa')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
