var gulp = require('gulp');
var browserify = require('browserify');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

var browserified = transform(function(filename) {
  return browserify(filename)
    .bundle();
});

var config = require('./src/config.js');
config.browserBuild = true;

gulp.task('build', function () {
  config.src = "./src/browser_build.js";
  config.dest = "./dist";
  config.destFile = "appbase.min.js";
  return gulp.src([config.src])
    .pipe(browserified)
    .pipe(uglify())
    .pipe(rename(config.destFile))
    .pipe(gulp.dest(config.dest));
});

gulp.task('build_for_test',function() {
  config.src = "./src/browser_build_ab.js";
  config.dest = "./build";
  config.destFile = "appbase.js";
  config.expose_ab = true;
  
  return gulp.src([config.src])
    .pipe(browserified)
    .pipe(rename(config.destFile))
    .pipe(gulp.dest(config.dest));
});