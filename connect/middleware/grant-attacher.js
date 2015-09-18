
module.exports = function(keycloak) {
  return function(request, response, next) {
    keycloak.getGrant( request, response )
      .then( function(grant) {
        request.kauth.grant = grant;
      })
      .then( next )
      .catch( function() {
        next();
      } );
  };
};
