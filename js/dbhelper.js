/* import idb */
import idb from '../node_modules/idb/lib/idb'

/**
 * Common database helper functions.
 */
export default class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL () {
    /* FEAT: made database url external */
    return `//localhost:1337/restaurants`
  }

  async DB () {
    if (this._dbPromise) return this._dbPromise

    return (this._dbPromise = idb.open('restaurants', 1, upgradeDB => {
      switch (upgradeDB) {
        case 0:
      }
    }))
  }

  /**
   * Fetch all restaurants.
   */

  /* fix: update fetchRestaurants to use fetchRestaurantById */
  static fetchRestaurants (callback) {
    return DBHelper.fetchRestaurantById('', callback)
  }

  /* fix: fetch a single restaurant from api */
  static fetchRestaurantById (id, callback) {
    let xhr = new window.XMLHttpRequest()
    xhr.open('GET', DBHelper.DATABASE_URL + '/' + id)
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        /* fix: restaurants variable */
        const restaurants = JSON.parse(xhr.responseText)
        callback(null, restaurants)
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`)
        callback(error, null)
      }
    }
    xhr.send()
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine (cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null)
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type === cuisine)
        callback(null, results)
      }
    })
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood (neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null)
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood === neighborhood)
        callback(null, results)
      }
    })
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood (cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null)
      } else {
        let results = restaurants
        if (cuisine !== 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type === cuisine)
        }
        if (neighborhood !== 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood === neighborhood)
        }
        callback(null, results)
      }
    })
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods (callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null)
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i)
        callback(null, uniqueNeighborhoods)
      }
    })
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines (callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null)
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i)
        callback(null, uniqueCuisines)
      }
    })
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

/* init indexeddb */
