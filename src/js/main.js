const DBHelper = window.DBHelper

let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

class RemotePromise extends Promise {
  static get [Symbol.species] () { return Promise }
  constructor () {
    let res, rej
    super((resolve, reject) => { [res, rej] = [resolve, reject] })
    this.resolve = res
    this.reject = rej
  }
}

const load = new RemotePromise()
const mapLoad = new RemotePromise()

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  }
  map = new window.google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  })
  mapLoad.resolve(load)
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
load.then(() => Promise.all([
  fetchNeighborhoods(),
  fetchCuisines()
]).catch(console.error))

const refill = (node, fragment) => new Promise(resolve => {
  const clone = node.cloneNode(false)
  clone.appendChild(fragment)
  window.requestAnimationFrame(() => {
    node.parentNode.replaceChild(clone, node)
    resolve(clone)
  })
})

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = async () => {
  neighborhoods = await DBHelper.fetchNeighborhoods()
  return fillNeighborhoodsHTML()
}

/**
 * Set neighborhoods HTML.
 */

const fillNeighborhoodsHTML = async (_neighborhoods = neighborhoods) => {
  const select = document.getElementById('neighborhoods-select')
  const fragment = document.createDocumentFragment()
  fragment.appendChild(select.firstChild.cloneNode(true))
  _neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option')
    option.innerHTML = neighborhood
    option.value = neighborhood
    fragment.appendChild(option)
  })
  return refill(select, fragment).then(
    select => select.addEventListener('change', updateRestaurants)
  )
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = async () => {
  cuisines = await DBHelper.fetchCuisines()
  fillCuisinesHTML()
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = async (_cuisines = cuisines) => {
  const select = document.getElementById('cuisines-select')
  const fragment = document.createDocumentFragment()
  fragment.appendChild(select.firstChild.cloneNode(true))
  _cuisines.forEach(cuisine => {
    const option = document.createElement('option')
    option.innerHTML = cuisine
    option.value = cuisine
    fragment.appendChild(option)
  })
  return refill(select, fragment).then(
    select => select.addEventListener('change', updateRestaurants)
  )
}

/**
 * Update page and map for current restaurants.
 */

const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select')
  const nSelect = document.getElementById('neighborhoods-select')

  const cIndex = cSelect.selectedIndex
  const nIndex = nSelect.selectedIndex

  const cuisine = cSelect[cIndex].value
  const neighborhood = nSelect[nIndex].value

  const promise = DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then(resetRestaurants)

  promise.catch(console.error)
  promise.then(() => fillRestaurantsHTML())
  promise.then(() => addMarkersToMap())

  return promise
}

window.addEventListener('load', () => updateRestaurants().then(load.resolve))

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = async _restaurants => { restaurants = _restaurants }

const io = new window.IntersectionObserver(entries => entries.forEach(entry => {
  const image = entry.target
  if (!image.src && !image.srcset && entry.isIntersecting) {
    window.requestAnimationFrame(() => {
      image.src = image.dataset.src
      image.srcset = image.dataset.srcset
    })
    io.unobserve(image)
  }
}))

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (_restaurants = restaurants) => {
  const ul = document.getElementById('restaurants-list')
  const fragment = document.createDocumentFragment()

  _restaurants.forEach(restaurant => fragment.appendChild(createRestaurantHTML(restaurant)))

  return refill(ul, fragment)
}

const star = val => val ? '★' : '☆'

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = restaurant => {
  const li = document.createElement('li')
  const fragment = document.createDocumentFragment()

  const image = document.createElement('img')
  io.observe(image)

  image.className = 'restaurant-img'

  image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant)
  image.dataset.srcset = DBHelper.imageSrcsetForRestaurant(restaurant)

  /* img sizes */
  image.sizes = '(max-width: 57em) calc(100vw - 10em), (max-width: 84em) calc((100vw - 20em) / 2), calc((100vw - 30em) / 3)'

  /* fix: make alt more descriptive */
  image.alt = 'Photo of ' + restaurant.name

  fragment.appendChild(image)

  /* fix: heading rank */
  const name = document.createElement('h2')
  name.innerHTML = restaurant.name
  fragment.appendChild(name)

  const neighborhood = document.createElement('p')
  neighborhood.innerHTML = restaurant.neighborhood
  fragment.appendChild(neighborhood)

  const address = document.createElement('p')
  address.innerHTML = restaurant.address
  fragment.appendChild(address)

  const favorite = document.createElement('a')
  favorite.href = '#'
  favorite.classList.add('restaurant-favorite')
  favorite.textContent = star(restaurant.is_favorite)
  favorite.addEventListener('click', e => {
    e.preventDefault()
    DBHelper.favorite(restaurant.id, !restaurant.is_favorite).then(val => {
      restaurant.is_favorite = val
      favorite.textContent = star(val)
    })
  })
  fragment.appendChild(favorite)

  const more = document.createElement('a')
  more.innerHTML = 'View Details'
  more.href = DBHelper.urlForRestaurant(restaurant)

  /* add aria-label to link */
  more.setAttribute('aria-label', restaurant.name + ': View Details')
  fragment.appendChild(more)

  li.appendChild(fragment)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = async (_restaurants = restaurants) => {
  // Remove all map markers
  markers.forEach(m => m.setMap(null))
  markers = []
  await mapLoad
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, map)
    window.google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    })
    markers.push(marker)
  })
}
