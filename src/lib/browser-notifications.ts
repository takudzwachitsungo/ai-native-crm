import type { WebPushConfig } from './types'

const PUSH_SERVICE_WORKER_FALLBACK_PATH = '/crm-push-sw.js'

export interface BrowserPushSetupResult {
  registration: ServiceWorkerRegistration
  subscription: PushSubscription
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function isStandardPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    isBrowserNotificationSupported() &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported'
  }

  return Notification.requestPermission()
}

export function showBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return null
  }

  return new Notification(title, options)
}

export async function ensureBrowserPushSetup(config: WebPushConfig): Promise<BrowserPushSetupResult | null> {
  if (!isStandardPushSupported() || getBrowserNotificationPermission() !== 'granted' || !config.enabled || !config.publicKey) {
    return null
  }

  const registration = await navigator.serviceWorker.register(config.serviceWorkerPath || PUSH_SERVICE_WORKER_FALLBACK_PATH)
  const activeRegistration = await navigator.serviceWorker.ready
  let subscription = await activeRegistration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await activeRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey) as BufferSource,
    })
  }

  return {
    registration,
    subscription,
  }
}

export async function configurePushServiceWorker(
  registration: ServiceWorkerRegistration,
  payload: { apiBaseUrl: string; appUrl: string; deviceToken: string }
): Promise<void> {
  const readyRegistration = registration.active ? registration : await navigator.serviceWorker.ready
  const worker = readyRegistration.active || readyRegistration.waiting || readyRegistration.installing

  worker?.postMessage({
    type: 'CONFIGURE_PUSH',
    payload,
  })
}

export async function disableLocalPushSubscription(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  let endpoint: string | null = null

  for (const registration of registrations) {
    if (registration.scope.startsWith(window.location.origin)) {
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        endpoint = subscription.endpoint
        await subscription.unsubscribe()
      }
      registration.active?.postMessage({ type: 'CLEAR_PUSH' })
    }
  }

  return endpoint
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}
