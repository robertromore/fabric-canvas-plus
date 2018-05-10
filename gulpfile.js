// gulpfile.js
var gulp = require('gulp');
var concat = require('gulp-concat');
var clean = require('gulp-rimraf');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jsValidate = require('gulp-jsvalidate');
var notify = require('gulp-notify');
var pump = require('pump');
var gulpServerIo = require('gulp-server-io');

gulp.task('clean', [], function() {
  return gulp.src("./dist/*", { read: false }).pipe(clean());
});

gulp.task('js:validate', [], function() {
  return gulp.src("./src/**/*.js")
    .pipe(jsValidate())
      .on("error", notify.onError(function(error) {
        return error.message;
      }));
});

gulp.task('js:concat', ['js:validate'], function() {
  return gulp.src([
      "./src/utils.js",
      "./src/brushes/pencilplus.js",
      "./src/brushes/selectionbrush.js",
      "./src/brushes/rectselection.js",
      "./src/canvas/**/*.js"
    ])
    .pipe(concat('fabric-canvas-plus.js'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('js:minify', ['js:concat'], function(cb) {
  pump([
        gulp.src('./dist/fabric-canvas-plus.js'),
        uglify(),
        rename('fabric-canvas-plus.min.js'),
        gulp.dest('./dist')
    ],
    cb
  );
});

gulp.task('demo:build', ['clean', 'js:minify'], function() {
  gulp.src(['./demo/fabric-canvas-plus.min.js', './demo/fabric.js'], { read: false }).pipe(clean());
  return gulp.src(['./dist/fabric-canvas-plus.min.js', './node_modules/fabric/dist/fabric.js'])
    .pipe(gulp.dest('./demo'));
});

gulp.task('serve', ['clean', 'js:minify'], function() {
  return gulp.src('./demo')
   .pipe(gulpServerIo({
     debugger: false
    }));
});

gulp.task('default', ['clean', 'js:minify']);
