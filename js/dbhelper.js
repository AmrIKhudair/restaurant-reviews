/**
 * Common database helper functions.
 */
window.DBHelper = class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL () {
    /* FEAT: made database url external */
    return '//localhost:1337/restaurants/'
  }

  static fetch (id) {
    if (DBHelper._fetchPromise instanceof Promise) return DBHelper._fetchPromise

    if (!(DBHelper._dbPromise instanceof Promise)) {
      DBHelper._dbPromise = window.idb.open('restaurants', 1, upgradeDB => {
        switch (upgradeDB.oldVersion) {
          case 0:
            const restaurants = upgradeDB.createObjectStore('restaurants', {keyPath: 'id'})
            restaurants.createIndex('cuisine', 'cuisine_type')
            restaurants.createIndex('neighborhood', 'neighborhood')
            restaurants.createIndex('cuisineAndNeighborhood', ['cuisine_type', 'neighborhood'])
        }
      })
    }

    return (
      DBHelper._fetchPromise = window.fetch(DBHelper.DATABASE_URL + (id || ''))
        .then(response => response.json())
        .then(
          data => DBHelper._dbPromise.then(db => {
            const tx = db.transaction('restaurants', 'readwrite')
            const restaurants = tx.objectStore('restaurants')

            if (data instanceof Array) data.forEach(item => restaurants.put(item))
            else restaurants.put(data)

            return tx.complete
          }),
          () => {}
        ).then(() => DBHelper._dbPromise)
    )
  }

  /**
   * Fetch all restaurants.
   */

  /* fix: update fetchRestaurants to use fetchRestaurantById */
  static fetchRestaurants (callback) {
    return DBHelper.fetchRestaurantById(null, callback)
  }

  /* fix: fetch a single restaurant from api */
  static fetchRestaurantById (id, callback) {
    return DBHelper.fetch(id)
      .then(db => {
        const tx = db.transaction('restaurants')
        const restaurants = tx.objectStore('restaurants')
        const data = id ? restaurants.get(+id) : restaurants.getAll()
        return tx.complete.then(() => data)
      }).then(data => callback(null, data))
      .catch(error => callback(error, null))
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantsByCuisine (cuisine, callback) {
    if (cuisine === 'all') return DBHelper.fetchRestaurants(callback)
    return DBHelper.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = restaurants.index('cuisine').getAll(cuisine)

      return tx.complete.then(() => data)
    }).then(data => callback(null, data)).catch(error => callback(error, null))
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantsByNeighborhood (neighborhood, callback) {
    if (neighborhood === 'all') return DBHelper.fetchRestaurants(callback)
    return DBHelper.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = restaurants.index('neighborhood').getAll(neighborhood)

      return tx.complete.then(() => data)
    }).then(data => callback(null, data)).catch(error => callback(error, null))
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood (cuisine, neighborhood, callback) {
    if (cuisine === 'all') return DBHelper.fetchRestaurantsByNeighborhood(neighborhood, callback)
    if (neighborhood === 'all') return DBHelper.fetchRestaurantsByCuisine(cuisine, callback)
    return DBHelper.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurants = tx.objectStore('restaurants')
      const data = restaurants.index('cuisineAndNeighborhood').getAll([cuisine, neighborhood])

      return tx.complete.then(() => data)
    }).then(data => callback(null, data)).catch(error => callback(error, null))
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods (callback) {
    return DBHelper.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurnats = tx.objectStore('restaurants')
      const cursorPromise = restaurnats.index('neighborhood').openKeyCursor(null, 'nextunique')
      let neighborhoods = []

      return cursorPromise.then(function cursorIterate (cursor) {
        if (!cursor) return neighborhoods
        neighborhoods.push(cursor.key)
        return cursor.continue().then(cursorIterate)
      })
    }).then(neighbours => callback(null, neighbours)).catch(error => callback(error, null))
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines (callback) {
    return DBHelper.fetch().then(db => {
      const tx = db.transaction('restaurants')
      const restaurnats = tx.objectStore('restaurants')
      const cursorPromise = restaurnats.index('cuisine').openKeyCursor(null, 'nextunique')
      let cuisines = []

      return cursorPromise.then(function cursorIterate (cursor) {
        if (!cursor) return cuisines
        cuisines.push(cursor.key)
        return cursor.continue().then(cursorIterate)
      })
    }).then(cuisines => callback(null, cuisines)).catch(error => callback(error, null))
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant (restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`)
  }

  /**
   * Restaurant image url for specific width
   */

  /* FIXED: _widthFile to correspond with new api */
  static _widthFile (filename, width) {
    return `/img/${filename}-${width}w.jpg`
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant (restaurant) {
    return DBHelper._widthFile(restaurant.photograph, 800)
  }

  /**
   * Resturant image srcset
   */

  static imageSrcsetForRestaurant (restaurant) {
    const srcset = []

    for (let width = 300; width <= 800; width += 100) { srcset.push(`${DBHelper._widthFile(restaurant.photograph, width)} ${width}w`) }

    return srcset.join(', ')
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant (restaurant, map) {
    const marker = new window.google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: window.google.maps.Animation.DROP}
    )
    return marker
  }
}
