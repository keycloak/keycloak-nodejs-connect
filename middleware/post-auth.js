var URL = require('url');

module.exports = function(keycloak) {
  return function(request, response, next) {
    if ( ! request.query.auth_callback ) {
      return next();
    }

    if ( request.query.error ) {
      response.status( 403 );
      response.end( "Access denied" );
      return;
    }

    keycloak.getGrantFromCode( request.query.code, request, response )
      .then( function(grant) {
        var urlParts = {
          pathname: request.path,
          query: request.query,
        };

        delete urlParts.query.code;
        delete urlParts.query.auth_callback;
        delete urlParts.query.state;

        var cleanUrl = URL.format( urlParts );

        response.redirect( cleanUrl );
      });

  };
};