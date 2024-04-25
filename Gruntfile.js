 module.exports = function(grunt) {
    var jsrc = ['src/*.js'];

    // Project configuration.
    grunt.initConfig({

        jshint:{ 
           options: {
               laxbreak: true,
               sub: true,
               expr: true,
               loopfunc: true
           },
           all: jsrc
        },

        concat: {
          dist: {
            src: jsrc,
              dest: 'build/targetj.js'
            }
        },

       uglify: {
          dist: {
          src: 'build/targetj.js',
          dest: 'build/targetj.<%= new Date().getTime() %>.min.js'
          }
       }
     

    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    // Default task.

    grunt.registerTask('build', ['jshint','concat']);
    grunt.registerTask('default', ['jshint','concat','uglify']);
 
};