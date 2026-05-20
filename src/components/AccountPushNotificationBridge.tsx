import { useEffect } from 'react'
import { accountApi } from '../lib/api'
import { API_BASE_URL } from '../lib/api-client'
import {
  configurePushServiceWorker,
  disableLocalPushSubscription,
  ensureBrowserPushSetup,
  getBrowserNotificationPermission,
} from '../lib/browser-notifications'
import { useAuth } from '../contexts/AuthContext'

export function AccountPushNotificationBridge() {
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    let cancelled = false

    const syncPushState = async () => {
      if (!isAuthenticated || !user?.id) {
        await disableLocalPushSubscription()
        return
      }

      if (getBrowserNotificationPermission() !== 'granted') {
        return
      }

      try {
        const [preferences, pushConfig] = await Promise.all([
          accountApi.getNotificationPreferences(),
          accountApi.getPushConfig(),
        ])

        if (cancelled) {
          return
        }

        if (!preferences.pushNotificationsEnabled || !pushConfig.enabled) {
          const endpoint = await disableLocalPushSubscription()
          if (endpoint) {
            await accountApi.removePushSubscription(endpoint).catch(() => undefined)
          }
          return
        }

        const setup = await ensureBrowserPushSetup(pushConfig)
        if (!setup) {
          return
        }

        const serializedSubscription = setup.subscription.toJSON()
        const registered = await accountApi.registerPushSubscription({
          endpoint: serializedSubscription.endpoint || setup.subscription.endpoint,
          expirationTimeEpochMs:
            typeof serializedSubscription.expirationTime === 'number'
              ? serializedSubscription.expirationTime
              : null,
          p256dhKey: serializedSubscription.keys?.p256dh ?? null,
          authKey: serializedSubscription.keys?.auth ?? null,
          userAgent: navigator.userAgent,
        })

        if (cancelled) {
          return
        }

        await configurePushServiceWorker(setup.registration, {
          apiBaseUrl: API_BASE_URL,
          appUrl: window.location.origin,
          deviceToken: registered.deviceToken,
        })
      } catch (error) {
        console.error('Failed to synchronize account push notifications:', error)
      }
    }

    void syncPushState()

    const handleSyncRequested = () => {
      void syncPushState()
    }

    window.addEventListener('crm:notification-preferences-updated', handleSyncRequested)
    window.addEventListener('crm:push-sync-requested', handleSyncRequested)

    return () => {
      cancelled = true
      window.removeEventListener('crm:notification-preferences-updated', handleSyncRequested)
      window.removeEventListener('crm:push-sync-requested', handleSyncRequested)
    }
  }, [isAuthenticated, user?.id])

  return null
}
