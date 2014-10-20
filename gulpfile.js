var gulp = require('gulp');
var browserify = require('browserify');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

var config = require('./lib/config.js');
config.browserBuild = true;
config.src = "./lib/main.js";
config.dest = "./dist";
config.destFile = "appbase.min.js";

gulp.task('build', function () {

  var browserified = transform(function(filename) {
    return browserify(filename)
      .bundle();
  });

  return gulp.src([config.src]) // you can also use glob patterns here to browserify->uglify multiple files
    .pipe(browserified)
    .pipe(uglify())
    .pipe(rename(config.destFile))
    .pipe(gulp.dest(config.dest));
});