var URL = require('url');

module.exports = function(keycloak) {
  return function(request, response, next) {
    if ( ! request.query.auth_callback ) {
      return next();
    }

    if ( request.query.error ) {
      return keycloak.accessDenied(request,response,next);
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
        
        request.kauth.grant = grant;
        try {
          keycloak.authenticated( request );
        } catch (err) {
          console.log( err );
        }
        response.redirect( cleanUrl );
      });
  };
};