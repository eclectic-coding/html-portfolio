/**
 * Settings
 * Turn on/off build features
 */
var settings = {
	clean: true,
	scripts: false,
	polyfills: false,
	styles: true,
	imgs: false,
	copy: true,
	reload: true
};

/**
 * Paths to project folders
 */
var paths = {
	input: 'src/',
	output: 'dist/',
	scripts: {
		input: 'src/js/*',
		polyfills: '.polyfill.js',
		output: 'dist/js/'
	},
	styles: {
		input: 'src/scss/**/*.{scss,sass}',
		output: 'dist/css'
	},
	imgs: {
		input: 'src/images/*.+(gif|png|jpg|jpeg)',
		output: 'dist/images/'
	},
	copy: {
		input: 'src/copy/**/*',
		output: 'dist/'
	},
	reload: './'
};


/**
 * Template for banner to add to file headers
 */
var banner = {
	full:
		'/*!\n' +
		' * <%= site.name %> v<%= site.version %>\n' +
		' * <%= site.description %>\n' +
		' * (c) ' + new Date().getFullYear() + ' <%= site.author.name %>\n' +
		' * <%= site.license %> License\n' +
		' * <%= site.repository.url %>\n' +
		' */\n\n',
	min:
		'/*!' +
		' <%= site.name %> v<%= site.version %>' +
		' | (c) ' + new Date().getFullYear() + ' <%= site.author.name %>' +
		' | <%= site.license %> License' +
		' | <%= site.repository.url %>' +
		' */\n'
};

/**
 * Gulp Packages
 */
// General
var {gulp, src, dest, watch, series, parallel} = require('gulp');
var del = require('del');
var flatmap = require('gulp-flatmap');
var lazypipe = require('lazypipe');
var rename = require('gulp-rename');
var header = require('gulp-header');
const sourcemaps = require('gulp-sourcemaps');
var site = require('./package.json');

// Scripts
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var concat = require('gulp-concat');
var uglify = require('gulp-terser');
var optimizejs = require('gulp-optimize-js');

// Styles
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var minify = require('gulp-cssnano');

// IMGs
var imagemin = require('gulp-imagemin');

// BrowserSync
var browserSync = require('browser-sync');

/**
 * Gulp Tasks
 */
// Remove pre-existing content from output folders
var cleanDist = function (done) {

	// Make sure this feature is activated before running
	if (!settings.clean) return done();

	// Clean the dist folder
	del.sync([
		paths.output
	]);

	// Signal completion
	return done();

};

// Repeated JavaScript tasks
var jsTasks = lazypipe()
	.pipe(header, banner.full, {site: site})
	.pipe(optimizejs)
	.pipe(dest, paths.scripts.output)
	.pipe(rename, {suffix: '.min'})
	.pipe(uglify)
	.pipe(optimizejs)
	.pipe(header, banner.min, {site: site})
	.pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
var buildScripts = function (done) {

	// Make sure this feature is activated before running
	if (!settings.scripts) return done();

	// Run tasks on script files
	return src(paths.scripts.input)
		.pipe(flatmap(function (stream, file) {

			// If the file is a directory
			if (file.isDirectory()) {

				// Setup a suffix variable
				var suffix = '';

				// If separate polyfill files enabled
				if (settings.polyfills) {

					// Update the suffix
					suffix = '.polyfills';

					// Grab files that aren't polyfills, concatenate them, and process them
					src([file.path + '/*.js', '!' + file.path + '/*' + paths.scripts.polyfills])
						.pipe(concat(file.relative + '.js'))
						.pipe(jsTasks());

				}

				// Grab all files and concatenate them
				// If separate polyfills enabled, this will have .polyfills in the filename
				src(file.path + '/*.js')
					.pipe(concat(file.relative + suffix + '.js'))
					.pipe(jsTasks());

				return stream;

			}

			// Otherwise, process the file
			return stream.pipe(jsTasks());

		}));

};

// Lint scripts
var lintScripts = function (done) {

	// Make sure this feature is activated before running
	if (!settings.scripts) return done();

	// Lint scripts
	return src(paths.scripts.input)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));

};

// Process, lint, and minify Sass files
var buildStyles = function (done) {

	// Make sure this feature is activated before running
	if (!settings.styles) return done();

	// Run tasks on all Sass files
	return src(paths.styles.input)
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded',
			sourceComments: true
		}))
		.pipe(prefix({
			cascade: true,
			remove: true
		}))
		.pipe(header(banner.full, {site: site}))
		.pipe(dest(paths.styles.output))
		.pipe(rename({suffix: '.min'}))
		.pipe(minify({
			discardComments: {
				removeAll: true
			}
		}))
		.pipe(header(banner.min, {site: site}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest(paths.styles.output));

};
gulp

// Optimize SVG files
var buildIMGs = function (done) {

	// Make sure this feature is activated before running
	if (!settings.imgs) return done();

	// Optimize SVG files
	return src(paths.imgs.input)
		.pipe(imagemin([
				imagemin.gifsicle({interlaced: true}),
				imagemin.jpegtran({progressive: true}),
				imagemin.optipng({optimizationLevel: 3}), // 0-7 low-high.
				imagemin.svgo({
					plugins: [{removeViewBox: true}, {cleanupIDs: false}]
				})
			])
		)
		.pipe(dest(paths.imgs.output));
};

// Copy static files into output folder
var copyFiles = function (done) {

	// Make sure this feature is activated before running
	if (!settings.copy) return done();

	// Copy static files
	return src(paths.copy.input)
		.pipe(dest(paths.copy.output));

};

// Watch for changes to the src directory
var startServer = function (done) {

	// Make sure this feature is activated before running
	if (!settings.reload) return done();

	// Initialize BrowserSync
	browserSync.init({
		server: {
			baseDir: paths.reload
		}
	});

	// Signal completion
	done();

};

// Reload the browser when files change
var reloadBrowser = function (done) {
	if (!settings.reload) return done();
	browserSync.reload();
	done();
};

// Watch for changes
var watchSource = function (done) {
	watch(paths.input, series(exports.default, reloadBrowser));
	watch('./*.html', reloadBrowser);
	done();
};

// Default task
// gulp
exports.default = series(
	cleanDist,
	parallel(
		buildScripts,
		lintScripts,
		buildStyles,
		buildIMGs,
		copyFiles
	)
);

// Watch and reload
// gulp watch
exports.watch = series(
	exports.default,
	startServer,
	watchSource
);
