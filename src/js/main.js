const DBHelper = window.DBHelper

let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => Promise.all([
  fetchNeighborhoods(),
  fetchCuisines()
]).catch(console.error))

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = async () => {
  neighborhoods = await DBHelper.fetchNeighborhoods()
  fillNeighborhoodsHTML()
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (_neighborhoods = neighborhoods) => {
  const select = document.getElementById('neighborhoods-select')
  _neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option')
    option.innerHTML = neighborhood
    option.value = neighborhood
    select.append(option)
  })
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
const fillCuisinesHTML = (_cuisines = cuisines) => {
  const select = document.getElementById('cuisines-select')

  _cuisines.forEach(cuisine => {
    const option = document.createElement('option')
    option.innerHTML = cuisine
    option.value = cuisine
    select.append(option)
  })
}

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
  updateRestaurants()
}

/**
 * Update page and map for current restaurants.
 */
const cSelect = document.getElementById('cuisines-select')
const nSelect = document.getElementById('neighborhoods-select')

const updateRestaurants = () => {
  const cIndex = cSelect.selectedIndex
  const nIndex = nSelect.selectedIndex

  const cuisine = cSelect[cIndex].value
  const neighborhood = nSelect[nIndex].value

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood).then(
    restaurants => {
      resetRestaurants(restaurants)
      fillRestaurantsHTML()
    }
  ).catch(console.error)
}

[cSelect, nSelect].forEach(el => el.addEventListener('change', updateRestaurants))

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = _restaurants => {
  // Remove all restaurants
  restaurants = []
  const ul = document.getElementById('restaurants-list')
  ul.innerHTML = ''

  // Remove all map markers
  markers.forEach(m => m.setMap(null))
  markers = []
  restaurants = _restaurants
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (_restaurants = restaurants) => {
  const ul = document.getElementById('restaurants-list')
  _restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant))
  })
  addMarkersToMap()
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = restaurant => {
  const li = document.createElement('li')

  const image = document.createElement('img')
  image.className = 'restaurant-img'

  /* img sizes */
  image.sizes = '(max-width: 57em) calc(100vw - 10em), (max-width: 84em) calc((100vw - 20em) / 2), calc((100vw - 30em) / 3)'

  /* make image only start to load when onscreen */
  const setSrc = () => {
    if (image.getBoundingClientRect().top <= window.innerHeight) {
      image.src = DBHelper.imageUrlForRestaurant(restaurant)
      image.srcset = DBHelper.imageSrcsetForRestaurant(restaurant)
    }
  }

  if (restaurant.id === 1) setSrc()
  window.addEventListener('resize', setSrc)
  window.addEventListener('scroll', setSrc)

  /* fix: make alt more descriptive */
  image.alt = 'Photo of ' + restaurant.name

  li.append(image)

  /* fix: heading rank */
  const name = document.createElement('h2')
  name.innerHTML = restaurant.name
  li.append(name)

  const neighborhood = document.createElement('p')
  neighborhood.innerHTML = restaurant.neighborhood
  li.append(neighborhood)

  const address = document.createElement('p')
  address.innerHTML = restaurant.address
  li.append(address)

  const more = document.createElement('a')
  more.innerHTML = 'View Details'
  more.href = DBHelper.urlForRestaurant(restaurant)
  li.append(more)

  /* add aria-label to link */
  more.setAttribute('aria-label', restaurant.name + ': View Details')

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (_restaurants = restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, map)
    window.google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    })
    markers.push(marker)
  })
}
