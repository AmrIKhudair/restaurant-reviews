/* eslint-env serviceworker */
const CACHE_NAME = 'cache-v3'
const CACHE_PROMISE = caches.open(CACHE_NAME)

/* cache resources on install */
self.addEventListener('install', e => {
  const RESOURCES = [
    '/manifest.json',
    '/',
    '/restaurant.html',
    '/css/styles.css',
    '/js/DBHelper.js',
    '/js/main.js',
    '/js/restaurant_info.js'
  ]

  e.waitUntil(Promise.all([
    caches.keys()
      .then(keys => keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
      .then(promises => Promise.all(promises)),
    CACHE_PROMISE.then(cache => cache.addAll(RESOURCES)),
    self.skipWaiting()
  ]))
})

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

/* Hijacking fetch requests */
self.addEventListener('fetch', e => e.respondWith(
  self.fetch(e.request).then(
    response => {
      if (e.request.method === 'GET' && new URL(e.request.url).host !== 'localhost:1337') {
        CACHE_PROMISE.then(cache => cache.put(makeCachable(e.request), response))
      }
      return response.clone()
    },
    () => caches.match(makeCachable(e.request), {ignoreSearch: true}).then(
      response => response || new NotFoundResponse()
    )
  )
))

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
