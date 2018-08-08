/**
 * Common database helper functions.
 */
window.DBHelper = {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  get DATABASE_URL () {
    return '//localhost:1337'
  },

  get DB_PROMISE () {
    if (!(this._dbPromise instanceof Promise)) {
      this._dbPromise = require('idb').open('restaurants', 2, upgradeDB => {
        switch (upgradeDB.oldVersion) {
          case 0:
            const restaurants = upgradeDB.createObjectStore('restaurants', {keyPath: 'id'})
            restaurants.createIndex('cuisine', 'cuisine_type')
            restaurants.createIndex('neighborhood', 'neighborhood')
            restaurants.createIndex('cuisineAndNeighborhood', ['cuisine_type', 'neighborhood'])
            /* falls through */
          case 1:
            const reviews = upgradeDB.createObjectStore('reviews', {keyPath: 'id'})
            reviews.createIndex('restaurant', 'restaurant_id')
            const pending = upgradeDB.createObjectStore('pending_reviews', {autoIncrement: true})
            pending.createIndex('restaurant', 'restaurant_id')
        }
      })
    } return this._dbPromise
  },

  fromCached (id) {
    return this.DB_PROMISE.then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = id ? restaurants.get(+id) : restaurants.getAll()
      return tx.complete.then(() => data)
    })
  },

  fetch (id) {
    if (!(this._fetchPromise instanceof Promise)) {
      this._fetchPromise = window.fetch(`${this.DATABASE_URL}/restaurants/${id || ''}`)
        .then(response => response.json())
        .then(
          data => this.DB_PROMISE.then(db => {
            const tx = db.transaction('restaurants', 'readwrite')
            const restaurants = tx.objectStore('restaurants')

            restaurants.clear()
            if (data instanceof Array) data.forEach(item => restaurants.put(item))
            else restaurants.put(data)

            return tx.complete
          }),
          () => {}
        ).then(() => this.DB_PROMISE)
    } return this._fetchPromise
  },

  /**
   * Fetch all restaurants.
   */

  /* fix: update fetchRestaurants to use fetchRestaurantById */
  fetchRestaurants () {
    return this.fetchRestaurantById(null)
  },

  /* fix: fetch a single restaurant from api */
  fetchRestaurantById (id) {
    return this.fetch(id).then(() => this.fromCached(id))
  },

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  fetchRestaurantsByCuisine (cuisine) {
    if (cuisine === 'all') return this.fetchRestaurants()
    return this.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = restaurants.index('cuisine').getAll(cuisine)

      return tx.complete.then(() => data)
    })
  },

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  fetchRestaurantsByNeighborhood (neighborhood) {
    if (neighborhood === 'all') return this.fetchRestaurants()
    return this.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = restaurants.index('neighborhood').getAll(neighborhood)

      return tx.complete.then(() => data)
    })
  },

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  fetchRestaurantByCuisineAndNeighborhood (cuisine, neighborhood) {
    if (cuisine === 'all') return this.fetchRestaurantsByNeighborhood(neighborhood)
    if (neighborhood === 'all') return this.fetchRestaurantsByCuisine(cuisine)
    return this.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = restaurants.index('cuisineAndNeighborhood').getAll([cuisine, neighborhood])

      return tx.complete.then(() => data)
    })
  },

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  fetchNeighborhoods () {
    return this.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurnats = tx.objectStore('restaurants')
      const cursorPromise = restaurnats.index('neighborhood').openKeyCursor(null, 'nextunique')
      let neighborhoods = []

      return cursorPromise.then(function cursorIterate (cursor) {
        if (!cursor) return neighborhoods
        neighborhoods.push(cursor.key)
        return cursor.continue().then(cursorIterate)
      })
    })
  },

  /**
   * Fetch all cuisines with proper error handling.
   */
  fetchCuisines () {
    return this.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurnats = tx.objectStore('restaurants')
      const cursorPromise = restaurnats.index('cuisine').openKeyCursor(null, 'nextunique')
      let cuisines = []

      return cursorPromise.then(function cursorIterate (cursor) {
        if (!cursor) return cuisines
        cuisines.push(cursor.key)
        return cursor.continue().then(cursorIterate)
      })
    })
  },

  /**
   * Restaurant page URL.
   */
  urlForRestaurant (restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`)
  },

  /**
   * Restaurant image url for specific width
   */

  /* FIXED: _widthFile to correspond with new api */
  _widthFile (filename, width) {
    return `/img/${filename}-${width}w.jpg`
  },

  /**
   * Restaurant image URL.
   */
  imageUrlForRestaurant (restaurant) {
    return this._widthFile(restaurant.photograph, 800)
  },

  /**
   * Resturant image srcset
   */

  imageSrcsetForRestaurant (restaurant) {
    const srcset = []

    for (let width = 300; width <= 800; width += 100) { srcset.push(`${this._widthFile(restaurant.photograph, width)} ${width}w`) }

    return srcset.join(', ')
  },

  /**
   * Map marker for a restaurant.
   */
  mapMarkerForRestaurant (restaurant, map) {
    const marker = new window.google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: this.urlForRestaurant(restaurant),
      map: map,
      animation: window.google.maps.Animation.DROP}
    )
    return marker
  },

  /* start: reviews */
  fetchReviews (id) {
    if (!(this._reviewsPromise instanceof Promise)) {
      this._reviewsPromise = window.fetch(`${this.DATABASE_URL}/reviews/?restaurant_id=${id}`)
        .then(response => response.json())
        .then(
          data => this.DB_PROMISE.then(db => {
            const tx = db.transaction('reviews', 'readwrite')
            const reviews = tx.objectStore('reviews')

            reviews.clear()
            data.forEach(review => reviews.put(review))

            return tx.complete
          }),
          () => {}
        ).then(() => this.DB_PROMISE)
    } return this._reviewsPromise
  },

  fetchReviewsByRestaurantId (id) {
    return this.fetchReviews(id)
      .then(db => {
        const tx = db.transaction('reviews')
        const reviews = tx.objectStore('reviews')

        return reviews.index('restaurant').getAll(+id)
      })
  },

  submitReview (reviewStub, key = null) {
    const submitPromise = new Promise((resolve, reject) => {
      try { resolve(JSON.stringify(reviewStub)) } catch (error) { reject(error) }
    })
      .then(review => window.fetch(`${this.DATABASE_URL}/reviews/`, {
        body: review,
        method: 'POST'
      }))
      .then(response => response.ok ? response.json() : Promise.reject(Error('Failed!')))

    submitPromise.then(review => this.DB_PROMISE.then(db => {
      const tx = db.transaction('reviews', 'readwrite')
      const reviews = tx.objectStore('reviews')
      reviews.put(review)
      return tx.complete
    }))

    if (this.onpublish instanceof Function) {
      submitPromise.then(review => this.onpublish(key, review))
    }

    if (key == null) {
      submitPromise.catch(() => this.DB_PROMISE.then(async db => {
        const tx = db.transaction('pending_reviews', 'readwrite')
        const pending = tx.objectStore('pending_reviews')
        const key = await pending.put(reviewStub)
        this.onpending(key, reviewStub)
        /* FIXME: make it checkPending always on failure and for all restaurants */
        return tx.complete.then(() => this.checkPending())
      }))
    } else submitPromise.then(() => this.clearPending(key))

    return submitPromise
  },

  checkPending (now = false) {
    return (now ? Promise.resolve() : wait(5000)).then(() => this.getPending().then(reviews => {
      let iteration

      const iterate = () => new Promise((resolve, reject) => {
        iteration = reviews.next()
        if (iteration.done) resolve()
        const [key, review] = iteration.value
        const submitPromise = this.submitReview(review, key)
        submitPromise.catch(() => resolve(this.checkPending()))
        submitPromise
          .then(() => resolve(iterate()))
          .catch(reject)
      })

      return iterate()
    }))
  },

  getPending () {
    return this.DB_PROMISE.then(db => {
      const tx = db.transaction('pending_reviews')
      const pending = tx.objectStore('pending_reviews')
      const map = new Map()

      pending.index('restaurant').openCursor().then(function cursorIterator (cursor) {
        if (!cursor) return
        map.set(cursor.primaryKey, cursor.value)
        return cursor.continue().then(cursorIterator)
      })

      return tx.complete.then(() => map.entries())
    })
  },

  clearPending (key) {
    return this.DB_PROMISE.then(db => {
      const tx = db.transaction('pending_reviews', 'readwrite')
      const pending = tx.objectStore('pending_reviews')
      pending.delete(key)
      return tx.complete
    })
  },

  /* user provided: onpublished, onpending */
  onpublish: void 0,
  onpending: void 0,

  /* end  : reviews */

  /* favourite restaurants */
  favorite (id, val = true) {
    return new Promise(resolve => resolve(JSON.stringify({is_favorite: val})))
      .then(body => window.fetch(`${this.DATABASE_URL}/restaurants/${id}`, {
        body: body,
        method: 'PUT'
      }))
      .then(response => response.ok ? response.json() : Promise.reject(response))
      .then(restaurant => this._dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite')
        tx.objectStore('restaurants').put(restaurant)
        return tx.complete.then(() => restaurant.is_favorite)
      }))
  }
}

const wait = time => new Promise(resolve => setTimeout(resolve, time))

/* register the service worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js')
  })
}

window.addEventListener('load', () => {
  document.getElementById('styles').disabled = false
  const head = document.createElement('script')
  head.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBrt4bFYrx1JU0r5vA-4SrBHHfWZQ-QA6Q&callback=initMap'
  document.body.appendChild(head)
})
