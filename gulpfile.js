
import BrowserSync from 'browser-sync'
import Compression from 'compression'
import gulp from 'gulp'
import autoPrefixer from 'gulp-autoprefixer'
import concat from 'gulp-concat'
import header from 'gulp-header'
import resize from 'gulp-image-resize'
import imagemin from 'gulp-imagemin'
import plumber from 'gulp-plumber'
import pug from 'gulp-pug'
import minify from 'gulp-minify-css'
import newer from 'gulp-newer'
import rename from 'gulp-rename'
import sourceMaps from 'gulp-sourcemaps'
import uglify from 'gulp-uglifyes'
import { generateHash as hash } from 'random-hash'
import named from 'vinyl-named'
import webpack from 'webpack'
import webpackStream from 'webpack-stream'

const { src, dest, parallel, series, watch } = gulp

const task = (...args) => {
  if (args.length === 2 && !(args[1] instanceof Array)) [args[1], args[2]] = [['sw'], args[1]]
  return gulp.task(...args)
}

const srcs = new Map([
  ['copy', ['src/icons', 'src/manifest.json']],
  ['css', ['src/css/*.css']],
  ['html', ['src/*.pug', '!**/_*.pug']],
  ['images', ['src/img/*.jpg']],
  ['js', ['src/js/*.js', '!**/_*.js']],
  ['sw', ['src/sw.js']]
])

export function sw () {
  return src(srcs.get('sw'))
    .pipe(plumber())
    .pipe(sourceMaps.identityMap())
    .pipe(plumber())
    .pipe(header(`self.CACHE_NAME = '${hash()}'`))
    .pipe(uglify())
    .pipe(sourceMaps.write('.'))
    .pipe(gulp.dest('dist'))
}

function copyTask () {
  return src(srcs.get('copy')).pipe(plumber()).pipe(newer('dist')).pipe(dest('dist'))
}

function cssTask () {
  return src(srcs.get('css'))
  .pipe(plumber())
  .pipe(newer('dist/css/styles.css'))
  .pipe(minify())
  .pipe(autoPrefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
  .pipe(concat('styles.css'))
  .pipe(dest('dist/css'))
}

function htmlTask () {
  return src(srcs.get('html'))
    .pipe(plumber())
    .pipe(newer({dest: 'dist', ext: 'html'}))
    .pipe(pug())
    .pipe(dest('dist'))
}

const convert = width => src(srcs.get('images'))
  .pipe(resize({width: width}))
  .pipe(rename(path => (path.basename += '-' + width + 'w')))
  .pipe(newer('dist/img'))
  .pipe(imagemin([
    imagemin.jpegtran({progressive: true})
  ]))

  .pipe(gulp.dest('dist/img'))

const tasks = []
for (let width = 300; width <= 800; width += 100) { tasks.push( function imageTask() { return convert(width) } ) }
const imageTasks = parallel(tasks)

function jsTask () {
  return src(srcs.get('js'))
    .pipe(newer('dist/js'))
    .pipe(named())
    .pipe(webpackStream({
      devtool: 'source-map',
      mode: 'production'
    }, webpack))
    .pipe(gulp.dest('dist/js'))
}

export const copy = series(sw, copyTask)
export const css = series(sw, cssTask)
export const html = series(sw, htmlTask)
export const images = series(sw, imageTasks)
export const js = series(sw, jsTask)
export const build = series(sw, parallel(copyTask, cssTask, htmlTask, imageTasks, jsTask))

export const serve = series(build, () => {
  const browserSync = BrowserSync.create()
  const compression = Compression()

  function task(name) {
    const tasks = { copy: copyTask, css: cssTask, html, htmlTask, images, imageTasks, js, sw }
    return tasks[name]
  }

  browserSync.init({
    server: {
      baseDir: 'dist',
      middleware: (request, response, next) => compression(request, response, next)

    }
  })

  for (const [name, src] of srcs) {
    watch(src.filter(src => !src.startsWith('!**/_*.')), series(task(name), browserSync.reload))
  }
})
