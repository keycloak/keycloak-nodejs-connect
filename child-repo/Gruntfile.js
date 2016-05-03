
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    touch: {
      src: [ 'doc/.nojekyll' ]
    },
    'gh-pages': {
      options: {
        base: 'doc',
        dotfiles: true,
      },
      src: ['**']
    }
  });

  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-touch');

  // Default task(s).
  grunt.registerTask('default', [ 'touch']);

};

