const CACHE_NAME = 'entregas-app-v2'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Instalar service worker e fazer cache dos recursos
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Instalando...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache aberto')
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.error('❌ Erro ao fazer cache:', err)
      })
  )
  self.skipWaiting()
})

// Ativar service worker e limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Ativando...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Estratégia: Network First, fallback para Cache
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return
  }

  // Ignorar requisições para API (sempre tentar rede)
  if (event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clonar e adicionar ao cache
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // Se falhar, tentar buscar do cache
        return caches.match(event.request).then((response) => {
          if (response) {
            console.log('📦 Servindo do cache:', event.request.url)
            return response
          }
          
          // Se não estiver no cache, retornar página offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
      })
  )
})

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entregas') {
    console.log('🔄 Sincronização em background solicitada')
    event.waitUntil(syncEntregas())
  }
})

async function syncEntregas() {
  try {
    console.log('🔄 Sincronizando entregas...')
    // A sincronização real é feita pelo código do app
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_ENTREGAS'
      })
    })
  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
  }
}

// Notificações push (para futuro)
self.addEventListener('push', (event) => {
  console.log('📬 Notificação push recebida')
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Nova Entrega'
  const options = {
    body: data.body || 'Você tem uma nova entrega',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notificação clicada')
  event.notification.close()
  
  if (event.action === 'close') {
    return
  }
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  )
})

console.log('🚀 Service Worker carregado')
