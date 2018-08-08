/* eslint-env serviceworker */

// self.CACHE_NAME = 'RANDOM-HASH-GENERATED-USING-GULP'
const CACHE_PROMISE = caches.open(self.CACHE_NAME)

const RESOURCES = [
  '/manifest.json',
  '/',
  '/index.html',
  '/restaurant.html',
  '/css/styles.css',
  '/js/DBHelper.js',
  '/js/main.js',
  '/js/restaurant_info.js'
]

/* cache resources on install */
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.keys()
      .then(keys => keys.filter(key => key !== self.CACHE_NAME).map(key => caches.delete(key)))
      .then(promises => Promise.all(promises)),
    CACHE_PROMISE.then(cache => cache.addAll(RESOURCES)),
    self.skipWaiting()
  ]))
})

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

/* Hijacking fetch requests */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.href.endsWith('.woff2')) return e.respondWith(new NotFoundResponse())
  e.respondWith(caches.match(makeCachable(e.request), {ignoreSearch: true})
    .then(response => response || Promise.reject(response))
    .then(
      null,
      () => self.fetch(e.request).then(
        response => {
          if (
            response.ok &&
            e.request.method === 'GET' &&
            url.protocol in ['http', 'https'] &&
            url.host !== 'localhost:1337' &&
            !url.path.beginsWith('browser-sync')
          ) { CACHE_PROMISE.then(cache => cache.put(makeCachable(e.request), response.clone())) }
          return response.clone()
        },
        () => new NotFoundResponse()
      )
    ))
})

/* generates a cachable request for the images that ignores sizes */
function makeCachable (request) {
  const url = new URL(request.url)

  if (url.host !== self.location.host) return request

  const [directory, file] = sliceAtLast(url.pathname, '/', true)
  const [fileName, fileExt] = sliceAtLast(file, '.')
  const imgName = sliceAtLast(fileName, '-')[0]

  if (directory === '/img' && fileExt === 'jpg') {
    url.pathname = `${directory}/${imgName}`
    return new self.Request(url.href)
  }

  return request
}

/* slice a string at the last occurance of a separator */
function sliceAtLast (string, separator, last = false) {
  const position = string.lastIndexOf(separator)
  if (position > -1) return [string.slice(0, position), string.slice(position + 1)]
  return last ? ['', string] : [string, '']
}

/* NotFoundResponse class definition */
class NotFoundResponse extends self.Response {
  constructor () {
    super(null, {
      status: 404,
      statusText: 'Not Found'
    })
  }
}
