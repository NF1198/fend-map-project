"use strict";

module.exports = function(grunt) {

    // load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    grunt.initConfig({
        copy: {
            build: {
                files: {
                    'dist/poi.json': 'src/poi.json',
                    // TODO: fix minimized version of map-icons.js; Use un-minified version until fixed;
                    //'dist/js/map-icons.js' : 'src/js/map-icons.js',
                    'dist/fonts/map-icons.eot' : 'src/fonts/map-icons.eot',
                    'dist/fonts/map-icons.svg' : 'src/fonts/map-icons.svg',
                    'dist/fonts/map-icons.ttf' : 'src/fonts/map-icons.ttf',
                    'dist/fonts/map-icons.woff' : 'src/fonts/map-icons.woff',
                    'dist/css/map-icons.min.css' : 'src/css/map-icons.min.css'
                },
            },
            images: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**/*.svg', '**/*.png'],
                    dest: 'dist/'
                }],
            }
        },
        processhtml: {
            options: {
                strip: true,
                process: true,
            },
            build: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**/*.html'],
                    dest: 'dist/',
                }]
            }
        },
        uglify: {
            options: {},
            build: {
                files: {
                    'dist/js/app.min.js': ['src/js/content-provider.js', 'src/js/wikipedia-provider.js', 'src/js/main.js'],
                    'dist/js/map-icons.min.js': 'src/js/map-icons.js'
                },
                options: {
                    compress: {
                        pure_funcs: ['console.log']
                    }
                }
            }
        },
        cssmin: {
            build: {
                files: {
                    'dist/css/styles.min.css': ['src/css/main.css', 'src/css/menu.css']
                }
            }
        },
        htmlmin: {
            build: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: {
                    'dist/index.html': 'dist/index.html', // 'destination': 'source'
                }
            },
        },
        clean: {
            build: {
                src: ["dist/*"]
            },
            images: {
                src: ["dist/**/*.{jpg,gif,png}"]
            }
        }
    });



    // Default task(s).
    grunt.registerTask('default', ['copy', 'processhtml', 'htmlmin', 'uglify', 'cssmin']);

};
