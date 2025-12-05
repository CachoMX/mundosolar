'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, Sun } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }

    checkSession()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <Sun className="h-16 w-16 text-yellow-500 animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">MundoSolar</h1>
        <p className="text-gray-600 mb-8">Sistema de Gestión Solar</p>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">Cargando...</span>
        </div>
      </div>
    </div>
  )
}