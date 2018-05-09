const gulp = require('gulp'),
    resize = require('gulp-image-resize'),
    imagemin = require('gulp-imagemin'),
    rename = require('gulp-rename')
    merge = require('merge-stream');

const convert = width => gulp.src("img-src/*.jpg")
    .pipe(resize({width: width}))
    .pipe(imagemin({progressive: true}))
    .pipe(rename(path => path.basename += '-' + width + 'w'))
    .pipe(gulp.dest('img'));

gulp.task(
    'images',
    () => merge(convert(100), convert(200), convert(400), convert(800))
);