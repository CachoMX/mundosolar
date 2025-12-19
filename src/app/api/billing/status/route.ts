import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateConfig, consultarCreditos, config } from '@/lib/facturalo-plus'

export const dynamic = 'force-dynamic'

// GET /api/billing/status - Check billing configuration status and available credits
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate configuration
    const configValidation = validateConfig()

    // Get available credits if API key is configured
    let credits = null
    let creditsError = null

    if (config.apiKeySet) {
      try {
        const creditosResult = await consultarCreditos()
        if (creditosResult.success) {
          credits = creditosResult.creditosDisponibles
        } else {
          creditsError = creditosResult.error
        }
      } catch (error) {
        creditsError = error instanceof Error ? error.message : 'Error al consultar créditos'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isConfigured: configValidation.isValid,
        missingConfig: configValidation.missing,
        emisor: {
          rfc: config.emisorRfc || null,
          nombre: config.emisorNombre || null,
          codigoPostal: config.emisorCodigoPostal || null
        },
        apiKeySet: config.apiKeySet,
        csdConfigured: config.csdConfigured,
        credits,
        creditsError,
        mode: configValidation.isValid ? 'production' : 'demo'
      }
    })
  } catch (error: any) {
    console.error('Error checking billing status:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
