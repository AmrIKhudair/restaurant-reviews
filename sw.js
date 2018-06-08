/* eslint-env serviceworker */

/* cache resources on install */
self.addEventListener('install', e => {
  const resources = [
    '/manifest.json',
    '/',
    '/restaurant.html',
    '/css/styles.css',
    '/data/restaurants.json',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js'
  ]

  caches.delete('cache-v1')

  e.waitUntil(
    caches.open('cache-v2').then(cache => cache.addAll(resources))
  )
})

/* Hijacking fetch requests */
self.addEventListener('fetch', e => e.respondWith(
  self.fetch(e.request).then(
    response => {
      if (new URL(e.request.url).host !== 'localhost:1337') { caches.open('cache-v2').then(cache => cache.put(makeCachable(e.request), response)) }
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

  if (directory === '/img' && fileExt === 'jpg') url.pathname = `${directory}/${imgName}`

  return new self.Request(url.href)
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
