var gulp = require('gulp'),
    livereload = require('gulp-livereload'),
    less = require("gulp-less"),
    connect = require('connect'),
    lr = require("tiny-lr"),
    server = lr(),
    path = require('path'),
    http = require('http');

gulp.task('webserver', function () {
    var port = 3000,
        hostname = null,
        base = path.resolve('.'),
        directory = path.resolve('.');

    var app = connect()
        .use(connect.static(base))
        .use(connect.directory(directory));

    http.createServer(app).listen(port, hostname);
});


gulp.task('lr-server', function() {
    server.listen(35729, function(err) {
        if(err) return console.log(err);
    });
});

gulp.task("styles", function () {
    gulp.src("css/**/*.less")
        .pipe(less())
        .pipe(gulp.dest("./css/"))
        .pipe(livereload(server));
});

gulp.task("scripts", function () {
    gulp.src("js/**/*.js")
        .pipe(livereload(server));
})

gulp.task('templates', function () {
    gulp.src('html/**/*.html')
        .pipe(livereload(server));
});

gulp.task('default', ['webserver', 'lr-server'], function() {
    gulp.watch("html/**/*.html", ['templates']);
    gulp.watch("js/**/*.js", ['scripts']);
    gulp.watch("css/**/*.less", ['styles']);
});
