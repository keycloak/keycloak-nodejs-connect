
var fs = require('fs');
var path = require('path');

function rmdir(dir) {
  if ( ! fs.existsSync(dir) ) {
    return;
  }
  var entries = fs.readdirSync(dir);

  entries.forEach( function(e) {
    var stat = fs.statSync(path.join(dir, e));
    if ( stat.isDirectory() ) {
      rmdir(path.join(dir,e));
    } else {
      fs.unlinkSync(path.join(dir,e));
    }
  } );

  fs.rmdirSync(dir);
  
}

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    touch: {
      src: [ 'site/.nojekyll' ]
    },
    run_grunt: {
      site: {
        src: [ 'connect/Gruntfile.js', 'auth-utils/Gruntfile.js' ],
        options: {
            log: false,
            process: function(res){
              var dir = path.dirname( res.src );
              rmdir(path.join('.', 'site', dir ));
              fs.linkSync( dir + '/doc', './site/' + dir );
            }
        },
      }
    },
    markdown: {
      all: {
        files: [
          {
            expand: true,
            src: 'site/*.md',
            ext: '.html'
          }
        ]
      }
    },
    'gh-pages': {
      options: {
        base: 'site',
        dotfiles: true,
      },
      src: ['**/*']
    }
  });

  grunt.registerTask( 'finish-site', 'Finish assembling the site', function() {
    fs.linkSync( path.join('.', 'README.md'), path.join( '.', 'site', 'index.md' ) );
  } );

  grunt.loadNpmTasks('grunt-touch');
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-run-grunt');
  grunt.loadNpmTasks('grunt-markdown');

  // Default task(s).
  grunt.registerTask('default', ['touch', 'run_grunt:site', 'finish-site', 'markdown']);

};

