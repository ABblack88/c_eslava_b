const CACHE_NAME = 'c-eslava-cache-v2';
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
    './js/rbac.js',
    './js/supabase.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return from cache
                }
                return fetch(event.request); // Fallback to network
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
