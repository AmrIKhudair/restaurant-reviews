import DBHelper from './DBHelper'

let restaurant
var map

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error)
    } else {
      map = new window.google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      })
      fillBreadcrumb()
      DBHelper.mapMarkerForRestaurant(restaurant, map)
    }
  })
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (restaurant) { // restaurant already fetched!
    callback(null, restaurant)
    return
  }
  const id = getParameterByName('id')
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    callback(error, null)
  } else {
    DBHelper.fetchRestaurantById(id, (error, _restaurant) => {
      restaurant = _restaurant
      if (!restaurant) {
        console.error(error)
        return
      }
      fillRestaurantHTML()
      callback(null, restaurant)
    })
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (_restaurant = restaurant) => {
  const name = document.getElementById('restaurant-name')
  name.innerHTML = _restaurant.name

  const address = document.getElementById('restaurant-address')
  address.innerHTML = _restaurant.address

  const image = document.getElementById('restaurant-img')
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(_restaurant)

  /* add srcset, sizes and alt */
  image.srcset = DBHelper.imageSrcsetForRestaurant(_restaurant)
  image.sizes = '(max-width: 41em) calc(100vw - 5em), calc(50vw - 5em)'
  image.alt = _restaurant.name

  const cuisine = document.getElementById('restaurant-cuisine')
  cuisine.innerHTML = _restaurant.cuisine_type

  // fill operating hours
  if (_restaurant.operating_hours) {
    fillRestaurantHoursHTML()
  }
  // fill reviews
  fillReviewsHTML()
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours')
  for (let key in operatingHours) {
    const row = document.createElement('tr')

    const day = document.createElement('td')
    day.innerHTML = key
    row.appendChild(day)

    const time = document.createElement('td')
    time.innerHTML = operatingHours[key]
    row.appendChild(time)

    hours.appendChild(row)
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = restaurant.reviews) => {
  const container = document.getElementById('reviews-container')
  /* fix: header rank */
  const title = document.createElement('h3')
  title.innerHTML = 'Reviews'
  container.appendChild(title)

  if (!reviews) {
    const noReviews = document.createElement('p')
    noReviews.innerHTML = 'No reviews yet!'
    container.appendChild(noReviews)
    return
  }
  const ul = document.getElementById('reviews-list')
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review))
  })
  container.appendChild(ul)
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li')
  const name = document.createElement('p')
  name.innerHTML = review.name
  li.appendChild(name)

  const date = document.createElement('p')
  date.innerHTML = review.date
  li.appendChild(date)

  const rating = document.createElement('p')
  rating.innerHTML = `Rating: ${review.rating}`
  li.appendChild(rating)

  const comments = document.createElement('p')
  comments.innerHTML = review.comments
  li.appendChild(comments)

  return li
}

/**
 * Add restaurant name to the breadcrumb navigation menu, ADDED: semantics
 */
const fillBreadcrumb = (_restaurant = restaurant) => {
  const breadcrumb = document.querySelector('#breadcrumb > ul')
  const li = document.createElement('li')
  li.innerHTML = _restaurant.name
  breadcrumb.appendChild(li)
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url) { url = window.location.href }
  name = name.replace(/[[\]]/g, '\\$&')
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`)
  const results = regex.exec(url)
  if (!results) { return null }
  if (!results[2]) { return '' }
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

/* register the service worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js')
  })
}
