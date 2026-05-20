const META_CACHE = 'crm-push-meta-v1'
const META_REQUEST = '/__crm_push_meta__'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) {
    return
  }

  if (event.data.type === 'CONFIGURE_PUSH') {
    event.waitUntil(saveMeta(event.data.payload))
  }

  if (event.data.type === 'CLEAR_PUSH') {
    event.waitUntil(clearMeta())
  }
})

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.targetUrl || '/'
  event.waitUntil(openClient(targetUrl))
})

async function handlePush() {
  const meta = await readMeta()
  if (!meta?.deviceToken || !meta?.apiBaseUrl) {
    await self.registration.showNotification('Cicosy CRM', {
      body: 'Open the app to review your latest CRM updates.',
      data: { targetUrl: meta?.appUrl || '/' },
    })
    return
  }

  try {
    const response = await fetch(
      `${meta.apiBaseUrl}/api/v1/push/devices/${encodeURIComponent(meta.deviceToken)}/notifications`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Push fetch failed with ${response.status}`)
    }

    const notifications = await response.json()
    if (!Array.isArray(notifications) || notifications.length === 0) {
      await self.registration.showNotification('Cicosy CRM', {
        body: 'Open the app to review your latest CRM updates.',
        data: { targetUrl: meta.appUrl || '/' },
      })
      return
    }

    for (const notification of notifications) {
      await self.registration.showNotification(notification.title || 'Cicosy CRM', {
        body: notification.body || 'You have a new CRM notification.',
        tag: notification.id || notification.category || 'crm-notification',
        data: {
          targetUrl: buildTargetUrl(meta.appUrl, notification.targetUrl),
        },
      })
    }
  } catch (error) {
    await self.registration.showNotification('Cicosy CRM', {
      body: 'A new CRM notification is waiting for you.',
      data: { targetUrl: meta.appUrl || '/' },
    })
  }
}

async function openClient(targetUrl) {
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of allClients) {
    if ('focus' in client) {
      await client.focus()
      if ('navigate' in client) {
        return client.navigate(targetUrl)
      }
      return client
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl)
  }

  return undefined
}

function buildTargetUrl(appUrl, targetUrl) {
  if (!targetUrl) {
    return appUrl || '/'
  }

  if (/^https?:\/\//i.test(targetUrl)) {
    return targetUrl
  }

  const normalizedAppUrl = (appUrl || '').replace(/\/+$/, '')
  const normalizedTarget = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`
  return normalizedAppUrl ? `${normalizedAppUrl}${normalizedTarget}` : normalizedTarget
}

async function saveMeta(payload) {
  const cache = await caches.open(META_CACHE)
  await cache.put(META_REQUEST, new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  }))
}

async function readMeta() {
  const cache = await caches.open(META_CACHE)
  const response = await cache.match(META_REQUEST)
  if (!response) {
    return null
  }
  return response.json()
}

async function clearMeta() {
  const cache = await caches.open(META_CACHE)
  await cache.delete(META_REQUEST)
}
