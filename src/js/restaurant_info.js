const DBHelper = require('./_dbhelper')
let restaurant
var map

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL().then(restaurant => {
    map = new window.google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: restaurant.latlng,
      scrollwheel: false
    })
    fillBreadcrumb()
    DBHelper.mapMarkerForRestaurant(restaurant, map)
  }).catch(console.error)
}

/**
 * Get current restaurant from page URL.
 */

let pendingHandler

const fetchRestaurantFromURL = async (callback) => {
  if (restaurant) return restaurant
  const id = getParameterByName('id')
  if (!id) throw Error('No restaurant id in URL')
  restaurant = await DBHelper.fetchRestaurantById(id)
  fillRestaurantHTML()
  await DBHelper.fetchReviewsByRestaurantId(id).then(fillReviewsHTML).catch(console.error)
  DBHelper.getPending().then(pending => {
    pendingHandler = new PendingHandler(
      document.getElementById('reviews-list'),
      createReviewHTML,
      pending
    )
  }).then(() => DBHelper.checkPending(true))
  return restaurant
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (_restaurant = restaurant) => {
  const name = document.getElementById('restaurant-name')
  name.textContent = _restaurant.name

  const address = document.getElementById('restaurant-address')
  address.textContent = _restaurant.address

  const image = document.getElementById('restaurant-img')
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(_restaurant)

  /* add srcset, sizes and alt */
  image.srcset = DBHelper.imageSrcsetForRestaurant(_restaurant)
  image.sizes = '(max-width: 41em) calc(100vw - 5em), calc(50vw - 5em)'
  image.alt = _restaurant.name

  const cuisine = document.getElementById('restaurant-cuisine')
  cuisine.textContent = _restaurant.cuisine_type

  // fill operating hours
  if (_restaurant.operating_hours) {
    fillRestaurantHoursHTML()
  }

  // enable submit button
  document.getElementById('submit').removeAttribute('disabled')
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours')
  for (let key in operatingHours) {
    const row = document.createElement('tr')

    const day = document.createElement('td')
    day.textContent = key
    row.appendChild(day)

    const time = document.createElement('td')
    time.textContent = operatingHours[key]
    row.appendChild(time)

    hours.appendChild(row)
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = restaurant.reviews) => {
  const container = document.getElementById('reviews-container')

  if (!reviews) {
    const noReviews = document.createElement('p')
    noReviews.textContent = 'No reviews yet!'
    container.appendChild(noReviews)
    return
  }
  const ul = document.getElementById('reviews-list')
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review))
  })
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review, key) => {
  const li = document.createElement('li')
  if (key != null) li.id = 'pending' + key

  const name = document.createElement('p')
  name.textContent = review.name
  li.appendChild(name)

  const date = document.createElement('p')
  date.textContent = review.createdAt ? `Created ${sanitize(review.createdAt)}. Last updated ${sanitize(review.updatedAt)}.` : 'Will be created once you connect to the internet.'
  li.appendChild(date)

  const rating = document.createElement('p')
  rating.textContent = `Rating: ${stars(review.rating)}`
  li.appendChild(rating)

  const comments = document.createElement('p')
  comments.textContent = review.comments
  li.appendChild(comments)

  return li
}

/* Sanitizing Date */
function sanitize (timestamp) {
  if (timestamp == null) return
  const diff = Math.floor((new Date() - new Date(timestamp)) / 1000)
  let value
  if ((value = Math.floor(diff / (3600 * 24 * 360)))) return ago(value, 'year')
  else if ((value = Math.floor(diff / (3600 * 24 * 30)))) return ago(value, 'month')
  else if ((value = Math.floor(diff / (3600 * 24 * 7)))) return ago(value, 'week')
  else if ((value = Math.floor(diff / (3600 * 24)))) return ago(value, 'day')
  else if ((value = Math.floor(diff / 3600))) return ago(value, 'hour')
  else if ((value = Math.floor(diff / 60))) return ago(value, 'minute')
  else if (diff) return ago(diff, 'second')
  else return 'just now'
}

function ago (value, name) {
  return `${value} ${name + (value === 1 ? '' : 's')} ago`
}

function stars (value, max = 5) {
  const arr = []
  for (let i = 0; i < max; i++) arr.push(i < value ? '★' : '☆')
  return arr.join('')
}

/**
 * Add restaurant name to the breadcrumb navigation menu, ADDED: semantics
 */
const fillBreadcrumb = (_restaurant = restaurant) => {
  const breadcrumb = document.querySelector('#breadcrumb > ul')
  const li = document.createElement('li')
  li.textContent = _restaurant.name
  breadcrumb.appendChild(li)
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url) {
    url = window.location.href
  }
  name = name.replace(/[[\]]/g, '\\$&')
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`)
  const results = regex.exec(url)
  if (!results) {
    return null
  }
  if (!results[2]) {
    return ''
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

/* handling reviews */
class PendingHandler extends Map {
  constructor (wrapper, creator, pending = null) {
    super()

    switch (true) {
      case wrapper instanceof window.HTMLElement: this._wrapper = wrapper
        /* falls through */
      case creator instanceof window.Function: this._create = creator
        /* falls through */
      case true: break
      default: throw TypeError()
    }

    if (pending != null) for (const [key, review] of pending) this.set(key, review)
  }

  set (key, review) {
    const old = this.get(key)
    if (old) old.remove()
    const el = this._create(review)
    this._wrapper.appendChild(el)
    return super.set(key, el)
  }

  delete (key, review = null) {
    const old = this.get(key)
    if (review != null) {
      if (old) old.remove()
      this._wrapper.appendChild(this._create(review))
    } else if (old) this._wrapper.removeChild(this.get(key))
    return super.delete(key)
  }
}

function handleSubmit (e) {
  e.preventDefault()
  const form = e.target
  const elements = form.elements
  for (const element of elements) element.setAttribute('disabled', true)
  const review = {
    restaurant_id: +restaurant.id,
    name: elements['name'].value,
    rating: +elements['rating'].value,
    comments: elements['comments'].value
  }
  DBHelper.submitReview(review).then(review => {
    form.reset()
  }).catch(console.error).finally(() => {
    for (const element of elements) element.removeAttribute('disabled')
  })
}

DBHelper.onpending = (key, review) => {
  if (review.restaurant_id === restaurant.id) pendingHandler.set(key, review)
}

DBHelper.onpublish = (key, review) => {
  if (review.restaurant_id === restaurant.id) pendingHandler.delete(key, review)
}

document.getElementById('form').addEventListener('submit', handleSubmit)
