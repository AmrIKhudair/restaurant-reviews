const gulp = require('gulp')
const plumber = require('gulp-plumber')
const newer = require('gulp-newer')
const browserSync = require('browser-sync').create()

const src = (...args) => gulp.src(...args).pipe(plumber())

const srcs = new Map([
  ['copy', ['src/icons', 'src/manifest.json']],
  ['css', ['node_modules/normalize.css/normalize.css', 'src/css/*.css']],
  ['html', ['src/*.pug', '!src/_*.pug']],
  ['images', 'src/img/*.jpg'],
  ['js', ['src/js/*.js', '!**/_*.js']],
  ['sw', 'src/sw.js']
])

gulp.task('build', Array.from(srcs.keys()))

gulp.task('copy', () => src(srcs.get('copy')).pipe(newer('dist')).pipe(gulp.dest('dist')))

gulp.task('css', () => {
  const minify = require('gulp-minify-css')
  const autoprefixer = require('gulp-autoprefixer')
  const concat = require('gulp-concat')

  return src(srcs.get('css'))
    .pipe(newer('dist/css/styles.css'))
    .pipe(minify())
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
    .pipe(concat('styles.css'))
    .pipe(gulp.dest('dist/css'))
})

gulp.task('html', () => {
  const pug = require('gulp-pug')
  return (
    src(srcs.get('html'))
      .pipe(newer({dest: 'dist', ext: 'html'}))
      .pipe(pug())
      .pipe(gulp.dest('dist'))
  )
})

gulp.task('images', () => {
  const resize = require('gulp-image-resize')
  const imagemin = require('gulp-imagemin')
  const rename = require('gulp-rename')
  const merge = require('merge-stream')

  const convert = width => src(srcs.get('images'))
    .pipe(resize({width: width}))
    .pipe(rename(path => (path.basename += '-' + width + 'w')))
    .pipe(newer('dist/img'))
    .pipe(imagemin([
      imagemin.jpegtran({progressive: true})
    ]))

    .pipe(gulp.dest('dist/img'))

  const streams = []
  for (let width = 300; width <= 800; width += 100) { streams.push(convert(width)) }
  return merge(streams)
})

const js = new Map([
  ['js', ['dist/js', ['sw']]],
  ['sw', ['dist', []]]
])

for (const [name, [dest, deps]] of js) {
  gulp.task(name, deps, () => {
    const named = require('vinyl-named')
    const webpack = require('webpack-stream')

    return (
      src(srcs.get(name))
        .pipe(newer(dest))
        .pipe(named())
        .pipe(webpack({
          devtool: 'source-map',
          mode: 'production'
        }))
        .pipe(gulp.dest(dest))
    )
  })
}

gulp.task('serve', ['build'], () => {
  const compression = require('compression')

  const watch = done => {
    browserSync.reload()
    done()
  }

  const watchTask = name => {
    const watchName = name + '-watch'
    gulp.task(watchName, [name], watch)
    return [watchName]
  }

  browserSync.init({
    server: {
      baseDir: './dist',
      middleware: (request, response, next) => compression()(request, response, next)

    }
  })

  for (const [name, src] of srcs) gulp.watch(src, watchTask(name))

  gulp.watch('dist/*.html').on('change', browserSync.reload)
})
