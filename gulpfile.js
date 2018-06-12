const gulp = require('gulp')
const resize = require('gulp-image-resize')
const imagemin = require('gulp-imagemin')
// const mozjpeg = require('imagemin-mozjpeg')
const rename = require('gulp-rename')
const merge = require('merge-stream')
const browserSync = require('browser-sync')

const convert = width => gulp.src('img-src/*.jpg')
  .pipe(resize({width: width}))
  .pipe(imagemin([
    imagemin.jpegtran({progressive: true})
  ]))
  .pipe(rename(path => (path.basename += '-' + width + 'w')))
  .pipe(gulp.dest('img'))

gulp.task('images', () => {
  const streams = []
  for (let width = 300; width <= 800; width += 100) { streams.push(convert(width)) }
  return merge.apply(null, streams)
})

gulp.task('serve', () => {
  browserSync.init({
    server: {
      baseDir: './'
    }
  })

  gulp.watch('*.html').on('change', browserSync.reload)
})
