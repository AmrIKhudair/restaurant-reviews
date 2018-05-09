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

gulp.task('images', () => {
    const streams = [];
    for (let width = 300; width <= 800; width += 100)
        streams.push(convert(width));
    return merge.apply(null, streams);
});