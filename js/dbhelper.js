/**
 * Common database helper functions.
 */
window.DBHelper = {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  get DATABASE_URL () {
    return '//localhost:1337/'
  },

  get DB_PROMISE () {
    if (!(this._dbPromise instanceof Promise)) {
      this._dbPromise = window.idb.open('restaurants', 2, upgradeDB => {
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
        }
      })
    } return this._dbPromise
  },

  fetch (id) {
    if (!(this._fetchPromise instanceof Promise)) {
      this._fetchPromise = window.fetch(this.DATABASE_URL + 'restaurants/' + (id || ''))
        .then(response => response.json())
        .then(
          data => this.DB_PROMISE.then(db => {
            const tx = db.transaction('restaurants', 'readwrite')
            const restaurants = tx.objectStore('restaurants')

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
    return this.fetch(id)
      .then(db => {
        const tx = db.transaction('restaurants')
        const restaurants = tx.objectStore('restaurants')
        const data = id ? restaurants.get(+id) : restaurants.getAll()
        return tx.complete.then(() => data)
      })
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
      this._reviewsPromise = window.fetch(this.DATABASE_URL + 'reviews/?restaurant_id=' + id)
        .then(response => response.json())
        .then(
          data => this.DB_PROMISE.then(db => {
            const tx = db.transaction('reviews', 'readwrite')
            const reviews = tx.objectStore('reviews')
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

  submitReview (review) {
    const submitPromise = new Promise((resolve, reject) => {
      try { resolve(JSON.stringify(review)) } catch (error) { reject(error) }
    })
      .then(review => window.fetch(this.DATABASE_URL + 'reviews/', {
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

    return submitPromise
  }
  /* end  : reviews */
}
