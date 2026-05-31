// Build-Budget service worker — prototype version
// Caches all HTML pages and icons so the app works offline once installed.

const CACHE_VERSION = 'bb-prototype-v1';
const CACHE_NAME = `build-budget-${CACHE_VERSION}`;

// Every page in the prototype. Add new pages here as they're built.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/homeowner-dashboard.html',
  '/my-projects.html',
  '/settings.html',
  '/ai-designer-capture.html',
  '/ai-designer-result.html',
  '/get-inspired.html',
  '/new-project-details.html',
  '/new-project-drawings.html',
  '/new-project-review.html',
  '/project-workspace.html',
  '/measurement-review.html',
  '/material-selection.html',
  '/browse-products.html',
  '/find-a-pro.html',
  '/contractor-portal.html',
  '/contractor-dashboard.html',
  '/contractor-settings.html',
  '/quote-builder.html',
  '/homeowner-comparison.html',
  '/sketch-upload.html',
  '/project-vault.html',
  '/send-enquiry.html',
  '/quantity-summary.html',
  '/budget-pricing.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png'
];

// Google Fonts CSS — cached on first fetch, served stale-while-revalidate
const FONT_CSS_PATTERN = /^https:\/\/fonts\.googleapis\.com\/css/;
// Google Fonts files — cached aggressively
const FONT_FILE_PATTERN = /^https:\/\/fonts\.gstatic\.com\//;

// ============================================================================
// INSTALL — precache everything
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with allSettled-style behaviour: don't fail install if a single file 404s
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Skipped caching', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ============================================================================
// ACTIVATE — clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('build-budget-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================================
// FETCH — strategy per resource type
// ============================================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Only handle GET
  if (request.method !== 'GET') return;
  
  // HTML navigations: network-first, cache fallback (gives newest content when online)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Google Fonts CSS: stale-while-revalidate
  if (FONT_CSS_PATTERN.test(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // Google Fonts files: cache-first (versioned URLs, safe to cache long)
  if (FONT_FILE_PATTERN.test(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Same-origin assets (icons, images, manifest): cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Everything else: just pass through
});

// ============================================================================
// STRATEGIES
// ============================================================================

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache the fresh response
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline — try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: return the dashboard or index
    const fallback = await caches.match('/index.html') || await caches.match('/homeowner-dashboard.html');
    if (fallback) return fallback;
    // True offline with no cache — generate an offline page
    return new Response(
      offlineHTML(),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // No cache, no network — return a friendly error
    return new Response('Offline and not cached', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.ok) {
      caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => null);
  return cached || networkPromise || new Response('Offline', { status: 503 });
}

// ============================================================================
// OFFLINE FALLBACK PAGE
// ============================================================================
function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline — Build-Budget</title>
  <style>
    body { font-family: Georgia, serif; background: #faf7f2; color: #1c1917; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .wrap { max-width: 420px; padding: 32px; text-align: center; }
    h1 { font-size: 32px; font-weight: 500; letter-spacing: -0.01em; margin: 0 0 12px; }
    p { font-family: -apple-system, sans-serif; font-size: 14px; color: #78716c; line-height: 1.6; margin: 0 0 24px; }
    button { font-family: -apple-system, sans-serif; background: #1c1917; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>You're offline.</h1>
    <p>This page hasn't been cached yet. Connect to the internet to load it, then it'll work offline next time.</p>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`;
}

// ============================================================================
// SKIP-WAITING — let the page trigger an update
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
