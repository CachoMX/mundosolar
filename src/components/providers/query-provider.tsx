'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tiempo que los datos se consideran "frescos" (no refetch automático)
            staleTime: 5 * 60 * 1000, // 5 minutos
            // Tiempo que los datos se mantienen en cache después de que el componente se desmonta
            gcTime: 10 * 60 * 1000, // 10 minutos (antes llamado cacheTime)
            // No refetch automático en focus de ventana
            refetchOnWindowFocus: false,
            // Reintentar 1 vez en caso de error
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
