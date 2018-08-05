const gulp = require('gulp')
const newer = require('gulp-newer')

gulp.task('images', () => {
  const resize = require('gulp-image-resize')
  const imagemin = require('gulp-imagemin')
  const rename = require('gulp-rename')
  const merge = require('merge-stream')

  const convert = width => gulp.src('src/img/*.jpg')
    .pipe(resize({width: width}))
    .pipe(rename(path => (path.basename += '-' + width + 'w')))
    .pipe(newer('dist/img'))
    .pipe(imagemin([
      imagemin.jpegtran({progressive: true})
    ]))

    .pipe(gulp.dest('dist/img'))

  const streams = []
  for (let width = 300; width <= 800; width += 100) { streams.push(convert(width)) }
  return merge.apply(null, streams)
})

gulp.task('serve', ['build'], () => {
  const compression = require('compression')
  const browserSync = require('browser-sync')

  browserSync.init({
    server: {
      baseDir: './dist',
      middleware: (request, response, next) => compression()(request, response, next)
    }
  })

  gulp.watch('src/**/*', ['build'])
  return gulp.watch('dist/*.html').on('change', browserSync.reload)
})

gulp.task('html', () => {
  const pug = require('gulp-pug')
  return (
    gulp.src(['src/*.pug', '!src/_*.pug'])
      .pipe(newer({dest: 'dist', ext: 'html'}))
      .pipe(pug())
      .pipe(gulp.dest('dist'))
  )
})

gulp.task(
  'copy',
  () => gulp.src(['src/icons', 'src/manifest.json']).pipe(newer('dist')).pipe(gulp.dest('dist'))
)

const js = new Map([
  ['js', {
    src: ['src/js/*.js', '!**/_*.js'],
    dest: 'dist/js',
    deps: ['sw']
  }],
  ['sw', {
    src: 'src/sw.js',
    dest: 'dist'
  }]
])

for (const [name, task] of js) {
  gulp.task(name, task.deps || [], () => {
    const named = require('vinyl-named')
    const webpack = require('webpack-stream')

    return (
      gulp.src(task.src)
        .pipe(newer(task.dest))
        .pipe(named())
        .pipe(webpack({devtool: 'source-map'}))
        .pipe(gulp.dest(task.dest))
    )
  })
}

gulp.task('css', () => {
  const minify = require('gulp-minify-css')
  const autoprefixer = require('gulp-autoprefixer')
  const concat = require('gulp-concat')

  return gulp.src(['node_modules/normalize.css/normalize.css', 'src/css/*.css'])
    .pipe(newer('dist/css/styles.css'))
    .pipe(minify())
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
    .pipe(concat('styles.css'))
    .pipe(gulp.dest('dist/css'))
})

gulp.task('build', ['html', 'css', 'js', 'images', 'copy'])
