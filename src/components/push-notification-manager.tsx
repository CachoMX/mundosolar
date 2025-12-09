'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showPrompt, setShowPrompt] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)

      // Show prompt after 10 seconds if not decided
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
          const dismissed = localStorage.getItem('push-notification-dismissed')
          if (!dismissed) {
            setShowPrompt(true)
          }
        }, 10000)
        return () => clearTimeout(timer)
      }

      // Get existing subscription
      if (Notification.permission === 'granted') {
        getSubscription()
      }
    }
  }, [])

  const getSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Error getting subscription:', error)
    }
  }

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        await subscribeToPush()
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
    }
  }

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      // VAPID public key - you'll need to generate this
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmThrerBm_-LCcHzDgN0Z8_MDWJ1LH0QSLOC4LqZGEGVXCCyXMbw'

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Send subscription to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      })

      setSubscription(subscription)
    } catch (error) {
      console.error('Error subscribing to push:', error)
    }
  }

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe()

        // Remove from backend
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })

        setSubscription(null)
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
    }
  }

  const dismissPrompt = () => {
    setShowPrompt(false)
    localStorage.setItem('push-notification-dismissed', 'true')
  }

  if (!showPrompt || permission !== 'default') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-2 border-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Notificaciones Push</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={dismissPrompt}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Recibe notificaciones instantáneas sobre mantenimientos, cambios de estado y más
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={requestPermission}
              className="flex-1"
            >
              <Bell className="mr-2 h-4 w-4" />
              Activar
            </Button>
            <Button
              variant="outline"
              onClick={dismissPrompt}
              className="flex-1"
            >
              Más tarde
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Settings component for managing notifications
export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      if (Notification.permission === 'granted') {
        getSubscription()
      }
    }
  }, [])

  const getSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Error getting subscription:', error)
    }
  }

  const toggleNotifications = async () => {
    if (subscription) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  const subscribe = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmThrerBm_-LCcHzDgN0Z8_MDWJ1LH0QSLOC4LqZGEGVXCCyXMbw'

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub)
        })

        setSubscription(sub)
      }
    } catch (error) {
      console.error('Error subscribing:', error)
    }
  }

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe()

        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })

        setSubscription(null)
      }
    } catch (error) {
      console.error('Error unsubscribing:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones Push</CardTitle>
        <CardDescription>
          Recibe alertas instantáneas en tu dispositivo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {subscription ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
            </p>
            <p className="text-xs text-muted-foreground">
              {permission === 'granted'
                ? 'Recibirás alertas sobre mantenimientos y actualizaciones'
                : permission === 'denied'
                ? 'Los permisos fueron denegados. Actívalos en la configuración del navegador.'
                : 'Activa las notificaciones para estar al día'}
            </p>
          </div>
          <Button
            onClick={toggleNotifications}
            variant={subscription ? 'destructive' : 'default'}
            disabled={permission === 'denied'}
          >
            {subscription ? (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Desactivar
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Activar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
