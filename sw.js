const CACHE_NAME = 'c-eslava-cache-v6';
const urlsToCache = [
    './',
    './index.html',
    './html/calendario_dashboard_desktop.html',
    './html/calendario_dashboard_mobile.html',
    './html/detalle_historia_clinica_desktop.html',
    './html/detalle_historia_clinica_mobile.html',
    './html/pacientes_historia_clinica_desktop.html',
    './html/pacientes_historia_clinica_mobile.html',
    './html/pagos_facturacion_desktop.html',
    './html/pagos_facturacion_mobile.html',
    './html/servicios_ajustes_desktop.html',
    './html/servicios_ajustes_mobile.html',
    './html/pedidos_desktop.html',
    './html/master_root.html',
    './js/rbac.js',
    './js/supabase.js'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Forzar activación inmediata
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // Network First Strategy bypass cache
    event.respondWith(
        fetch(event.request, { cache: 'no-store' }).catch(() => {
            return caches.match(event.request);
        })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
